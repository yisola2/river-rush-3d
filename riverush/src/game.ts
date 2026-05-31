import {
  JUMP_DURATION,
  LANES,
  OBSTACLE_TYPES,
  PLAYER_RADIUS,
  RAFT_Z,
  RAY_ANGLES,
  RIVER_HALF_WIDTH,
  SENSOR_RANGE,
  STEERING_CONFIG,
} from "./constants.js";
import { AssetLoader } from "./assets.js";
import { audio } from "./audio.js";
import { InputController } from "./input.js";
import { installBabylonDebug } from "./debug.js";
import { createGameMaterials } from "./materials.js";
import { ObstacleSystem } from "./obstacles.js";
import { Raft } from "./raft.js";
import { Vehicle, planRiverRushSteering } from "./steering.js";
import { UiController } from "./ui.js";
import { World } from "./world.js";
import { PoseInputController } from "./poseInput.js";

declare const BABYLON: any;

const canvas = document.getElementById("gameCanvas") as HTMLCanvasElement;
const engine = new BABYLON.Engine(canvas, true, {
  preserveDrawingBuffer: true,
  stencil: true,
});

let scene;
let camera;
let fixedCameraTarget;
let materials;
let assetLoader: AssetLoader;
let shadowGenerator;
let world: World;
let raft: Raft;
let obstacleSystem: ObstacleSystem;
let input: InputController;
let poseInput: PoseInputController;
let ui: UiController;
let botVehicle;
let sensorLines = [];
let debugTargetMarker;
let debugMode = false;
let latestSteeringPlan = null;
let latestSensorReadings = [];

let mode = "keyboard";
let phase = "menu";
let countdown = 0;
let profile = "Guest";
let score = 0;
let distance = 0;
let crashed = false;
let spawnTimer = 0;
let raftVelocityX = 0;
let botVelocityX = 0;
let motionVelocityX = 0;
let zState = "NORMAL";
let zTimer = 0;

async function createScene() {
  scene = new BABYLON.Scene(engine);
  scene.clearColor = new BABYLON.Color4(0.09, 0.15, 0.17, 1);
  scene.fogMode = BABYLON.Scene.FOGMODE_EXP2;
  scene.fogColor = new BABYLON.Color3(0.09, 0.15, 0.17);
  scene.fogDensity = 0.018;

  camera = new BABYLON.ArcRotateCamera(
    "camera",
    -Math.PI / 2,
    Math.PI / 2.35,
    16.5,
    new BABYLON.Vector3(0, 0.9, -4.8),
    scene,
  );
  fixedCameraTarget = new BABYLON.Vector3(0, 0.55, -4.7);
  camera.setTarget(fixedCameraTarget);
  camera.detachControl();
  camera.lowerRadiusLimit = 18;
  camera.upperRadiusLimit = 30;
  camera.lowerBetaLimit = camera.beta;
  camera.upperBetaLimit = camera.beta;
  camera.lowerAlphaLimit = camera.alpha;
  camera.upperAlphaLimit = camera.alpha;
  camera.wheelPrecision = 42;

  const hemi = new BABYLON.HemisphericLight("hemi", new BABYLON.Vector3(0, 1, 0), scene);
  hemi.intensity = 0.55;

  const sun = new BABYLON.DirectionalLight("sun", new BABYLON.Vector3(-0.35, -1, -0.25), scene);
  sun.position = new BABYLON.Vector3(8, 14, 9);
  sun.intensity = 1.35;
  shadowGenerator = new BABYLON.ShadowGenerator(1024, sun);
  shadowGenerator.useBlurExponentialShadowMap = true;
  shadowGenerator.blurKernel = 24;
  shadowGenerator.setDarkness(0.22);

  materials = createGameMaterials(scene);
  assetLoader = new AssetLoader(scene);
  await assetLoader.loadCatalog();

  world = new World(scene, materials, assetLoader);
  world.create();

  raft = new Raft(scene, materials);
  raft.create();
  await raft.loadModel();

  obstacleSystem = new ObstacleSystem(scene, materials, assetLoader, shadowGenerator);
  createSensors();
  configureShadows();
  installBabylonDebug(scene);

  scene.onBeforeRenderObservable.add(update);
  return scene;
}

function configureShadows() {
  scene.meshes.forEach((mesh) => {
    if (mesh.name.startsWith("sensor")) return;
    if (mesh.name === "river") {
      mesh.receiveShadows = true;
      return;
    }
    if (mesh.name.includes("Bank") || mesh.name.includes("canyon") || mesh.name.includes("bankEdge")) {
      mesh.receiveShadows = true;
    }
    if (mesh.getTotalVertices && mesh.getTotalVertices() > 0) {
      shadowGenerator.addShadowCaster(mesh, true);
    }
  });
}

function createSensors() {
  sensorLines = RAY_ANGLES.map((angle, index) => {
    const line = BABYLON.MeshBuilder.CreateTube(`sensor${index}`, {
      path: [BABYLON.Vector3.Zero(), new BABYLON.Vector3(Math.sin(angle) * SENSOR_RANGE, 0, Math.cos(angle) * SENSOR_RANGE)],
      radius: 0.025,
      updatable: true,
    }, scene);
    line.material = materials.sensor;
    line.visibility = 0;
    return line;
  });

  debugTargetMarker = BABYLON.MeshBuilder.CreateTorus("debugTargetMarker", {
    diameter: 0.72,
    thickness: 0.055,
    tessellation: 28,
  }, scene);
  debugTargetMarker.rotation.x = Math.PI / 2;
  debugTargetMarker.position.y = 0.18;
  debugTargetMarker.material = materials.sensor;
  debugTargetMarker.visibility = 0;
}

function update() {
  const dt = Math.min(engine.getDeltaTime() / 1000, 0.033);
  world.update(dt);

  if (mode === "camera" && (phase === "menu" || phase === "crashed")) {
    const pose = poseInput.update();
    if (pose.clapIntent && poseInput.calibrateFromCurrentPose()) {
      restart();
    }
  }

  if (phase === "countdown") {
    if (mode === "camera") poseInput.update();
    countdown -= dt;
    if (countdown <= 0) {
      phase = "playing";
      countdown = 0;
    }
  }

  if (phase === "playing" && !crashed) {
    distance += dt * 9;
    spawnTimer -= dt;
    if (spawnTimer <= 0) spawnTimer = obstacleSystem.spawnWave(distance);

    updateZState(dt);
    if (mode === "keyboard") updateKeyboard(dt);
    if (mode === "camera") updateCamera(dt);
    if (mode === "bot") updateBot(dt);
    updateHeldKeyboardDuck();

    obstacleSystem.update(dt, getObstacleSpeed(), distance);
    const passedScore = obstacleSystem.collectPassedScore();
    if (passedScore > 0) createPassEffect();
    score += passedScore;
    checkCollisions();
  }

  animateRaft();
  updateSensors();
  updateUi();
}

function updateKeyboard(dt: number) {
  let direction = 0;
  if (input.isLeanLeftPressed()) direction -= 1;
  if (input.isLeanRightPressed()) direction += 1;

  raftVelocityX += direction * 18 * dt;
  raftVelocityX *= direction === 0 ? 0.88 : 0.94;
  raftVelocityX = BABYLON.Scalar.Clamp(raftVelocityX, -8, 8);
  raft.root.position.x += raftVelocityX * dt;
  keepRaftInRiver();
}

function updateHeldKeyboardDuck() {
  if (mode === "keyboard" && input.isDuckPressed() && zState !== "JUMPING") {
    holdDuckAction();
  }
}

function updateCamera(dt: number) {
  const pose = poseInput.update();
  input.motionLean = pose.lean;
  if (pose.jumpIntent) startZAction("JUMPING");
  if (pose.duckHeld && zState !== "JUMPING") {
    holdDuckAction();
  }
  updateLeanMovement(dt, pose.lean);
}

function updateMotion(dt: number) {
  let keyboardLean = 0;
  if (input.isLeanLeftPressed()) keyboardLean -= 1;
  if (input.isLeanRightPressed()) keyboardLean += 1;

  const targetLean = keyboardLean || input.motionLean;
  updateLeanMovement(dt, targetLean);
}

function updateLeanMovement(dt: number, targetLean: number) {
  const targetX = targetLean * (RIVER_HALF_WIDTH - PLAYER_RADIUS);
  const pull = (targetX - raft.root.position.x) * 8.5;

  motionVelocityX += pull * dt;
  motionVelocityX *= 0.82;
  motionVelocityX = BABYLON.Scalar.Clamp(motionVelocityX, -9.4, 9.4);
  raft.root.position.x += motionVelocityX * dt;
  keepRaftInRiver();
}

function updateBot(dt: number) {
  botVehicle.sync(raft.root.position.x, botVelocityX);

  const readings = obstacleSystem.readSensors(raft.root.position.x);
  const steeringPlan = planRiverRushSteering({
    obstacles: obstacleSystem.obstacles,
    raftX: raft.root.position.x,
    raftZ: RAFT_Z,
    riverHalfWidth: RIVER_HALF_WIDTH,
    playerRadius: PLAYER_RADIUS,
    obstacleSpeed: getObstacleSpeed(),
    zState,
  });
  latestSteeringPlan = steeringPlan;
  latestSensorReadings = readings;

  botVehicle.behaviors.update({ readings, obstacles: obstacleSystem.obstacles, targetLane: steeringPlan.targetX, hasThreat: steeringPlan.hasThreat, steeringPlan }, dt);

  botVelocityX = botVehicle.velocity.x * 0.96;
  raft.root.position.x = botVehicle.position.x;
  keepRaftInRiver();

  updateBotBodyAction(steeringPlan);
}

function updateBotBodyAction(steeringPlan) {
  if (zState !== "NORMAL") return;
  if (steeringPlan.shouldJump) startZAction("JUMPING");
  if (steeringPlan.shouldDuck) startZAction("DUCKING");
}

function updateZState(dt: number) {
  if (zState === "NORMAL") return;
  const previousState = zState;
  zTimer -= dt;
  if (zTimer <= 0) {
    zState = "NORMAL";
    zTimer = 0;
    if (previousState === "JUMPING") createSplashEffect();
    if (previousState === "DUCKING") audio.playDuckExit();
  }
}

function holdDuckAction() {
  if (zState !== "DUCKING") createDuckEffect();
  zState = "DUCKING";
  zTimer = 0.16;
}

function startZAction(nextState: string) {
  if (zState !== "NORMAL") return;
  zState = nextState;
  zTimer = nextState === "DUCKING" ? 0.78 : JUMP_DURATION;
  if (nextState === "JUMPING") createSplashEffect();
  if (nextState === "DUCKING") createDuckEffect();
}

function getObstacleSpeed() {
  return 8.2 + Math.min(3.8, distance / 220);
}

function createOneShotParticles(name: string, position, color1, color2, options = {}) {
  if (!scene) return;
  const particles = new BABYLON.ParticleSystem(name, options["capacity"] ?? 80, scene);
  particles.particleTexture = new BABYLON.Texture("https://playground.babylonjs.com/textures/flare.png", scene);
  particles.emitter = position.clone();
  particles.minEmitBox = options["minEmitBox"] ?? new BABYLON.Vector3(-0.2, -0.05, -0.2);
  particles.maxEmitBox = options["maxEmitBox"] ?? new BABYLON.Vector3(0.2, 0.08, 0.2);
  particles.color1 = color1;
  particles.color2 = color2;
  particles.colorDead = options["colorDead"] ?? new BABYLON.Color4(color2.r, color2.g, color2.b, 0);
  particles.minSize = options["minSize"] ?? 0.18;
  particles.maxSize = options["maxSize"] ?? 0.48;
  particles.minLifeTime = options["minLifeTime"] ?? 0.18;
  particles.maxLifeTime = options["maxLifeTime"] ?? 0.48;
  particles.emitRate = options["emitRate"] ?? 240;
  particles.blendMode = BABYLON.ParticleSystem.BLENDMODE_ADD;
  particles.gravity = options["gravity"] ?? new BABYLON.Vector3(0, -2.2, 0);
  particles.direction1 = options["direction1"] ?? new BABYLON.Vector3(-1.2, 1.8, -1.2);
  particles.direction2 = options["direction2"] ?? new BABYLON.Vector3(1.2, 3.0, 1.2);
  particles.minEmitPower = options["minEmitPower"] ?? 1.2;
  particles.maxEmitPower = options["maxEmitPower"] ?? 3.2;
  particles.updateSpeed = 0.012;
  particles.targetStopDuration = options["duration"] ?? 0.08;
  particles.disposeOnStop = true;
  particles.start();
}

function createCollectEffect() {
  audio.playCoin();
  createOneShotParticles(
    "collectSparkle",
    raft.root.position.add(new BABYLON.Vector3(0, 1.15, 0.15)),
    new BABYLON.Color4(1, 0.92, 0.25, 1),
    new BABYLON.Color4(1, 0.58, 0.08, 0.9),
    { capacity: 90, minSize: 0.1, maxSize: 0.34, minLifeTime: 0.22, maxLifeTime: 0.62, emitRate: 360, duration: 0.07 },
  );
}

function createRippleEffect(position) {
  const material = new BABYLON.StandardMaterial("splashRippleMaterial", scene);
  material.diffuseColor = new BABYLON.Color3(0.82, 0.98, 1);
  material.emissiveColor = new BABYLON.Color3(0.25, 0.58, 0.66);
  material.alpha = 0.78;
  material.specularColor = BABYLON.Color3.Black();

  const rings = [0, 1].map((index) => {
    const ring = BABYLON.MeshBuilder.CreateTorus(`splashRipple${index}`, {
      diameter: 1.15 + index * 0.42,
      thickness: 0.035,
      tessellation: 42,
    }, scene);
    ring.position.copyFrom(position);
    ring.position.y = 0.075 + index * 0.006;
    ring.scaling.setAll(0.35 + index * 0.12);
    ring.material = material;
    return ring;
  });

  let age = 0;
  const lifetime = 0.62;
  const observer = scene.onBeforeRenderObservable.add(() => {
    age += Math.min(engine.getDeltaTime() / 1000, 0.033);
    const t = Math.min(1, age / lifetime);
    material.alpha = (1 - t) * 0.78;
    rings.forEach((ring, index) => {
      ring.scaling.setAll(0.35 + t * (2.15 + index * 0.5));
    });
    if (t >= 1) {
      scene.onBeforeRenderObservable.remove(observer);
      rings.forEach((ring) => ring.dispose());
      material.dispose();
    }
  });
}

function createSplashEffect() {
  audio.playSplash();
  const splashCenter = raft.root.position.add(new BABYLON.Vector3(0, -0.28, -0.62));
  createRippleEffect(splashCenter);

  createOneShotParticles(
    "splashJets",
    splashCenter,
    new BABYLON.Color4(0.86, 0.99, 1, 1),
    new BABYLON.Color4(0.35, 0.78, 1, 0.78),
    {
      capacity: 90,
      minEmitBox: new BABYLON.Vector3(-0.48, -0.02, -0.22),
      maxEmitBox: new BABYLON.Vector3(0.48, 0.04, 0.22),
      minSize: 0.12,
      maxSize: 0.38,
      minLifeTime: 0.2,
      maxLifeTime: 0.52,
      gravity: new BABYLON.Vector3(0, -5.4, 0),
      direction1: new BABYLON.Vector3(-1.0, 4.0, -0.65),
      direction2: new BABYLON.Vector3(1.0, 6.9, 0.75),
      minEmitPower: 1.3,
      maxEmitPower: 2.6,
      emitRate: 680,
      duration: 0.045,
    },
  );

  createOneShotParticles(
    "splashCrown",
    splashCenter.add(new BABYLON.Vector3(0, 0.05, 0)),
    new BABYLON.Color4(0.75, 0.96, 1, 0.9),
    new BABYLON.Color4(0.18, 0.62, 0.92, 0.6),
    {
      capacity: 75,
      minEmitBox: new BABYLON.Vector3(-0.78, -0.02, -0.28),
      maxEmitBox: new BABYLON.Vector3(0.78, 0.04, 0.28),
      minSize: 0.08,
      maxSize: 0.24,
      minLifeTime: 0.18,
      maxLifeTime: 0.42,
      gravity: new BABYLON.Vector3(0, -4.2, 0),
      direction1: new BABYLON.Vector3(-2.8, 1.5, -1.35),
      direction2: new BABYLON.Vector3(2.8, 2.8, 1.35),
      minEmitPower: 1.0,
      maxEmitPower: 2.4,
      emitRate: 520,
      duration: 0.04,
    },
  );
}

function createDuckEffect() {
  audio.playDuck();
  createOneShotParticles(
    "duckSpray",
    raft.root.position.add(new BABYLON.Vector3(0, 0.18, 0.55)),
    new BABYLON.Color4(0.65, 0.95, 1, 0.75),
    new BABYLON.Color4(0.22, 0.55, 0.82, 0.45),
    {
      capacity: 80,
      minEmitBox: new BABYLON.Vector3(-0.8, -0.02, -0.15),
      maxEmitBox: new BABYLON.Vector3(0.8, 0.12, 0.15),
      minSize: 0.1,
      maxSize: 0.34,
      minLifeTime: 0.16,
      maxLifeTime: 0.36,
      direction1: new BABYLON.Vector3(-1.4, 0.8, -2.2),
      direction2: new BABYLON.Vector3(1.4, 1.4, -0.6),
      emitRate: 300,
      duration: 0.045,
    },
  );
}

function createPassEffect() {
  audio.playPass();
  createOneShotParticles(
    "cleanPassSpray",
    raft.root.position.add(new BABYLON.Vector3(0, 0.28, -0.15)),
    new BABYLON.Color4(0.78, 1, 0.92, 0.75),
    new BABYLON.Color4(0.45, 0.85, 1, 0.5),
    {
      capacity: 70,
      minEmitBox: new BABYLON.Vector3(-1.05, -0.04, -0.35),
      maxEmitBox: new BABYLON.Vector3(1.05, 0.12, 0.35),
      minSize: 0.08,
      maxSize: 0.28,
      minLifeTime: 0.16,
      maxLifeTime: 0.45,
      direction1: new BABYLON.Vector3(-1.6, 0.9, -1.8),
      direction2: new BABYLON.Vector3(1.6, 1.7, -0.4),
      emitRate: 260,
      duration: 0.045,
    },
  );
}

function createCrashEffect() {
  audio.playCrash();
  createOneShotParticles(
    "crashBurst",
    raft.root.position.add(new BABYLON.Vector3(0, 0.55, 0.1)),
    new BABYLON.Color4(1, 0.3, 0.18, 1),
    new BABYLON.Color4(1, 0.78, 0.22, 1),
    {
      capacity: 160,
      minEmitBox: new BABYLON.Vector3(-0.7, -0.1, -0.45),
      maxEmitBox: new BABYLON.Vector3(0.7, 0.35, 0.45),
      minSize: 0.22,
      maxSize: 0.78,
      minLifeTime: 0.28,
      maxLifeTime: 0.75,
      gravity: new BABYLON.Vector3(0, -3.5, 0),
      direction1: new BABYLON.Vector3(-2.4, 2.0, -2.0),
      direction2: new BABYLON.Vector3(2.4, 4.0, 2.0),
      emitRate: 620,
      duration: 0.1,
    },
  );
}

function checkCollisions() {
  const result = obstacleSystem.checkCollisions(raft.root.position.x, zState);
  if (result.scoreDelta > 0 && !result.crashed) createCollectEffect();
  score += result.scoreDelta;
  if (result.crashed) {
    crashed = true;
    phase = "crashed";
    saveHighScore();
    audio.stopGameplayAudio();
    audio.playFailMelody();
    audio.startFailAudio();
    createCrashEffect();
    raft.playCrash();
    ui.showCollision(mode);
  }
}

function updateSensors() {
  const readings = mode === "bot" && latestSensorReadings.length ? latestSensorReadings : obstacleSystem.readSensors(raft.root.position.x);
  sensorLines.forEach((line, index) => {
    const reading = readings[index];
    const length = reading.hit ? reading.distance * SENSOR_RANGE : SENSOR_RANGE;
    const angle = RAY_ANGLES[index];
    const path = [
      new BABYLON.Vector3(raft.root.position.x, 0.12, RAFT_Z + 0.8),
      new BABYLON.Vector3(
        raft.root.position.x + Math.sin(angle) * length,
        0.12,
        RAFT_Z + 0.8 + Math.cos(angle) * length,
      ),
    ];
    BABYLON.MeshBuilder.CreateTube(null, {
      path,
      radius: 0.025,
      instance: line,
    });
    line.visibility = mode === "bot" && debugMode ? 0.8 : 0;
  });

  if (debugTargetMarker) {
    const showTarget = mode === "bot" && debugMode && latestSteeringPlan;
    debugTargetMarker.visibility = showTarget ? 0.9 : 0;
    if (showTarget) debugTargetMarker.position.set(latestSteeringPlan.targetX, 0.18, RAFT_Z + 3.6);
  }
}

function animateRaft() {
  const activeVelocity = mode === "bot" ? botVelocityX : mode === "camera" ? motionVelocityX : raftVelocityX;
  raft.animate({
    distance,
    zState,
    zTimer,
    activeVelocity,
    motionLean: input.motionLean,
    camera,
    fixedCameraTarget,
    cameraZoom: phase === "countdown" ? 9.2 : mode === "camera" ? 8.6 : 16.5,
    introPose: phase === "countdown",
  });
}

function keepRaftInRiver() {
  const minX = -RIVER_HALF_WIDTH + PLAYER_RADIUS;
  const maxX = RIVER_HALF_WIDTH - PLAYER_RADIUS;
  if (raft.root.position.x < minX) {
    raft.root.position.x = minX;
    raftVelocityX *= -0.2;
    botVelocityX *= -0.2;
    motionVelocityX *= -0.2;
  }
  if (raft.root.position.x > maxX) {
    raft.root.position.x = maxX;
    raftVelocityX *= -0.2;
    botVelocityX *= -0.2;
    motionVelocityX *= -0.2;
  }
}

let welcomeAccepted = false;

function updateHtmlMenu() {
  const menu = document.getElementById("htmlMenu");
  menu?.classList.toggle("hidden", !welcomeAccepted || !(phase === "menu" || phase === "paused"));
  const subtitle = document.getElementById("menuSubtitle");
  if (subtitle) {
    subtitle.textContent = phase === "paused"
      ? "Paused. Catch your breath, then return to the river."
      : mode === "camera"
        ? `${poseInput.state.status}. Clap when ready to calibrate and start.`
        : "Choose your rider and jump into the river.";
  }
  document.getElementById("menuBest").textContent = `Best ${getHighScore()}`;
  document.querySelectorAll<HTMLButtonElement>("[data-profile]").forEach((button) => {
    button.classList.toggle("active", button.dataset.profile === profile);
  });
  document.querySelectorAll<HTMLButtonElement>("[data-mode]").forEach((button) => {
    button.classList.toggle("active", button.dataset.mode === mode);
  });
}

function updateDebugPanel() {
  const panel = document.getElementById("steeringDebug");
  if (!panel) return;
  const visible = debugMode && mode === "bot";
  panel.classList.toggle("hidden", !visible);
  if (!visible) return;

  const plan = latestSteeringPlan;
  const sensorSummary = latestSensorReadings
    .map((reading, index) => `${index}:${reading.hit ? reading.type[0] : "-"}${Math.round(reading.distance * 100)}`)
    .join("  ");
  const action = plan?.shouldJump ? "JUMP" : plan?.shouldDuck ? "DUCK" : "none";
  const threat = plan?.nearestThreat ? `${plan.nearestThreat.type} x=${plan.nearestThreat.x.toFixed(1)} z=${plan.nearestThreat.z.toFixed(1)}` : "none";
  const behaviors = botVehicle?.behaviors
    ? [...botVehicle.behaviors.behaviors.entries()].map(([name, behavior]) => `${behavior.enabled ? "✓" : "×"} ${name} w=${behavior.weight}`).join("\n")
    : "";

  panel.textContent = [
    "[DEBUG MODE ON]",
    `mode: ${mode}  phase: ${phase}`,
    `raft x: ${raft.root.position.x.toFixed(2)}  vx: ${botVelocityX.toFixed(2)}`,
    `plan: ${plan?.activeBehavior ?? "none"}  targetX: ${plan?.targetX.toFixed(2) ?? "-"}`,
    `threat: ${threat}`,
    `action: ${action}  zState: ${zState}`,
    `sensors: ${sensorSummary}`,
    "behaviors:",
    behaviors,
    "",
    "H: toggle debug/hitboxes",
  ].join("\n");
}

function toggleDebugMode() {
  debugMode = !debugMode;
  obstacleSystem?.toggleHitboxes();
  if (!debugMode && debugTargetMarker) debugTargetMarker.visibility = 0;
}

function updateUi() {
  updateHtmlMenu();
  updateDebugPanel();
  const readings = obstacleSystem.readSensors(raft.root.position.x);
  const hasThreat = readings.some((reading) => reading.hit && reading.distance < 0.72);
  const needsZ = readings.some((reading) => reading.hit && Math.abs(reading.angle) < 0.25 && reading.distance < 0.46);
  ui.render({
    score,
    highScore: getHighScore(),
    profile,
    phase,
    countdown,
    mode,
    crashed,
    zState,
    motionLean: input.motionLean,
    hasCollectible: obstacleSystem.hasCollectibleAhead(),
    hasThreat,
    needsZ,
    nearBank: Math.abs(raft.root.position.x) > RIVER_HALF_WIDTH - 1.4,
  });
}

function setMode(nextMode: string) {
  mode = nextMode === "motion" ? "keyboard" : nextMode;
  latestSteeringPlan = null;
  latestSensorReadings = [];
  botVelocityX = raftVelocityX;
  motionVelocityX = raftVelocityX;
  if (mode === "camera") poseInput.start();
  if (mode !== "camera") poseInput.stop();
  if (botVehicle) botVehicle.sync(raft.root.position.x, botVelocityX);
  updateUi();
}

function getProfileColor(profileName = profile) {
  return new BABYLON.Color3(0.19, 0.84, 0.67);
}

function applyProfileStyle() {
  raft?.setRiderColor(getProfileColor());
  const color = getProfileColor();
  const cssColor = `rgb(${Math.round(color.r * 255)}, ${Math.round(color.g * 255)}, ${Math.round(color.b * 255)})`;
  document.documentElement.style.setProperty("--player-color", cssColor);
}

function setProfile(nextProfile: string) {
  profile = nextProfile;
  localStorage.setItem("riverRushProfile", profile);
  applyProfileStyle();
  updateUi();
}

function getHighScore() {
  return Number(localStorage.getItem(`riverRushHighScore:${profile}`) || 0);
}

function saveHighScore() {
  const best = getHighScore();
  if (score > best) localStorage.setItem(`riverRushHighScore:${profile}`, String(score));
}

function resetRun() {
  obstacleSystem.clear();
  score = 0;
  distance = 0;
  crashed = false;
  spawnTimer = 0.45;
  raft.reset();
  raftVelocityX = 0;
  botVelocityX = 0;
  motionVelocityX = 0;
  input.resetMotion();
  botVehicle = new Vehicle(STEERING_CONFIG, raft.root.position.x, RAFT_Z);
  applyProfileStyle();
  zState = "NORMAL";
  zTimer = 0;
  ui.hideMessage();
}

function restart() {
  audio.startGameplayAudio();
  resetRun();
  raft.playIntro();
  phase = "countdown";
  countdown = 3;
  ui.closeSettings();
  updateUi();
}

function startGame() {
  audio.init();
  if (phase === "paused") {
    phase = "playing";
    updateUi();
    return;
  }
  if (mode === "camera") {
    poseInput.start();
    poseInput.resetCalibration();
    phase = "menu";
    updateUi();
    return;
  }
  restart();
}

function togglePauseMenu() {
  if (phase === "playing") {
    phase = "paused";
  } else if (phase === "paused") {
    phase = "playing";
  }
  updateUi();
}

function backToMenu() {
  saveHighScore();
  audio.startMenuAudio();
  phase = "menu";
  crashed = false;
  obstacleSystem?.clear();
  ui.hideMessage();
  updateUi();
}

function bindHtmlMenu() {
  document.getElementById("playButton")?.addEventListener("click", startGame);
  const acceptWelcome = () => {
    if (welcomeAccepted) return;
    welcomeAccepted = true;
    document.getElementById("welcomeScreen")?.classList.add("hidden");
    audio.startMenuAudio();
    updateUi();
  };
  document.getElementById("welcomeStartButton")?.addEventListener("click", acceptWelcome);
  document.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") acceptWelcome();
  });
  document.getElementById("restartMenuButton")?.addEventListener("click", restart);
  document.querySelectorAll<HTMLButtonElement>("[data-profile]").forEach((button) => {
    button.addEventListener("click", () => setProfile(button.dataset.profile));
  });
  document.querySelectorAll<HTMLButtonElement>("[data-mode]").forEach((button) => {
    button.addEventListener("click", () => setMode(button.dataset.mode));
  });
}

ui = new UiController({ restart, backToMenu, togglePauseMenu });
poseInput = new PoseInputController();
input = new InputController({
  getMode: () => mode,
  setMode,
  restart,
  jump: () => startZAction("JUMPING"),
  duck: () => startZAction("DUCKING"),
  toggleHitboxes: () => toggleDebugMode(),
  toggleMenu: togglePauseMenu,
  toggleMute: () => audio.toggleMuted(),
});

createScene().then((createdScene) => {
  scene = createdScene;
  ui.attachScene(scene);
  resetRun();
  phase = "menu";
  bindHtmlMenu();
  updateUi();
  engine.runRenderLoop(() => scene.render());
  window.addEventListener("resize", () => engine.resize());
  canvas.focus();
});
