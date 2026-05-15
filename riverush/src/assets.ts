export type AssetCatalogEntry = {
  id: string;
  path: string;
  source: string;
  license: "CC0";
  fallback: "procedural";
};

export const ASSET_CATALOG: AssetCatalogEntry[] = [
  {
    id: "tree_round",
    path: "assets/vendor/kenney/nature/tree_pineRoundA.glb",
    source: "Kenney Nature Kit",
    license: "CC0",
    fallback: "procedural",
  },
  {
    id: "tree_tall",
    path: "assets/vendor/kenney/nature/tree_pineTallA_detailed.glb",
    source: "Kenney Nature Kit",
    license: "CC0",
    fallback: "procedural",
  },
  {
    id: "rock_large",
    path: "assets/vendor/kenney/nature/rock_largeA.glb",
    source: "Kenney Nature Kit",
    license: "CC0",
    fallback: "procedural",
  },
  {
    id: "rock_small",
    path: "assets/vendor/kenney/nature/rock_smallI.glb",
    source: "Kenney Nature Kit",
    license: "CC0",
    fallback: "procedural",
  },
  {
    id: "log_large",
    path: "assets/vendor/kenney/nature/log_large.glb",
    source: "Kenney Nature Kit",
    license: "CC0",
    fallback: "procedural",
  },
];

export function findAsset(id: string) {
  return ASSET_CATALOG.find((asset) => asset.id === id);
}

declare const BABYLON: any;

export class AssetLoader {
  private templates = new Map<string, any[]>();

  constructor(private scene) {}

  async loadCatalog() {
    if (!BABYLON.SceneLoader?.ImportMeshAsync) return;

    for (const asset of ASSET_CATALOG) {
      try {
        const slash = asset.path.lastIndexOf("/");
        const rootUrl = `./${asset.path.slice(0, slash + 1)}`;
        const fileName = asset.path.slice(slash + 1);
        const result = await BABYLON.SceneLoader.ImportMeshAsync(null, rootUrl, fileName, this.scene);
        result.meshes.forEach((mesh) => mesh.setEnabled(false));
        this.templates.set(asset.id, result.meshes);
      } catch (error) {
        console.warn(`Asset fallback: ${asset.id}`, error);
      }
    }
  }

  instantiate(id: string, fallbackFactory: () => any) {
    const templates = this.templates.get(id);
    if (!templates || templates.length === 0) return fallbackFactory();

    const root = new BABYLON.TransformNode(`${id}Instance`, this.scene);
    templates.forEach((template, index) => {
      if (!template.clone || index === 0) return;
      const clone = template.clone(`${id}Clone${index}`);
      clone.setEnabled(true);
      clone.parent = root;
    });
    return root;
  }
}
