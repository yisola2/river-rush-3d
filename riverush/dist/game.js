import { PLAYER_RADIUS, RAFT_Z, RAY_ANGLES, RIVER_HALF_WIDTH, SENSOR_RANGE, STEERING_CONFIG, } from "./constants.js";
import { AssetLoader } from "./assets.js";
import { InputController } from "./input.js";
import { installBabylonDebug } from "./debug.js";
import { createGameMaterials } from "./materials.js";
import { ObstacleSystem } from "./obstacles.js";
import { Raft } from "./raft.js";
import { Vehicle, planRiverRushSteering } from "./steering.js";
import { UiController } from "./ui.js";
import { World } from "./world.js";
import { PoseInputController } from "./poseInput.js";
const canvas = document.getElementById("gameCanvas");
const engine = new BABYLON.Engine(canvas, true, {
    preserveDrawingBuffer: true,
    stencil: true,
});
let scene;
let camera;
let fixedCameraTarget;
let materials;
let assetLoader;
let shadowGenerator;
let world;
let raft;
let obstacleSystem;
let input;
let poseInput;
let ui;
let botVehicle;
let sensorLines = [];
let mode = "keyboard";
let phase = "menu";
let countdown = 0;
let profile = localStorage.getItem("riverRushProfile") || "Guest";
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
    camera = new BABYLON.ArcRotateCamera("camera", -Math.PI / 2, Math.PI / 2.35, 16.5, new BABYLON.Vector3(0, 0.9, -4.8), scene);
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
        if (mesh.name.startsWith("sensor"))
            return;
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
}
function update() {
    const dt = Math.min(engine.getDeltaTime() / 1000, 0.033);
    world.update(dt);
    if (mode === "camera" && phase === "menu") {
        const pose = poseInput.update();
        if (pose.clapIntent && poseInput.calibrateFromCurrentPose()) {
            restart();
        }
    }
    if (phase === "countdown") {
        if (mode === "camera")
            poseInput.update();
        countdown -= dt;
        if (countdown <= 0) {
            phase = "playing";
            countdown = 0;
        }
    }
    if (phase === "playing" && !crashed) {
        distance += dt * 9;
        spawnTimer -= dt;
        if (spawnTimer <= 0)
            spawnTimer = obstacleSystem.spawnWave(distance);
        updateZState(dt);
        if (mode === "keyboard")
            updateKeyboard(dt);
        if (mode === "motion")
            updateMotion(dt);
        if (mode === "camera")
            updateCamera(dt);
        if (mode === "bot")
            updateBot(dt);
        obstacleSystem.update(dt, getObstacleSpeed(), distance);
        score += obstacleSystem.collectPassedScore();
        checkCollisions();
    }
    animateRaft();
    updateSensors();
    updateUi();
}
function updateKeyboard(dt) {
    let direction = 0;
    if (input.isLeanLeftPressed())
        direction -= 1;
    if (input.isLeanRightPressed())
        direction += 1;
    raftVelocityX += direction * 18 * dt;
    raftVelocityX *= direction === 0 ? 0.88 : 0.94;
    raftVelocityX = BABYLON.Scalar.Clamp(raftVelocityX, -8, 8);
    raft.root.position.x += raftVelocityX * dt;
    keepRaftInRiver();
}
function updateCamera(dt) {
    const pose = poseInput.update();
    input.motionLean = pose.lean;
    if (pose.jumpIntent)
        startZAction("JUMPING");
    if (pose.duckHeld && zState !== "JUMPING") {
        zState = "DUCKING";
        zTimer = 0.16;
    }
    updateLeanMovement(dt, pose.lean);
}
function updateMotion(dt) {
    let keyboardLean = 0;
    if (input.isLeanLeftPressed())
        keyboardLean -= 1;
    if (input.isLeanRightPressed())
        keyboardLean += 1;
    const targetLean = keyboardLean || input.motionLean;
    updateLeanMovement(dt, targetLean);
}
function updateLeanMovement(dt, targetLean) {
    const targetX = targetLean * (RIVER_HALF_WIDTH - PLAYER_RADIUS);
    const pull = (targetX - raft.root.position.x) * 8.5;
    motionVelocityX += pull * dt;
    motionVelocityX *= 0.82;
    motionVelocityX = BABYLON.Scalar.Clamp(motionVelocityX, -9.4, 9.4);
    raft.root.position.x += motionVelocityX * dt;
    keepRaftInRiver();
}
function updateBot(dt) {
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
    botVehicle.behaviors.update({ readings, obstacles: obstacleSystem.obstacles, targetLane: steeringPlan.targetX, hasThreat: steeringPlan.hasThreat, steeringPlan }, dt);
    botVelocityX = botVehicle.velocity.x * 0.96;
    raft.root.position.x = botVehicle.position.x;
    keepRaftInRiver();
    updateBotBodyAction(steeringPlan);
}
function updateBotBodyAction(steeringPlan) {
    if (zState !== "NORMAL")
        return;
    if (steeringPlan.shouldJump)
        startZAction("JUMPING");
    if (steeringPlan.shouldDuck)
        startZAction("DUCKING");
}
function updateZState(dt) {
    if (zState === "NORMAL")
        return;
    const previousState = zState;
    zTimer -= dt;
    if (zTimer <= 0) {
        zState = "NORMAL";
        zTimer = 0;
        if (previousState === "JUMPING")
            createSplashEffect();
    }
}
function startZAction(nextState) {
    if (zState !== "NORMAL")
        return;
    zState = nextState;
    zTimer = nextState === "DUCKING" ? 0.78 : 0.66;
    if (nextState === "JUMPING")
        createSplashEffect();
}
function getObstacleSpeed() {
    return 8.2 + Math.min(3.8, distance / 220);
}
function createOneShotParticles(name, position, color1, color2, options = {}) {
    if (!scene)
        return;
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
    createOneShotParticles("collectSparkle", raft.root.position.add(new BABYLON.Vector3(0, 1.15, 0.15)), new BABYLON.Color4(1, 0.92, 0.25, 1), new BABYLON.Color4(0.35, 1, 0.72, 1), { capacity: 90, minSize: 0.1, maxSize: 0.34, minLifeTime: 0.22, maxLifeTime: 0.62, emitRate: 360, duration: 0.07 });
}
function createSplashEffect() {
    createOneShotParticles("raftSplash", raft.root.position.add(new BABYLON.Vector3(0, -0.28, -0.65)), new BABYLON.Color4(0.72, 0.95, 1, 0.9), new BABYLON.Color4(0.35, 0.72, 1, 0.65), {
        capacity: 110,
        minEmitBox: new BABYLON.Vector3(-1.1, -0.05, -0.35),
        maxEmitBox: new BABYLON.Vector3(1.1, 0.05, 0.35),
        minSize: 0.18,
        maxSize: 0.58,
        minLifeTime: 0.18,
        maxLifeTime: 0.42,
        direction1: new BABYLON.Vector3(-1.7, 1.1, -1.4),
        direction2: new BABYLON.Vector3(1.7, 2.2, 0.6),
        emitRate: 420,
        duration: 0.06,
    });
}
function createCrashEffect() {
    createOneShotParticles("crashBurst", raft.root.position.add(new BABYLON.Vector3(0, 0.55, 0.1)), new BABYLON.Color4(1, 0.3, 0.18, 1), new BABYLON.Color4(1, 0.78, 0.22, 1), {
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
    });
}
function checkCollisions() {
    const result = obstacleSystem.checkCollisions(raft.root.position.x, zState);
    if (result.scoreDelta > 0 && !result.crashed)
        createCollectEffect();
    score += result.scoreDelta;
    if (result.crashed) {
        crashed = true;
        phase = "crashed";
        saveHighScore();
        createCrashEffect();
        ui.showCollision();
    }
}
function updateSensors() {
    const readings = obstacleSystem.readSensors(raft.root.position.x);
    sensorLines.forEach((line, index) => {
        const reading = readings[index];
        const length = reading.hit ? reading.distance * SENSOR_RANGE : SENSOR_RANGE;
        const angle = RAY_ANGLES[index];
        const path = [
            new BABYLON.Vector3(raft.root.position.x, 0.12, RAFT_Z + 0.8),
            new BABYLON.Vector3(raft.root.position.x + Math.sin(angle) * length, 0.12, RAFT_Z + 0.8 + Math.cos(angle) * length),
        ];
        BABYLON.MeshBuilder.CreateTube(null, {
            path,
            radius: 0.025,
            instance: line,
        });
        line.visibility = mode === "bot" ? 0.8 : 0;
    });
}
function animateRaft() {
    const activeVelocity = mode === "bot" ? botVelocityX : mode === "motion" ? motionVelocityX : raftVelocityX;
    raft.animate({
        distance,
        zState,
        zTimer,
        activeVelocity,
        motionLean: input.motionLean,
        camera,
        fixedCameraTarget,
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
function updateHtmlMenu() {
    const menu = document.getElementById("htmlMenu");
    menu?.classList.toggle("hidden", !(phase === "menu" || phase === "paused"));
    const subtitle = document.getElementById("menuSubtitle");
    if (subtitle) {
        subtitle.textContent = phase === "paused"
            ? "Paused. Catch your breath, then return to the river."
            : mode === "camera"
                ? `${poseInput.state.status}. Clap when ready to calibrate and start.`
                : "Choose your rider and jump into the river.";
    }
    document.getElementById("menuProfile").textContent = profile;
    document.getElementById("menuBest").textContent = `Best ${getHighScore()}`;
    document.querySelectorAll("[data-profile]").forEach((button) => {
        button.classList.toggle("active", button.dataset.profile === profile);
    });
    document.querySelectorAll("[data-mode]").forEach((button) => {
        button.classList.toggle("active", button.dataset.mode === mode);
    });
}
function updateUi() {
    updateHtmlMenu();
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
function setMode(nextMode) {
    mode = nextMode;
    botVelocityX = raftVelocityX;
    motionVelocityX = raftVelocityX;
    if (mode === "camera")
        poseInput.start();
    if (mode !== "camera")
        poseInput.stop();
    if (botVehicle)
        botVehicle.sync(raft.root.position.x, botVelocityX);
    updateUi();
}
function getProfileColor(profileName = profile) {
    if (profileName === "Player 1")
        return new BABYLON.Color3(0.35, 0.78, 1.0);
    if (profileName === "Player 2")
        return new BABYLON.Color3(1.0, 0.42, 0.52);
    return new BABYLON.Color3(0.19, 0.84, 0.67);
}
function applyProfileStyle() {
    raft?.setRiderColor(getProfileColor());
    const color = getProfileColor();
    const cssColor = `rgb(${Math.round(color.r * 255)}, ${Math.round(color.g * 255)}, ${Math.round(color.b * 255)})`;
    document.documentElement.style.setProperty("--player-color", cssColor);
}
function setProfile(nextProfile) {
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
    if (score > best)
        localStorage.setItem(`riverRushHighScore:${profile}`, String(score));
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
    resetRun();
    phase = "countdown";
    countdown = 3;
    ui.closeSettings();
    updateUi();
}
function startGame() {
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
    }
    else if (phase === "paused") {
        phase = "playing";
    }
    updateUi();
}
function backToMenu() {
    saveHighScore();
    phase = "menu";
    crashed = false;
    obstacleSystem?.clear();
    ui.hideMessage();
    updateUi();
}
function bindHtmlMenu() {
    document.getElementById("playButton")?.addEventListener("click", startGame);
    document.getElementById("restartMenuButton")?.addEventListener("click", restart);
    document.querySelectorAll("[data-profile]").forEach((button) => {
        button.addEventListener("click", () => setProfile(button.dataset.profile));
    });
    document.querySelectorAll("[data-mode]").forEach((button) => {
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
    toggleHitboxes: () => obstacleSystem?.toggleHitboxes(),
    toggleMenu: togglePauseMenu,
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
