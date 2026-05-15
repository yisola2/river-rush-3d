import { RIVER_HALF_WIDTH, WORLD_DEPTH } from "./constants.js";
import type { AssetLoader } from "./assets.js";

declare const BABYLON: any;

export class World {
  river;
  leftBank;
  rightBank;
  leftWall;
  rightWall;
  private riverOffset = 0;

  constructor(private scene, private materials, private assets?: AssetLoader) {}

  create() {
    this.river = BABYLON.MeshBuilder.CreateGround("river", {
      width: RIVER_HALF_WIDTH * 2,
      height: WORLD_DEPTH + 8,
      subdivisions: 32,
    }, this.scene);
    this.river.position.z = 2;
    this.river.material = this.materials.water;
    this.river.receiveShadows = true;

    this.createDistantBanks();
    this.createBankEdges();
    this.createScenery();
    this.createFoam();

    // Populate WaterMaterial renderList for reflections
    if (this.materials.water.addToRenderList) {
      this.scene.meshes.forEach((mesh) => {
        if (mesh !== this.river && !mesh.name.startsWith("foam") && !mesh.name.startsWith("raftWake")) {
          this.materials.water.addToRenderList(mesh);
        }
      });
    }
  }

  update(dt: number) {
    this.riverOffset += dt * 7;
    this.scene.meshes.forEach((mesh) => {
      if (!mesh.metadata || mesh.metadata.baseZ === undefined) return;
      mesh.position.z = ((mesh.metadata.baseZ - this.riverOffset + 22) % 44) - 20;
      
      // Add a slight "bobbing" to foam
      if (mesh.metadata.flow) {
        mesh.position.y = 0.052 + Math.sin(this.riverOffset * 0.8 + mesh.metadata.baseZ) * 0.015;
      }
    });
  }

  private createFoam() {
    for (let i = 0; i < 42; i += 1) {
      const foam = BABYLON.MeshBuilder.CreateBox(`foam${i}`, {
        width: i % 3 === 0 ? 2.4 : 1.2,
        height: 0.01,
        depth: 0.08,
      }, this.scene);
      const x = (Math.random() - 0.5) * RIVER_HALF_WIDTH * 1.8;
      const z = -20 + i * 1.05;
      foam.position.set(x, 0.052, z);
      foam.rotation.y = Math.random() * Math.PI;
      foam.material = this.materials.foam;
      foam.metadata = { baseZ: z, speed: 7, flow: true };
    }
  }

  private createBankEdges() {
    for (const x of [-RIVER_HALF_WIDTH - 0.25, RIVER_HALF_WIDTH + 0.25]) {
      const rail = BABYLON.MeshBuilder.CreateCylinder(`bankEdge${x}`, {
        diameter: 0.28,
        height: WORLD_DEPTH + 7,
        tessellation: 8,
      }, this.scene);
      rail.rotation.x = Math.PI / 2;
      rail.position.set(x, 0.18, 2);
      rail.material = this.materials.cliff;
    }
  }

  private createDistantBanks() {
    for (const side of [-1, 1]) {
      const wall = BABYLON.MeshBuilder.CreateBox(`distantBank${side}`, {
        width: 2.2,
        height: 0.85,
        depth: WORLD_DEPTH + 8,
      }, this.scene);
      wall.position.set(side * (RIVER_HALF_WIDTH + 6.8), 0.45, 2);
      wall.rotation.z = side * 0.1;
      wall.material = this.materials.cliff;
      if (side < 0) this.leftWall = wall;
      else this.rightWall = wall;
    }
  }

  private createScenery() {
    for (let i = 0; i < 26; i += 1) {
      const side = i % 2 === 0 ? -1 : 1;
      const x = side * (RIVER_HALF_WIDTH + 2.0 + (i % 4) * 0.9);
      const z = -21 + i * 1.8;
      const tree = this.assets?.instantiate(i % 3 === 0 ? "tree_tall" : "tree_round", () => this.createProceduralTree(i));
      tree.position.set(x, 0.16, z);
      tree.scaling.setAll(i % 3 === 0 ? 1.2 : 1);
      tree.rotation.y = i * 0.6;
      tree.metadata = { baseZ: z, speed: 7 };
    }

    for (let i = 0; i < 20; i += 1) {
      const side = i % 2 === 0 ? -1 : 1;
      const x = side * (RIVER_HALF_WIDTH + 0.9 + (i % 2) * 0.45);
      const z = -20 + i * 2.1;
      const rock = this.assets?.instantiate(i % 2 === 0 ? "rock_large" : "rock_small", () => BABYLON.MeshBuilder.CreatePolyhedron(`shoreRock${i}`, { type: 2, size: 0.55 + (i % 3) * 0.12 }, this.scene));
      rock.position.set(x, 0.28, z);
      rock.scaling.setAll(0.75 + (i % 3) * 0.12);
      rock.rotation.y = i * 0.7;
      if (rock.material !== undefined) rock.material = this.materials.rock;
      rock.metadata = { baseZ: z, speed: 7 };
    }
  }

  private createProceduralTree(i: number) {
    const tree = new BABYLON.TransformNode(`treeFallback${i}`, this.scene);
    const trunk = BABYLON.MeshBuilder.CreateCylinder(`treeTrunk${i}`, {
      diameter: 0.18,
      height: 1.15,
      tessellation: 6,
    }, this.scene);
    trunk.position.y = 0.62;
    trunk.material = this.materials.wood;
    trunk.parent = tree;

    const crown = BABYLON.MeshBuilder.CreateCylinder(`treeCrown${i}`, {
      diameterTop: 0,
      diameterBottom: 1.15,
      height: 1.55,
      tessellation: 7,
    }, this.scene);
    crown.position.y = 1.62;
    crown.material = this.materials.leaf;
    crown.parent = tree;
    return tree;
  }
}
