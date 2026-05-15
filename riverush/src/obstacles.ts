import {
  DESPAWN_Z,
  LANES,
  OBSTACLE_TYPES,
  PLAYER_RADIUS,
  RAFT_Z,
  RAY_ANGLES,
  RIVER_HALF_WIDTH,
  SENSOR_RANGE,
  SPAWN_Z,
} from "./constants.js";
import type { AssetLoader } from "./assets.js";

declare const BABYLON: any;

export class ObstacleSystem {
  obstacles = [];
  private serial = 0;
  private showHitboxes = false;
  private hitboxMaterial;

  constructor(private scene, private materials, private assets?: AssetLoader, private shadowGenerator?) {
    this.hitboxMaterial = new BABYLON.StandardMaterial("hitbox", scene);
    this.hitboxMaterial.diffuseColor = new BABYLON.Color3(1, 0.15, 0.15);
    this.hitboxMaterial.alpha = 0.28;
    this.hitboxMaterial.emissiveColor = new BABYLON.Color3(0.45, 0.02, 0.02);
  }

  spawnWave(distance: number) {
    const difficulty = Math.min(1, distance / 650);
    const nextDelay = 0.98 - difficulty * 0.22 + Math.random() * 0.4;
    const roll = Math.random();

    if (roll < 0.16 + difficulty * 0.08) {
      this.spawn(OBSTACLE_TYPES.JUMP_GATE, 0, SPAWN_Z);
      this.spawnTokens(0, SPAWN_Z + 3.4);
      return nextDelay;
    }

    if (roll > 0.82) {
      this.spawnTokenArc(SPAWN_Z);
      return nextDelay;
    }

    const count = roll > 0.64 ? 2 : 1;
    const keepCenterOpen = distance < 120 || count === 1;
    const available = keepCenterOpen ? LANES.filter((lane) => lane !== 0) : [...LANES];
    for (let i = 0; i < count; i += 1) {
      const laneIndex = Math.floor(Math.random() * available.length);
      const lane = available.splice(laneIndex, 1)[0];
      const x = lane + (Math.random() - 0.5) * 0.25;
      const type = Math.random() < 0.58 ? OBSTACLE_TYPES.ROCK : OBSTACLE_TYPES.LOG;
      this.spawn(type, x, SPAWN_Z + i * 2.5);
    }
    this.spawnTokens(LANES[Math.floor(Math.random() * LANES.length)], SPAWN_Z + 4.2);
    return nextDelay;
  }

  update(dt: number, speed: number, distance: number) {
    for (const obstacle of this.obstacles) {
      obstacle.z -= speed * dt;
      obstacle.root.position.z = obstacle.z;
      if (obstacle.type === OBSTACLE_TYPES.STAR) {
        obstacle.mesh.rotation.y += dt * 5.5;
        obstacle.mesh.position.y = 0.9 + Math.sin(distance * 0.22 + obstacle.id) * 0.08;
      }
      if (obstacle.hitbox) obstacle.hitbox.position.z = 0;
      if (!obstacle.scored && obstacle.z < RAFT_Z - 1.4) {
        obstacle.scored = true;
      }
    }

    const survivors = [];
    for (const obstacle of this.obstacles) {
      if (obstacle.z > DESPAWN_Z) {
        survivors.push(obstacle);
      } else {
        obstacle.root.dispose();
      }
    }
    this.obstacles = survivors;
  }

  checkCollisions(raftX: number, zState: string) {
    for (const obstacle of this.obstacles) {
      if (Math.abs(obstacle.z - RAFT_Z) > 1.05) continue;

      if (obstacle.type === OBSTACLE_TYPES.STAR) {
        if (!obstacle.scored && Math.abs(raftX - obstacle.x) < PLAYER_RADIUS + obstacle.radius) {
          obstacle.scored = true;
          obstacle.root.setEnabled(false);
          return { crashed: false, scoreDelta: 5 };
        }
        continue;
      }

      const lateralHit = this.hasLateralOverlap(obstacle, raftX);

      if (!lateralHit) continue;
      if (obstacle.escapeActions.includes(zState)) continue;

      return { crashed: true, scoreDelta: 0 };
    }

    return { crashed: false, scoreDelta: 0 };
  }

  collectPassedScore() {
    let scoreDelta = 0;
    for (const obstacle of this.obstacles) {
      if (!obstacle.scoreAwarded && obstacle.scored && obstacle.z < RAFT_Z - 1.4 && obstacle.type !== OBSTACLE_TYPES.STAR) {
        obstacle.scoreAwarded = true;
        scoreDelta += obstacle.type === OBSTACLE_TYPES.JUMP_GATE ? 3 : 1;
      }
    }
    return scoreDelta;
  }

  readSensors(raftX: number) {
    return RAY_ANGLES.map((angle) => {
      const endX = raftX + Math.sin(angle) * SENSOR_RANGE;
      let closest = null;
      let closestT = 1;

      for (const obstacle of this.obstacles) {
        if (obstacle.type === OBSTACLE_TYPES.STAR || obstacle.scored) continue;
        if (obstacle.z < RAFT_Z || obstacle.z > RAFT_Z + SENSOR_RANGE) continue;
        const t = (obstacle.z - RAFT_Z) / SENSOR_RANGE;
        const rayX = raftX + (endX - raftX) * t;
        const width = obstacle.type === OBSTACLE_TYPES.JUMP_GATE ? RIVER_HALF_WIDTH : obstacle.radius;
        if (Math.abs(rayX - obstacle.x) < width + PLAYER_RADIUS * 0.45 && t < closestT) {
          closest = obstacle;
          closestT = t;
        }
      }

      return {
        angle,
        hit: Boolean(closest),
        type: closest ? closest.type : "NONE",
        distance: closest ? closestT : 1,
        hitX: closest ? closest.x : raftX + Math.sin(angle) * SENSOR_RANGE,
      };
    });
  }

  hasCollectibleAhead() {
    return this.obstacles.some((obstacle) => obstacle.type === OBSTACLE_TYPES.STAR && !obstacle.scored && obstacle.z > RAFT_Z && obstacle.z < RAFT_Z + 8);
  }

  clear() {
    for (const obstacle of this.obstacles) obstacle.root.dispose();
    this.obstacles = [];
  }

  toggleHitboxes() {
    this.showHitboxes = !this.showHitboxes;
    for (const obstacle of this.obstacles) {
      if (obstacle.hitbox) obstacle.hitbox.setEnabled(this.showHitboxes);
    }
  }

  private spawnTokens(x: number, z: number) {
    for (let i = 0; i < 3; i += 1) {
      this.spawn(OBSTACLE_TYPES.STAR, x + (i - 1) * 0.52, z + i * 1.15);
    }
  }

  private spawnTokenArc(z: number) {
    const centerLane = LANES[Math.floor(Math.random() * LANES.length)];
    for (let i = 0; i < 5; i += 1) {
      const x = centerLane + (i - 2) * 0.45;
      this.spawn(OBSTACLE_TYPES.STAR, BABYLON.Scalar.Clamp(x, -4.2, 4.2), z + i * 1.05);
    }
  }

  private spawn(type: string, x: number, z: number) {
    const root = new BABYLON.TransformNode(`obstacleRoot${this.serial}`, this.scene);
    root.position.set(x, 0.34, z);

    const metadata = this.createObstacleMesh(type, root);
    const hitbox = this.createHitbox(type, metadata.radius, root);
    root.getChildMeshes().forEach((mesh) => this.shadowGenerator?.addShadowCaster(mesh, true));
    this.obstacles.push({
      id: this.serial,
      type,
      x,
      z,
      root,
      mesh: metadata.mesh,
      radius: metadata.radius,
      hitbox,
      escapeActions: metadata.escapeActions,
      scored: false,
      scoreAwarded: false,
    });
    this.serial += 1;
  }

  private createObstacleMesh(type: string, root) {
    if (type === OBSTACLE_TYPES.ROCK) return this.createRock(root);
    if (type === OBSTACLE_TYPES.LOG) return this.createLog(root);
    if (type === OBSTACLE_TYPES.STAR) return this.createStar(root);
    return this.createJumpGate(root);
  }

  private createRock(root) {
    const cluster = new BABYLON.TransformNode(`rockCluster${this.serial}`, this.scene);
    cluster.parent = root;
    const positions = [
      [-0.28, 0.34, 0],
      [0.28, 0.28, 0.08],
      [0, 0.44, -0.18],
    ];
    positions.forEach((position, index) => {
      const rock = BABYLON.MeshBuilder.CreatePolyhedron(`rock${this.serial}_${index}`, { type: 2, size: index === 2 ? 0.72 : 0.62 }, this.scene);
      rock.position.set(position[0], position[1], position[2]);
      rock.scaling.y = index === 2 ? 0.82 : 0.62;
      rock.rotation.y = index * 0.8;
      rock.parent = cluster;
      rock.material = this.materials.rock;
    });
    return { mesh: cluster, radius: 0.72, escapeActions: ["JUMPING"] };
  }

  private createLog(root) {
    const group = new BABYLON.TransformNode(`logGroup${this.serial}`, this.scene);
    group.parent = root;

    const log = BABYLON.MeshBuilder.CreateCylinder(`log${this.serial}`, {
      diameter: 0.54,
      height: 3.2,
      tessellation: 12,
    }, this.scene);
    log.rotation.z = Math.PI / 2;
    log.position.y = 1.04;
    log.parent = group;
    log.material = this.materials.log;

    for (const x of [-1.65, 1.65]) {
      const marker = BABYLON.MeshBuilder.CreateBox(`duckMarker${this.serial}_${x}`, {
        width: 0.12,
        height: 0.72,
        depth: 0.12,
      }, this.scene);
      marker.position.set(x, 0.44, 0);
      marker.parent = group;
      marker.material = this.materials.gateCue;
    }

    return { mesh: group, radius: 1.42, escapeActions: ["DUCKING"] };
  }

  private createStar(root) {
    const group = new BABYLON.TransformNode(`starGroup${this.serial}`, this.scene);
    group.parent = root;

    const ring = BABYLON.MeshBuilder.CreateTorus(`starRing${this.serial}`, {
      diameter: 0.62,
      thickness: 0.065,
      tessellation: 18,
    }, this.scene);
    ring.position.y = 0.9;
    ring.rotation.x = Math.PI / 2;
    ring.parent = group;
    ring.material = this.materials.star;

    const core = BABYLON.MeshBuilder.CreatePolyhedron(`starCore${this.serial}`, { type: 1, size: 0.24 }, this.scene);
    core.position.y = 0.9;
    core.parent = group;
    core.material = this.materials.star;

    return { mesh: group, radius: 0.44, escapeActions: [] };
  }

  private createJumpGate(root) {
    const group = new BABYLON.TransformNode(`jumpGate${this.serial}`, this.scene);
    group.parent = root;

    const ridge = BABYLON.MeshBuilder.CreateCylinder(`jumpRidge${this.serial}`, {
      diameter: 0.42,
      height: RIVER_HALF_WIDTH * 1.7,
      tessellation: 10,
    }, this.scene);
    ridge.rotation.z = Math.PI / 2;
    ridge.position.y = 0.44;
    ridge.parent = group;
    ridge.material = this.materials.log;

    const rampFace = BABYLON.MeshBuilder.CreateBox(`jumpRampFace${this.serial}`, {
      width: RIVER_HALF_WIDTH * 1.65,
      height: 0.08,
      depth: 0.62,
    }, this.scene);
    rampFace.position.set(0, 0.22, -0.28);
    rampFace.rotation.x = -0.35;
    rampFace.parent = group;
    rampFace.material = this.materials.gate;

    for (const x of [-1.35, 0, 1.35]) {
      const chevron = BABYLON.MeshBuilder.CreateCylinder(`gateChevron${this.serial}_${x}`, {
        diameterTop: 0,
        diameterBottom: 0.34,
        height: 0.36,
        tessellation: 3,
      }, this.scene);
      chevron.position.set(x, 0.62, -0.42);
      chevron.rotation.x = Math.PI / 2;
      chevron.parent = group;
      chevron.material = this.materials.gateCue;
    }

    return { mesh: group, radius: RIVER_HALF_WIDTH, escapeActions: ["JUMPING"] };
  }

  private hasLateralOverlap(obstacle, raftX: number) {
    if (obstacle.type === OBSTACLE_TYPES.JUMP_GATE) return Math.abs(raftX) < RIVER_HALF_WIDTH - 0.3;
    return Math.abs(raftX - obstacle.x) < PLAYER_RADIUS + obstacle.radius;
  }

  private createHitbox(type: string, radius: number, root) {
    let hitbox;
    if (type === OBSTACLE_TYPES.JUMP_GATE) {
      hitbox = BABYLON.MeshBuilder.CreateBox(`hitbox${this.serial}`, {
        width: RIVER_HALF_WIDTH * 1.9,
        height: 0.5,
        depth: 1.05,
      }, this.scene);
      hitbox.position.y = 0.42;
    } else {
      hitbox = BABYLON.MeshBuilder.CreateCylinder(`hitbox${this.serial}`, {
        diameter: (PLAYER_RADIUS + radius) * 2,
        height: 0.08,
        tessellation: 24,
      }, this.scene);
      hitbox.position.y = 0.08;
    }
    hitbox.parent = root;
    hitbox.material = this.hitboxMaterial;
    hitbox.setEnabled(this.showHitboxes);
    return hitbox;
  }
}
