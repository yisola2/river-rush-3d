import { JUMP_DURATION, RAFT_Z } from "./constants.js";

declare const BABYLON: any;

export class Raft {
  root;
  body;
  rider;
  leftArm;
  rightArm;
  wake;
  modelRoot;
  animationGroups = new Map<string, any>();
  private activeAnimation = "";
  private lastZState = "NORMAL";
  private specialAnimation = "";
  private introPlaying = false;
  private animationSerial = 0;

  constructor(private scene, private materials) {}

  create() {
    this.root = new BABYLON.TransformNode("raftRoot", this.scene);
    this.root.position.set(0, 0.42, RAFT_Z);

    this.body = new BABYLON.TransformNode("raftBody", this.scene);
    this.body.parent = this.root;

    this.createLogDeck();
    this.createRider();
  }

  async loadModel() {
    try {
      const result = await BABYLON.SceneLoader.ImportMeshAsync("", "./assets/models/", "rider_mixamo.glb", this.scene);
      this.modelRoot = new BABYLON.TransformNode("mixamoRiderRoot", this.scene);
      this.modelRoot.parent = this.body;
      this.modelRoot.position.set(0, 0.16, 0.16);
      this.modelRoot.rotation.y = 0;
      this.modelRoot.scaling.setAll(0.74);

      const importedRoot = result.meshes.find((mesh) => mesh.name === "__root__") ?? result.meshes[0];
      if (importedRoot) importedRoot.parent = this.modelRoot;

      result.meshes.forEach((mesh) => {
        mesh.isPickable = false;
        mesh.visibility = 1;
        if (mesh.material) this.makeImportedMaterialReadable(mesh.material);
      });

      for (const group of result.animationGroups) {
        this.animationGroups.set(group.name.toLowerCase(), group);
        group.stop();
      }

      this.rider.setEnabled(false);
      this.playAnimation("idle", true);
      console.info("Loaded Mixamo rider", [...this.animationGroups.keys()]);
    } catch (error) {
      console.warn("Could not load Mixamo rider, using procedural rider", error);
    }
  }

  setRiderColor(color) {
    this.materials.rider.diffuseColor = color;
    this.materials.rider.emissiveColor = color.scale(0.14);
  }

  private makeImportedMaterialReadable(material) {
    if (material.subMaterials) {
      material.subMaterials.forEach((sub) => sub && this.makeImportedMaterialReadable(sub));
      return;
    }
    const name = material.name?.toLowerCase?.() ?? "";
    const isLens = name.includes("lens");
    material.alpha = isLens ? 0.42 : 1;
    material.transparencyMode = isLens ? BABYLON.Material.MATERIAL_ALPHABLEND : BABYLON.Material.MATERIAL_OPAQUE;
    material.backFaceCulling = false;
  }

  reset() {
    this.root.position.set(0, 0.42, RAFT_Z);
    this.body.rotation.set(0, 0, 0);
    this.body.scaling.set(1, 1, 1);
    this.specialAnimation = "";
    this.introPlaying = false;
    this.lastZState = "NORMAL";
    this.playAnimation("idle", true);
  }

  animate({ distance, zState, zTimer, activeVelocity, motionLean, camera, fixedCameraTarget, cameraZoom, introPose }) {
    this.updateModelAnimation(zState);
    const jumpProgress = zState === "JUMPING" ? Math.sin((zTimer / JUMP_DURATION) * Math.PI) : 0;
    this.root.position.y = 0.42 + jumpProgress * 1.65;
    this.body.scaling.y = zState === "DUCKING" ? 0.58 : 1;
    this.body.rotation.z = BABYLON.Scalar.Lerp(this.body.rotation.z, -activeVelocity * 0.065 - motionLean * 0.18, 0.12);
    this.body.rotation.x = Math.sin(distance * 0.12) * 0.035;
    this.rider.scaling.y = zState === "DUCKING" ? 0.55 : 1;
    this.rider.position.y = zState === "DUCKING" ? -0.12 : 0;
    this.rider.rotation.z = BABYLON.Scalar.Lerp(this.rider.rotation.z, -motionLean * 0.34, 0.14);
    this.leftArm.rotation.z = BABYLON.Scalar.Lerp(this.leftArm.rotation.z, zState === "JUMPING" ? -2.2 : -0.45 - motionLean * 0.4, 0.18);
    this.rightArm.rotation.z = BABYLON.Scalar.Lerp(this.rightArm.rotation.z, zState === "JUMPING" ? 2.2 : 0.45 - motionLean * 0.4, 0.18);
    this.leftArm.rotation.x = zState === "DUCKING" ? 0.9 : 0.1;
    this.rightArm.rotation.x = zState === "DUCKING" ? 0.9 : 0.1;
    if (introPose) {
      this.body.rotation.y = BABYLON.Scalar.Lerp(this.body.rotation.y, 0.34, 0.08);
      this.body.position.y = Math.sin(distance * 1.8) * 0.035;
    } else {
      this.body.rotation.y = BABYLON.Scalar.Lerp(this.body.rotation.y, 0, 0.08);
      this.body.position.y = BABYLON.Scalar.Lerp(this.body.position.y, 0, 0.12);
    }
    camera.radius = BABYLON.Scalar.Lerp(camera.radius, cameraZoom ?? 16.5, 0.06);
    camera.setTarget(fixedCameraTarget);

  }

  playIntro() {
    if (!this.modelRoot || this.introPlaying) return;
    this.introPlaying = true;
    this.specialAnimation = "intro";
    this.playAnimation("intro", false, 1.15, () => {
      this.introPlaying = false;
      this.specialAnimation = "";
      this.lastZState = "";
    });
  }

  playCrash() {
    if (!this.modelRoot) return;
    this.specialAnimation = "fall";
    this.playAnimation("fall", false, 1.35, undefined, 10);
  }

  playVictory() {
    if (!this.modelRoot || this.specialAnimation === "fall") return;
    this.specialAnimation = "victory";
    this.playAnimation("victory", false, 1.15, () => {
      this.specialAnimation = "";
      this.lastZState = "";
    });
  }

  private updateModelAnimation(zState: string) {
    if (!this.modelRoot || this.specialAnimation || zState === this.lastZState) return;
    const previousState = this.lastZState;
    this.lastZState = zState;
    if (zState === "JUMPING") {
      this.playAnimation("jump", false, this.getAnimationSpeedForDuration("jump", JUMP_DURATION));
      return;
    }
    if (zState === "DUCKING") {
      this.playAnimation("stand_to_crouch", false, 1.6, () => {
        if (this.lastZState === "DUCKING" && !this.specialAnimation) this.playAnimation("crouch_idle", true);
      });
      return;
    }
    if (previousState === "DUCKING") {
      this.playAnimation("crouch_to_stand", false, 1.45, () => this.playAnimation("idle", true));
      return;
    }
    this.playAnimation("idle", true);
  }

  private findAnimationGroup(name: string) {
    const key = name.toLowerCase();
    return this.animationGroups.get(key) ?? [...this.animationGroups.entries()].find(([groupName]) => groupName.includes(key))?.[1];
  }

  private getAnimationSpeedForDuration(name: string, targetDuration: number) {
    const group = this.findAnimationGroup(name);
    const firstAnimation = group?.targetedAnimations?.[0]?.animation;
    const framesPerSecond = firstAnimation?.framePerSecond || 30;
    const frameDuration = group && Number.isFinite(group.to - group.from) ? Math.abs(group.to - group.from) / framesPerSecond : 0;
    return frameDuration > 0 ? frameDuration / targetDuration : 1;
  }

  private playAnimation(name: string, loop: boolean, speed = 1, onEnd?: () => void, startOffsetFrames = 0) {
    const group = this.findAnimationGroup(name);
    const activeKey = `${name}:${loop}:${startOffsetFrames}`;
    if (!group || this.activeAnimation === activeKey) return;
    this.animationSerial += 1;
    const serial = this.animationSerial;
    for (const anim of this.animationGroups.values()) anim.stop();
    this.activeAnimation = activeKey;
    group.speedRatio = speed;
    group.reset();
    const fromFrame = startOffsetFrames > 0 ? Math.min(group.to, group.from + startOffsetFrames) : undefined;
    group.start(loop, speed, fromFrame);
    if (onEnd) {
      const observer = group.onAnimationGroupEndObservable.add(() => {
        group.onAnimationGroupEndObservable.remove(observer);
        if (serial === this.animationSerial) onEnd();
      });
    }
  }

  private createLogDeck() {
    for (let i = -2; i <= 2; i += 1) {
      const log = BABYLON.MeshBuilder.CreateCylinder(`raftLog${i}`, {
        diameter: 0.42,
        height: 2.65,
        tessellation: 10,
      }, this.scene);
      log.rotation.x = Math.PI / 2;
      log.position.x = i * 0.42;
      log.parent = this.body;
      log.material = this.materials.wood;
    }

    for (const z of [-0.55, 0.55]) {
      const rope = BABYLON.MeshBuilder.CreateBox(`raftRope${z}`, {
        width: 2.7,
        height: 0.08,
        depth: 0.08,
      }, this.scene);
      rope.position.set(0, 0.2, z);
      rope.parent = this.body;
      rope.material = this.materials.gate;
    }

    for (const x of [-1.08, 1.08]) {
      const bumper = BABYLON.MeshBuilder.CreateCylinder(`raftSideLog${x}`, {
        diameter: 0.24,
        height: 2.9,
        tessellation: 8,
      }, this.scene);
      bumper.rotation.x = Math.PI / 2;
      bumper.position.set(x, 0.08, 0);
      bumper.parent = this.body;
      bumper.material = this.materials.wood;
    }
  }

  private createRider() {
    this.rider = new BABYLON.TransformNode("rider", this.scene);
    this.rider.parent = this.body;

    const torso = BABYLON.MeshBuilder.CreateCapsule("riderTorso", {
      height: 0.88,
      radius: 0.24,
      tessellation: 10,
    }, this.scene);
    torso.position.y = 0.78;
    torso.parent = this.rider;
    torso.material = this.materials.rider;

    const head = BABYLON.MeshBuilder.CreateSphere("riderHead", {
      diameter: 0.34,
      segments: 12,
    }, this.scene);
    head.position.y = 1.34;
    head.parent = this.rider;
    head.material = this.materials.gate;

    this.leftArm = this.createArm("leftArm", -0.34);
    this.rightArm = this.createArm("rightArm", 0.34);
  }

  private createArm(name: string, x: number) {
    const arm = BABYLON.MeshBuilder.CreateCylinder(name, {
      diameter: 0.08,
      height: 0.72,
      tessellation: 8,
    }, this.scene);
    arm.position.set(x, 0.88, -0.03);
    arm.rotation.z = x < 0 ? -0.45 : 0.45;
    arm.parent = this.rider;
    arm.material = this.materials.rider;
    return arm;
  }
}
