# River Rush 3D — Handoff Summary

## Project location

`/Users/yass/Desktop/miage/cgi_games_on_web/riverush`

## Current state

River Rush 3D is a BabylonJS/TypeScript Kinect Adventures-inspired web game. It now has a usable product shell, authored waves, a MediaPipe camera prototype, and a first Mixamo/Blender rider integration.

## How to run

```bash
cd /Users/yass/Desktop/miage/cgi_games_on_web/riverush
npm start
```

Local URL:

```text
http://127.0.0.1:4174
```

## Important commands

Build:

```bash
cd riverush
npm run build
```

Re-export Mixamo GLB from FBX sources:

```bash
/Applications/Blender.app/Contents/MacOS/Blender --background --python riverush/scripts/merge_mixamo_to_glb.py -- $(pwd)/riverush
```

## Major recent changes

### Product/menu/UI

- Main menu moved to handcrafted HTML/CSS for a more crafty style.
- Babylon GUI kept for in-game HUD, countdown, action cues, and collision panel.
- Added profile selection: Guest, Player 1, Player 2.
- Per-profile high scores saved in localStorage.
- Top HUD shows score, state, mode, profile, and best score.

### Gameplay feedback

- Added particle effects:
  - collect sparkle
  - jump/landing splash
  - crash burst
- Added countdown before gameplay.

### Obstacles/waves

- Replaced mostly random spawning with authored wave patterns in `src/obstacles.ts`.
- Patterns include intro rocks, collectible arcs, duck logs, jump gates, combos, etc.

### Steering/bot

- Steering was refactored toward an ia_buffa/Craig Reynolds style architecture:
  - perception/planner
  - `BehaviorManager`
  - `Vehicle` steering behaviours
  - separate jump/duck action outputs
- Bot can survive very long; later difficulty progression is needed.

### MediaPipe camera mode

- Added `src/poseInput.ts` using MediaPipe Tasks Vision.
- Added `camera` mode and `C` hotkey.
- Camera preview appears bottom-right.
- Camera mode currently supports:
  - lean from calibrated body center
  - jump from upward body velocity or arms up
  - held duck while crouching
  - clap intent for calibration/start
- Camera flow:
  - select Camera
  - stand in play position
  - clap to calibrate/start
  - countdown begins

### Blender/Mixamo pipeline

Source FBX files are in:

```text
assets/source/mixamo/
```

Exported web asset:

```text
assets/models/rider_mixamo.glb
```

Blender export script:

```text
scripts/merge_mixamo_to_glb.py
```

Current Mixamo animations:

- idle
- jump
- stand_to_crouch
- crouch_idle
- crouch_to_stand
- fall
- victory

Babylon rider integration is in:

```text
src/raft.ts
```

Current mapping:

- NORMAL -> idle
- JUMPING -> jump
- DUCKING -> crouch_idle

The jump animation is allowed to finish visually instead of being cut when gameplay state returns to NORMAL.

## Known issues / likely next iterations

1. MediaPipe camera mode needs real-world tuning.
   - lean sensitivity
   - jump threshold
   - crouch threshold
   - clap reliability
   - debug overlay for confidence/lean/action

2. Mixamo rider still needs visual iteration.
   - scale/orientation is close but may need more tuning
   - crouch transition animations are downloaded but not fully integrated as enter/exit transitions
   - fall/victory animations exist but are not fully mapped yet

3. Visual polish should continue with Blender assets, not procedural patches.
   - raft model
   - obstacle models
   - riverbank/environment modules
   - better avatar/animation blending

4. Difficulty progression is too easy for bot.
   - bot survived 30+ minutes in testing
   - postpone until gameplay/visual foundation is stronger

5. NN idea is tracked but not implemented.
   - future recorder should store sensors + pose actions
   - store both `duckHeld` and `duckIntent`

## Files to read first in a new Pi session

1. `riverush/ROADMAP.md`
2. `riverush/HANDOFF.md`
3. `riverush/src/game.ts`
4. `riverush/src/raft.ts`
5. `riverush/src/poseInput.ts`
6. `riverush/src/obstacles.ts`
7. `riverush/src/steering.ts`

## Suggested next task

Continue Blender/Mixamo polish:

- wire crouch enter/hold/exit:
  - `stand_to_crouch`
  - `crouch_idle`
  - `crouch_to_stand`
- wire crash to `fall`
- possibly wire collect/finish to `victory`
- inspect animation group names in browser console from `Loaded Mixamo rider [...]`

Alternative next task:

- add a small MediaPipe debug/calibration panel for camera tuning.
