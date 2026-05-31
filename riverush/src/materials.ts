declare const BABYLON: any;

export function createGameMaterials(scene) {
  const materials: Record<string, any> = {};

  materials.water = createStylizedRiverMaterial(scene);

  materials.foam = new BABYLON.StandardMaterial("foam", scene);
  materials.foam.diffuseColor = new BABYLON.Color3(0.85, 0.98, 1);
  materials.foam.emissiveColor = new BABYLON.Color3(0.1, 0.2, 0.25);
  materials.foam.alpha = 0.85;

  materials.foamSoft = new BABYLON.StandardMaterial("foamSoft", scene);
  materials.foamSoft.diffuseColor = new BABYLON.Color3(0.72, 0.94, 1);
  materials.foamSoft.emissiveColor = new BABYLON.Color3(0.06, 0.15, 0.2);
  materials.foamSoft.alpha = 0.42;
  materials.foamSoft.specularColor = BABYLON.Color3.Black();

  materials.foamBright = new BABYLON.StandardMaterial("foamBright", scene);
  materials.foamBright.diffuseColor = new BABYLON.Color3(0.9, 1, 1);
  materials.foamBright.emissiveColor = new BABYLON.Color3(0.32, 0.58, 0.62);
  materials.foamBright.alpha = 0.72;
  materials.foamBright.specularColor = BABYLON.Color3.Black();

  materials.floatingLeaf = new BABYLON.StandardMaterial("floatingLeaf", scene);
  materials.floatingLeaf.diffuseColor = new BABYLON.Color3(0.42, 0.62, 0.16);
  materials.floatingLeaf.emissiveColor = new BABYLON.Color3(0.04, 0.08, 0.01);
  materials.floatingLeaf.specularColor = BABYLON.Color3.Black();

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

function createStylizedRiverMaterial(scene) {
  BABYLON.Effect.ShadersStore.riverRushWaterVertexShader = `
    precision highp float;
    attribute vec3 position;
    attribute vec2 uv;
    uniform mat4 worldViewProjection;
    varying vec2 vUV;
    varying vec3 vPosition;
    void main(void) {
      vUV = uv;
      vPosition = position;
      gl_Position = worldViewProjection * vec4(position, 1.0);
    }
  `;

  BABYLON.Effect.ShadersStore.riverRushWaterFragmentShader = `
    precision highp float;
    varying vec2 vUV;
    varying vec3 vPosition;
    uniform float time;

    float hash(vec2 p) {
      return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
    }

    float noise(vec2 p) {
      vec2 i = floor(p);
      vec2 f = fract(p);
      vec2 u = f * f * (3.0 - 2.0 * f);
      return mix(
        mix(hash(i + vec2(0.0, 0.0)), hash(i + vec2(1.0, 0.0)), u.x),
        mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x),
        u.y
      );
    }

    void main(void) {
      vec2 uv = vUV;
      float downstream = uv.y + time * 0.42;
      float cross = uv.x;

      vec3 deep = vec3(0.025, 0.18, 0.25);
      vec3 mid = vec3(0.035, 0.34, 0.43);
      vec3 light = vec3(0.15, 0.58, 0.62);
      vec3 foam = vec3(0.78, 0.96, 0.95);

      float center = 1.0 - abs(cross - 0.5) * 2.0;
      float bankFoam = smoothstep(0.0, 0.13, abs(cross - 0.5) * 2.0 - 0.72);

      float n1 = noise(vec2(cross * 7.0, downstream * 18.0));
      float n2 = noise(vec2(cross * 18.0 + time * 0.28, downstream * 32.0));
      float bands = smoothstep(0.82, 0.97, sin((downstream + n1 * 0.09) * 58.0) * 0.5 + 0.5);
      float streaks = smoothstep(0.70, 0.92, n2) * bands;
      float centerHighlights = streaks * smoothstep(0.15, 0.85, center) * 0.48;

      vec3 color = mix(deep, mid, center * 0.72 + n1 * 0.18);
      color = mix(color, light, centerHighlights);
      color = mix(color, foam, bankFoam * (0.35 + 0.45 * bands));

      float glint = pow(max(0.0, sin((uv.x * 18.0 + downstream * 26.0) + n2 * 2.0)), 18.0) * 0.16;
      color += glint;

      gl_FragColor = vec4(color, 1.0);
    }
  `;

  const material = new BABYLON.ShaderMaterial("stylizedRiver", scene, {
    vertex: "riverRushWater",
    fragment: "riverRushWater",
  }, {
    attributes: ["position", "uv"],
    uniforms: ["worldViewProjection", "time"],
  });
  material.backFaceCulling = false;
  material.setFloat("time", 0);
  scene.onBeforeRenderObservable.add(() => {
    material.setFloat("time", performance.now() * 0.001);
  });
  return material;
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
