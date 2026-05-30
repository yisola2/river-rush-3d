# Mixamo Source Assets

Source FBX files downloaded from Mixamo for the River Rush rider prototype.

Files:

- `character.fbx` — Sporty Granny character with skin
- `idle.fbx` — idle animation
- `jump.fbx` — jump animation
- `stand_to_crouch.fbx` — transition into duck/crouch
- `crouch_idle.fbx` — held duck/crouch loop
- `crouch_to_stand.fbx` — transition out of duck/crouch
- `fall.fbx` — crash/fall animation
- `victory.fbx` — celebration animation

Pipeline target:

```text
Mixamo FBX -> Blender cleanup/merge -> GLB -> BabylonJS
```

Notes:

- Keep these files as source assets.
- Exported web-ready assets should go in `assets/models/`.
- Gameplay hitboxes remain procedural in BabylonJS; imported models are visual only.
