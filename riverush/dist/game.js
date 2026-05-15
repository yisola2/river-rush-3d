import { LANES, OBSTACLE_TYPES, PLAYER_RADIUS, RAFT_Z, RAY_ANGLES, RIVER_HALF_WIDTH, SENSOR_RANGE, STEERING_CONFIG, } from "./constants.js";
import { AssetLoader } from "./assets.js";
import { InputController } from "./input.js";
import { installBabylonDebug } from "./debug.js";
import { createGameMaterials } from "./materials.js";
import { ObstacleSystem } from "./obstacles.js";
import { Raft } from "./raft.js";
import { Vehicle } from "./steering.js";
import { UiController } from "./ui.js";
import { World } from "./world.js";
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
let ui;
let botVehicle;
let sensorLines = [];
let mode = "keyboard";
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
    if (!crashed) {
        distance += dt * 9;
        spawnTimer -= dt;
        if (spawnTimer <= 0)
            spawnTimer = obstacleSystem.spawnWave(distance);
        updateZState(dt);
        if (mode === "keyboard")
            updateKeyboard(dt);
        if (mode === "motion")
            updateMotion(dt);
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
function updateMotion(dt) {
    let keyboardLean = 0;
    if (input.isLeanLeftPressed())
        keyboardLean -= 1;
    if (input.isLeanRightPressed())
        keyboardLean += 1;
    const targetLean = keyboardLean || input.motionLean;
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
    const targetLane = chooseOpenLane(readings);
    const hasThreat = readings.some((reading) => reading.hit && reading.distance < 0.78);
    botVehicle.behaviors.update({ readings, obstacles: obstacleSystem.obstacles, targetLane, hasThreat }, dt);
    botVelocityX = botVehicle.velocity.x * 0.96;
    raft.root.position.x = botVehicle.position.x;
    keepRaftInRiver();
    updateBotBodyAction(readings);
}
function updateBotBodyAction(readings) {
    if (zState !== "NORMAL")
        return;
    const front = readings.filter((reading) => reading.hit && Math.abs(reading.angle) < 0.25);
    const nearest = front.sort((a, b) => a.distance - b.distance)[0];
    if (!nearest)
        return;
    const distanceToImpact = nearest.distance * SENSOR_RANGE - 1.05;
    const timeToImpact = distanceToImpact / getObstacleSpeed();
    if (timeToImpact < 0.14 || timeToImpact > 0.58)
        return;
    if (nearest.type === OBSTACLE_TYPES.ROCK || nearest.type === OBSTACLE_TYPES.JUMP_GATE)
        startZAction("JUMPING");
    if (nearest.type === OBSTACLE_TYPES.LOG)
        startZAction("DUCKING");
}
function chooseOpenLane(readings) {
    const blocked = new Set();
    for (const reading of readings) {
        if (!reading.hit || reading.distance > 0.72)
            continue;
        let bestIndex = 0;
        let bestDist = Infinity;
        LANES.forEach((lane, index) => {
            const dist = Math.abs(lane - reading.hitX);
            if (dist < bestDist) {
                bestDist = dist;
                bestIndex = index;
            }
        });
        blocked.add(bestIndex);
    }
    const options = LANES
        .map((lane, index) => ({ lane, index, cost: Math.abs(lane - raft.root.position.x) + Math.abs(lane) * 0.25 }))
        .filter((candidate) => !blocked.has(candidate.index))
        .sort((a, b) => a.cost - b.cost);
    return options[0] ? options[0].lane : 0;
}
function updateZState(dt) {
    if (zState === "NORMAL")
        return;
    zTimer -= dt;
    if (zTimer <= 0) {
        zState = "NORMAL";
        zTimer = 0;
    }
}
function startZAction(nextState) {
    if (zState !== "NORMAL")
        return;
    zState = nextState;
    zTimer = 0.66;
}
function getObstacleSpeed() {
    return 8.2 + Math.min(3.8, distance / 220);
}
function checkCollisions() {
    const result = obstacleSystem.checkCollisions(raft.root.position.x, zState);
    score += result.scoreDelta;
    if (result.crashed) {
        crashed = true;
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
function updateUi() {
    const readings = obstacleSystem.readSensors(raft.root.position.x);
    const hasThreat = readings.some((reading) => reading.hit && reading.distance < 0.72);
    const needsZ = readings.some((reading) => reading.hit && Math.abs(reading.angle) < 0.25 && reading.distance < 0.46);
    ui.render({
        score,
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
    if (botVehicle)
        botVehicle.sync(raft.root.position.x, botVelocityX);
    if (crashed)
        restart();
    updateUi();
}
function restart() {
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
    zState = "NORMAL";
    zTimer = 0;
    ui.hideMessage();
    ui.closeSettings();
    updateUi();
}
ui = new UiController({ setMode, restart });
input = new InputController({
    getMode: () => mode,
    setMode,
    restart,
    jump: () => startZAction("JUMPING"),
    duck: () => startZAction("DUCKING"),
    toggleHitboxes: () => obstacleSystem?.toggleHitboxes(),
});
createScene().then((createdScene) => {
    scene = createdScene;
    restart();
    engine.runRenderLoop(() => scene.render());
    window.addEventListener("resize", () => engine.resize());
    canvas.focus();
});
