export function installBabylonDebug(scene) {
    window.__babylonScene = scene;
    window.addEventListener("keydown", async (event) => {
        if (event.key.toLowerCase() !== "i")
            return;
        event.preventDefault();
        event.stopPropagation();
        if (scene.debugLayer.isVisible()) {
            scene.debugLayer.hide();
            return;
        }
        await scene.debugLayer.show({
            embedMode: false,
            overlay: true,
        });
    });
}
