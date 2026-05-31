import { RIVER_HALF_WIDTH, WORLD_DEPTH } from "./constants.js";
export class World {
    scene;
    materials;
    assets;
    river;
    leftBank;
    rightBank;
    leftWall;
    rightWall;
    riverOffset = 0;
    constructor(scene, materials, assets) {
        this.scene = scene;
        this.materials = materials;
        this.assets = assets;
    }
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
        this.createBankIrregularities();
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
    update(dt) {
        this.riverOffset += dt * 7;
        this.scene.meshes.forEach((mesh) => {
            if (!mesh.metadata || mesh.metadata.baseZ === undefined)
                return;
            const wrappedZ = ((mesh.metadata.baseZ - this.riverOffset + 22) % 44 + 44) % 44;
            mesh.position.z = wrappedZ - 20;
            if (mesh.metadata.flow) {
                const sway = mesh.metadata.sway ?? 0;
                const phase = mesh.metadata.phase ?? mesh.metadata.baseZ;
                mesh.position.y = (mesh.metadata.baseY ?? 0.052) + Math.sin(this.riverOffset * 0.8 + phase) * (mesh.metadata.bob ?? 0.015);
                if (mesh.metadata.baseX !== undefined)
                    mesh.position.x = mesh.metadata.baseX + Math.sin(this.riverOffset * 0.45 + phase) * sway;
                if (mesh.metadata.spin)
                    mesh.rotation.y += dt * mesh.metadata.spin;
            }
        });
    }
    createFoam() {
        for (let i = 0; i < 54; i += 1) {
            const foam = BABYLON.MeshBuilder.CreateBox(`foam${i}`, {
                width: i % 4 === 0 ? 2.6 : 0.75 + Math.random() * 1.15,
                height: 0.01,
                depth: 0.045 + Math.random() * 0.075,
            }, this.scene);
            const x = (Math.random() - 0.5) * RIVER_HALF_WIDTH * 1.72;
            const z = -21 + i * 0.82;
            foam.position.set(x, 0.052, z);
            foam.rotation.y = (Math.random() - 0.5) * 0.7;
            foam.material = i % 3 === 0 ? this.materials.foamSoft : this.materials.foam;
            foam.metadata = { baseX: x, baseZ: z, baseY: 0.052, speed: 7, flow: true, sway: 0.08 + Math.random() * 0.16, bob: 0.012, phase: i * 0.73 };
            foam.setEnabled(false);
        }
        this.createFloatingLeaves();
    }
    createFloatingLeaves() {
        for (let i = 0; i < 24; i += 1) {
            const leaf = BABYLON.MeshBuilder.CreateDisc(`floatingLeaf${i}`, {
                radius: 0.08 + Math.random() * 0.045,
                tessellation: 7,
            }, this.scene);
            const x = (Math.random() - 0.5) * RIVER_HALF_WIDTH * 1.45;
            const z = -21 + i * 1.85;
            leaf.position.set(x, 0.064, z);
            leaf.rotation.x = Math.PI / 2;
            leaf.rotation.y = Math.random() * Math.PI;
            leaf.scaling.x = 1.6;
            leaf.material = this.materials.floatingLeaf;
            leaf.metadata = { baseX: x, baseZ: z, baseY: 0.064, speed: 7, flow: true, sway: 0.18 + Math.random() * 0.2, bob: 0.008, spin: (Math.random() - 0.5) * 1.6, phase: i * 0.59 };
        }
    }
    createBankEdges() {
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
    createBankIrregularities() {
        // Visual-only shoreline chunks. They do not affect gameplay bounds, but
        // break the straight rectangular river silhouette and make the course feel
        // more hand-built/natural.
        for (let i = 0; i < 34; i += 1) {
            const side = i % 2 === 0 ? -1 : 1;
            const z = -21 + i * 1.28;
            const width = 0.55 + (i % 4) * 0.22;
            const depth = 0.85 + (i % 5) * 0.28;
            const patch = BABYLON.MeshBuilder.CreateBox(`shorePatch${i}`, {
                width,
                height: 0.12,
                depth,
            }, this.scene);
            patch.position.set(side * (RIVER_HALF_WIDTH + 0.22 + width * 0.32), 0.075, z);
            patch.rotation.y = side * (0.18 + (i % 3) * 0.06);
            patch.material = i % 3 === 0 ? this.materials.bank : this.materials.cliff;
            patch.metadata = { baseZ: z, speed: 7 };
            if (i % 3 === 0) {
                const reed = BABYLON.MeshBuilder.CreateCylinder(`shoreReed${i}`, {
                    diameterTop: 0.02,
                    diameterBottom: 0.05,
                    height: 0.72,
                    tessellation: 5,
                }, this.scene);
                reed.position.set(side * (RIVER_HALF_WIDTH + 0.08), 0.42, z + 0.18);
                reed.rotation.z = -side * 0.22;
                reed.material = this.materials.leaf;
                reed.metadata = { baseZ: z + 0.18, speed: 7 };
            }
        }
    }
    createDistantBanks() {
        for (const side of [-1, 1]) {
            const wall = BABYLON.MeshBuilder.CreateBox(`distantBank${side}`, {
                width: 2.2,
                height: 0.85,
                depth: WORLD_DEPTH + 8,
            }, this.scene);
            wall.position.set(side * (RIVER_HALF_WIDTH + 6.8), 0.45, 2);
            wall.rotation.z = side * 0.1;
            wall.material = this.materials.cliff;
            if (side < 0)
                this.leftWall = wall;
            else
                this.rightWall = wall;
        }
    }
    createScenery() {
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
            if (rock.material !== undefined)
                rock.material = this.materials.rock;
            rock.metadata = { baseZ: z, speed: 7 };
        }
    }
    createProceduralTree(i) {
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
