export function createGameMaterials(scene) {
    const materials = {};
    materials.water = new BABYLON.WaterMaterial("water", scene, new BABYLON.Vector2(1024, 1024));
    materials.water.backFaceCulling = false;
    materials.water.bumpTexture = createWaterBumpTexture(scene);
    materials.water.waterColor = new BABYLON.Color3(0.04, 0.32, 0.43);
    materials.water.colorBlendFactor = 0.38;
    materials.water.bumpHeight = 0.08;
    materials.water.waveHeight = 0.12;
    materials.water.waveLength = 0.16;
    materials.water.waveSpeed = 0.6;
    materials.water.windForce = -6;
    materials.water.windDirection = new BABYLON.Vector2(0, 1);
    materials.water.specularPower = 48;
    materials.foam = new BABYLON.StandardMaterial("foam", scene);
    materials.foam.diffuseColor = new BABYLON.Color3(0.85, 0.98, 1);
    materials.foam.emissiveColor = new BABYLON.Color3(0.1, 0.2, 0.25);
    materials.foam.alpha = 0.85;
    materials.wake = new BABYLON.StandardMaterial("wake", scene);
    materials.wake.diffuseColor = new BABYLON.Color3(0.9, 0.95, 1);
    materials.wake.emissiveColor = new BABYLON.Color3(0.2, 0.3, 0.4);
    materials.wake.alpha = 0.6;
    materials.wake.specularColor = BABYLON.Color3.Black();
    materials.bank = new BABYLON.StandardMaterial("bank", scene);
    materials.bank.diffuseColor = new BABYLON.Color3(0.23, 0.34, 0.21);
    materials.bank.specularColor = BABYLON.Color3.Black();
    materials.cliff = new BABYLON.StandardMaterial("cliff", scene);
    materials.cliff.diffuseColor = new BABYLON.Color3(0.25, 0.31, 0.22);
    materials.cliff.specularColor = new BABYLON.Color3(0.03, 0.025, 0.018);
    materials.leaf = new BABYLON.StandardMaterial("leaf", scene);
    materials.leaf.diffuseColor = new BABYLON.Color3(0.12, 0.42, 0.18);
    materials.leaf.specularColor = BABYLON.Color3.Black();
    materials.wood = new BABYLON.StandardMaterial("wood", scene);
    materials.wood.diffuseColor = new BABYLON.Color3(0.43, 0.24, 0.12);
    materials.wood.specularColor = new BABYLON.Color3(0.08, 0.05, 0.03);
    materials.rider = new BABYLON.StandardMaterial("rider", scene);
    materials.rider.diffuseColor = new BABYLON.Color3(0.19, 0.84, 0.67);
    materials.rider.emissiveColor = new BABYLON.Color3(0.01, 0.12, 0.09);
    materials.rock = new BABYLON.StandardMaterial("rock", scene);
    materials.rock.diffuseColor = new BABYLON.Color3(0.46, 0.51, 0.55);
    materials.rock.specularColor = new BABYLON.Color3(0.04, 0.04, 0.04);
    materials.log = new BABYLON.StandardMaterial("log", scene);
    materials.log.diffuseColor = new BABYLON.Color3(0.49, 0.27, 0.1);
    materials.log.specularColor = new BABYLON.Color3(0.09, 0.05, 0.02);
    materials.gate = new BABYLON.StandardMaterial("gate", scene);
    materials.gate.diffuseColor = new BABYLON.Color3(0.95, 0.71, 0.1);
    materials.gate.emissiveColor = new BABYLON.Color3(0.2, 0.12, 0.01);
    materials.gateCue = new BABYLON.StandardMaterial("gateCue", scene);
    materials.gateCue.diffuseColor = new BABYLON.Color3(0.08, 0.12, 0.13);
    materials.gateCue.emissiveColor = new BABYLON.Color3(0.02, 0.04, 0.04);
    materials.star = new BABYLON.StandardMaterial("star", scene);
    materials.star.diffuseColor = new BABYLON.Color3(1, 0.86, 0.2);
    materials.star.emissiveColor = new BABYLON.Color3(0.75, 0.48, 0.03);
    materials.sensor = new BABYLON.StandardMaterial("sensor", scene);
    materials.sensor.diffuseColor = new BABYLON.Color3(1, 0.84, 0.25);
    materials.sensor.emissiveColor = new BABYLON.Color3(0.55, 0.38, 0.02);
    return materials;
}
function createWaterBumpTexture(scene) {
    const size = 256;
    const texture = new BABYLON.DynamicTexture("waterBump", { width: size, height: size }, scene, false);
    const context = texture.getContext();
    const imageData = context.createImageData(size, size);
    const heights = new Float32Array(size * size);
    for (let y = 0; y < size; y += 1) {
        for (let x = 0; x < size; x += 1) {
            const nx = x / size;
            const ny = y / size;
            heights[y * size + x] =
                Math.sin((nx * 18 + ny * 7) * Math.PI * 2) * 0.45 +
                    Math.sin((nx * -8 + ny * 24) * Math.PI * 2) * 0.35 +
                    Math.sin((nx * 38 + ny * 31) * Math.PI * 2) * 0.2;
        }
    }
    for (let y = 0; y < size; y += 1) {
        for (let x = 0; x < size; x += 1) {
            const left = heights[y * size + ((x - 1 + size) % size)];
            const right = heights[y * size + ((x + 1) % size)];
            const up = heights[((y - 1 + size) % size) * size + x];
            const down = heights[((y + 1) % size) * size + x];
            const normal = new BABYLON.Vector3((left - right) * 0.65, (up - down) * 0.65, 1).normalize();
            const index = (y * size + x) * 4;
            imageData.data[index] = BABYLON.Scalar.Clamp((normal.x * 0.5 + 0.5) * 255, 0, 255);
            imageData.data[index + 1] = BABYLON.Scalar.Clamp((normal.y * 0.5 + 0.5) * 255, 0, 255);
            imageData.data[index + 2] = BABYLON.Scalar.Clamp((normal.z * 0.5 + 0.5) * 255, 0, 255);
            imageData.data[index + 3] = 255;
        }
    }
    context.putImageData(imageData, 0, 0);
    texture.update(false);
    texture.wrapU = BABYLON.Texture.WRAP_ADDRESSMODE;
    texture.wrapV = BABYLON.Texture.WRAP_ADDRESSMODE;
    return texture;
}
