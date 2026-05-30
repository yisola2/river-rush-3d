import bpy
import os
import sys
from pathlib import Path

argv = sys.argv
args = argv[argv.index("--") + 1:] if "--" in argv else []
PROJECT_ROOT = Path(args[0]).resolve() if args else Path.cwd()
SOURCE_DIR = PROJECT_ROOT / "assets" / "source" / "mixamo"
OUTPUT_DIR = PROJECT_ROOT / "assets" / "models"
OUTPUT_PATH = OUTPUT_DIR / "rider_mixamo.glb"

ANIMATIONS = {
    "idle": SOURCE_DIR / "idle.fbx",
    "jump": SOURCE_DIR / "jump.fbx",
    "stand_to_crouch": SOURCE_DIR / "stand_to_crouch.fbx",
    "crouch_idle": SOURCE_DIR / "crouch_idle.fbx",
    "crouch_to_stand": SOURCE_DIR / "crouch_to_stand.fbx",
    "fall": SOURCE_DIR / "fall.fbx",
    "victory": SOURCE_DIR / "victory.fbx",
}

CHARACTER = SOURCE_DIR / "character.fbx"


def clear_scene():
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete()


def import_fbx(path: Path):
    before = set(bpy.data.objects)
    bpy.ops.import_scene.fbx(filepath=str(path), automatic_bone_orientation=False)
    after = set(bpy.data.objects)
    return list(after - before)


def find_armature(objects=None):
    search = objects if objects is not None else bpy.data.objects
    for obj in search:
        if obj.type == "ARMATURE":
            return obj
    return None


def rename_meshes():
    for obj in bpy.data.objects:
        if obj.type == "MESH":
            obj.name = "RiderMesh"
            obj.data.name = "RiderMeshData"
            # Keep Mixamo mesh scale intact. Babylon will scale the imported
            # root; scaling the skinned mesh here makes the body nearly
            # invisible while armature bones remain large.
            obj.rotation_euler[0] = 0
            obj.location = (0, 0, 0)


def collect_animation(path: Path, name: str):
    objects = import_fbx(path)
    armature = find_armature(objects)
    if not armature or not armature.animation_data or not armature.animation_data.action:
        print(f"WARN: no action found for {path}")
        bpy.ops.object.select_all(action="DESELECT")
        for obj in objects:
            obj.select_set(True)
        bpy.ops.object.delete()
        return None

    action = armature.animation_data.action
    action.name = name
    action.use_fake_user = True

    # Delete imported animation-only objects after preserving action datablock.
    bpy.ops.object.select_all(action="DESELECT")
    for obj in objects:
        obj.select_set(True)
    bpy.ops.object.delete()
    return action


def main():
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    clear_scene()

    print(f"Importing character: {CHARACTER}")
    character_objects = import_fbx(CHARACTER)
    main_armature = find_armature(character_objects)
    if not main_armature:
        raise RuntimeError("No armature found in character FBX")
    main_armature.name = "RiderArmature"
    main_armature.data.name = "RiderSkeleton"
    rename_meshes()

    actions = []
    # Preserve character embedded action as idle fallback if present.
    if main_armature.animation_data and main_armature.animation_data.action:
      main_armature.animation_data.action.name = "character_idle"
      main_armature.animation_data.action.use_fake_user = True

    for name, path in ANIMATIONS.items():
        if path.exists():
            print(f"Importing animation: {name} <- {path.name}")
            action = collect_animation(path, name)
            if action:
                actions.append(action)
        else:
            print(f"WARN: missing animation {path}")

    for obj in list(bpy.data.objects):
        if obj.type == "MESH" and obj.parent is None and obj.name.lower().startswith("icosphere"):
            bpy.data.objects.remove(obj, do_unlink=True)

    if actions:
        if not main_armature.animation_data:
            main_armature.animation_data_create()
        main_armature.animation_data.action = actions[0]

        # Add NLA strips so glTF exports them as animation groups.
        for action in actions:
            track = main_armature.animation_data.nla_tracks.new()
            track.name = action.name
            strip = track.strips.new(action.name, int(action.frame_range[0]), action)
            strip.name = action.name

    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.export_scene.gltf(
        filepath=str(OUTPUT_PATH),
        export_format="GLB",
        use_selection=True,
        export_apply=True,
        export_animations=True,
        export_nla_strips=True,
        export_materials="EXPORT",
        export_cameras=False,
        export_lights=False,
        export_yup=True,
    )
    print(f"Exported {OUTPUT_PATH}")


if __name__ == "__main__":
    main()
