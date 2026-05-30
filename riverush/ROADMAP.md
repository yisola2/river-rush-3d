# River Rush 3D Roadmap / Notes

## Current direction

The project is a BabylonJS Kinect Adventures-inspired web game. The current main game is River Rush 3D, with future plans for MediaPipe camera controls and a second Kinect-style mini-game such as a 20,000 Leaks-inspired mode.

## Completed recently

- Added a first product-flow polish pass:
  - main menu
  - pause/resume flow
  - countdown before gameplay
  - profile selection placeholder
  - per-profile high score saved in localStorage
  - game-over collision actions
- Reworked the menu style after user feedback, taking inspiration from Primal Olympics:
  - moved the main menu to handcrafted HTML/CSS for better craft/art direction
  - kept Babylon GUI for in-game HUD/cues/countdown/collision
  - full-screen menu overlay
  - top/bottom cinematic bands
  - warm jungle/stone color palette
  - large card-based choices instead of cramped central panel
  - simplified menu content
- Added first gameplay feedback effects:
  - collect sparkle particles
  - jump/landing splash particles
  - crash burst particles
- Added first profile polish:
  - profile selection changes rider color in-game
  - menu profile card shows a simple rider/raft preview
  - selected profile color is exposed via CSS variable for future UI theming
- Added first world-shape polish:
  - visual shoreline chunks along both banks
  - small reeds on the bank edge
  - breaks the perfectly rectangular river silhouette without changing gameplay bounds
- Added first Mixamo/Blender asset integration:
  - copied Mixamo FBX sources into `assets/source/mixamo/`
  - added Blender merge/export script `scripts/merge_mixamo_to_glb.py`
  - exported `assets/models/rider_mixamo.glb`
  - Babylon now loads the GLB rider on the raft and hides the procedural rider fallback
  - initial animation mapping: idle, jump, crouch idle
- Replaced the old HTML HUD with a BabylonJS GUI overlay.
- Added a compact in-game HUD, menu overlay, action cue bar, mode buttons, controls/debug help, and collision message.
- Replaced mostly random obstacle spawning with authored wave patterns.
- Refactored bot steering toward a Craig Reynolds / ia_buffa-inspired architecture:
  - perception/planner
  - BehaviorManager
  - Vehicle steering behaviours
  - separate jump/duck action outputs
- Adjusted jump/duck timing several times after bot testing.

## Current known observations

- Bot can survive for a very long time, over 30 minutes in one test.
- This means the current authored waves and difficulty curve are too easy for the bot.
- This is not urgent right now, but should be addressed before final gameplay balancing.
- Duck timing was previously too early and caused collision after the duck expired. It has been moved closer to contact.
- Steering still needs qualitative playtesting, especially Bot mode with hitboxes enabled.

## Not for now, but important later: difficulty progression

The bot surviving indefinitely suggests the game needs stronger progression.

Potential improvements:

1. Increase obstacle speed more aggressively over time.
   - Current speed likely caps too low.
   - Consider a higher cap or multiple phases.

2. Unlock harder authored wave patterns later.
   Examples:
   - triple hazards
   - star bait into hazard
   - jump + dodge
   - duck + immediate dodge
   - alternating lane blockers
   - forced body action followed by lateral movement

3. Decrease spawn delay over time.
   - Later waves should appear closer together.
   - Avoid unfair overlaps, but increase pressure.

4. Add optional run cap for demos.
   - Example: 3-minute survival challenge.
   - End with “Run complete” instead of endless play.

5. Add Bot stress/debug mode.
   Track:
   - time survived
   - distance
   - score
   - number of jumps
   - number of ducks
   - number of dodges
   - collision cause

## Steering / AI architecture target

Keep the AI aligned with Craig Reynolds steering behaviours and the older ia_buffa project.

Target architecture:

```text
Sensors / obstacle perception
  -> deterministic planner or NN brain
  -> behaviour weights / target / action
  -> BehaviorManager
  -> Craig Reynolds steering behaviours
  -> raft movement
```

Core behaviours:

- seek / arrive target X
- obstacle avoidance
- bank / wall avoidance
- collectible seeking
- possible future wander/noise for natural movement

Important design choice:

- Neural network, if added, should not directly control raft position.
- It should control steering behaviour weights and jump/duck action decisions.

## Possible NN Bot mode

Future mode list could become:

- Keyboard
- Motion
- Bot
- NN Bot
- Camera / MediaPipe

NN idea:

Inputs:

- 5 sensor distances
- 5 sensor obstacle types
- raft X normalized
- raft velocity X normalized
- current zState

Outputs:

- center/arrive weight
- obstacle avoidance weight
- collectible seeking weight
- bank guard weight
- z action:
  - duck
  - none
  - jump

Training options:

1. Genetic algorithm in browser, similar to ia_buffa.
2. Imitation learning from deterministic Bot as teacher.
3. Imitation learning from real camera/player data.

## Idea: train NN from MediaPipe camera mode

User idea: once MediaPipe camera mode works, record player/body-controlled runs and use them to train an NN Bot.

Concept:

```text
Camera player run
  -> record game sensors + raft state + pose-derived player actions
  -> clean/filter successful samples
  -> train small NN
  -> NN Bot controls behaviour weights and jump/duck actions
```

Data to record per frame/sample:

- 5 sensor distances
- 5 sensor obstacle types
- raft X normalized
- raft velocity X normalized
- current zState
- pose confidence
- player lean value
- jump intent
- duck intent
- score/distance context
- whether the run later crashed soon after this sample

Possible labels/outputs:

- steering target or steering behaviour weights
- jump / duck / none action
- optionally collect-vs-avoid preference

Recommended approach:

- Do not train the NN to directly set raft position.
- Train it to imitate player decisions by outputting steering behaviour weights/actions.
- Use only high-confidence MediaPipe frames.
- Prefer successful runs or remove samples shortly before collisions unless intentionally training recovery/failure cases.

Estimated project size:

- Minimum viable prototype: medium, roughly 1-2 focused days after MediaPipe input is stable.
- Polished version with data cleaning, model saving/loading, debug UI, and evaluation: larger, around 1 week+.

Suggested future files:

- `src/poseInput.ts` for MediaPipe controls
- `src/inputRecorder.ts` for dataset collection
- `src/nnBot.ts` for TensorFlow.js inference
- `src/training.ts` or external notebook/script for training

## MediaPipe camera mode

Initial implementation added:

- New `camera` input mode in the menu and via `C` key.
- Added `src/poseInput.ts` using MediaPipe Tasks Vision PoseLandmarker.
- Pose controls currently output:
  - `lean` from calibrated shoulder/hip body center X
  - `duckHeld` from crouch/body compression and knees
  - `duckIntent` for the transition into a duck
  - `jumpIntent` from upward body velocity
  - `clapIntent` from wrist proximity near the torso
  - `confidence` and status internally
- Webcam preview appears in the bottom-right when camera mode is active.
- Camera mode now uses a clap-to-start flow:
  - choose Camera
  - stand in the play position
  - clap to calibrate current center/height
  - countdown starts after calibration
- Camera ducking is held while the player stays crouched, unlike keyboard/bot timed ducking.

Next camera-mode improvements:

- Add explicit calibration step before play.
- Add camera debug panel showing lean/confidence/jump/duck.
- Tune gesture thresholds with real testing.
- Add a fallback if MediaPipe CDN/model fails to load.
- Later: map pose landmarks to a Blender-rigged avatar skeleton.
- If recording human games for NN training, store both `duckHeld` and `duckIntent` so the NN can learn camera-style held ducking without conflicting with keyboard/bot timed actions.

Retargeting note:

- Full avatar synchronization is doable later by mapping MediaPipe landmarks to BabylonJS skeleton bones.
- This requires a rigged `.glb`, bone naming/mapping, smoothing, constraints, calibration pose, and blending with authored animations.

## Presentation / productization polish

Goal: make the project feel like a small Kinect Adventures-style game collection, not only a technical prototype.

### Game shell / menu

Use BabylonJS GUI as the main game shell.

Future menu structure:

- Main menu
  - Play River Rush
  - Game select
  - Profile select
  - Controls
  - Camera calibration
  - Debug / developer options
- Pause menu
  - Resume
  - Restart
  - Change input mode
  - Back to main menu

### Profile choosing

Start simple:

- Guest / Player 1 / Player 2
- avatar color
- preferred input mode
- high score
- camera calibration values later

Storage:

- use `localStorage` first
- no backend needed

Later profile polish:

- avatar preview in BabylonJS
- simple character customization
- saved calibration per player
- best distance / score per mini-game

### Blender + asset pipeline

Use Blender to gradually replace procedural placeholders with `.glb` assets.

Priority order:

1. raft model
2. rider/avatar model
3. rocks/logs/jump gates
4. collectible stars/tokens
5. river bank/set dressing props
6. future 20,000 Leaks/submarine assets

Important rule:

- Keep gameplay hitboxes procedural and controlled in BabylonJS.
- Blender models are visual; Babylon hitboxes remain simple/invisible for reliable collisions.

### Animations

Export GLB animation groups from Blender.

Useful animations:

- rider idle / paddling
- lean left
- lean right
- jump
- duck
- crash
- collect celebration
- start countdown pose

BabylonJS should select/blend animations based on:

- input lean
- `zState`
- collision state
- collect event
- menu/profile preview

### Visual identity

Target style:

- colorful toy-adventure look
- readable silhouettes
- exaggerated obstacles
- bright feedback effects
- Kinect Adventures-inspired, not realistic/muddy

Visual polish ideas:

- Make river feel less rectangular.
- Add curved/staggered banks.
- Improve water shader/material.
- Add foam and wake improvements.
- Improve obstacle readability.
- Add splash on jump/landing.
- Add sparkle collect effects.
- Add crash burst effect.
- Add countdown: 3, 2, 1, GO.
- Add start camera fly-in.

### Future game collection shell

Eventually the main menu can select between:

- River Rush
- Leak Panic / 20,000 Leaks-inspired mode
- Training / Calibration

## Second mini-game idea

20,000 Leaks-inspired mode:

- Player is inside an underwater glass room/submarine.
- Leaks appear on panels.
- Player uses body parts to block leaks.
- MediaPipe controls:
  - wrists for hand leaks
  - feet/ankles for low leaks
  - head/torso for central leaks
- BabylonJS scene:
  - glass wall
  - underwater lighting
  - fish/bubbles
  - leak particles
  - survival/scoring mode

## Immediate next practical steps

1. Continue testing Bot mode with hitboxes enabled.
2. Review obstacle hitboxes and collision depth.
3. Separate jump and duck durations if needed.
4. Add debug info for time-to-contact and active bot action.
5. Once bot/play feel is stable, start MediaPipe camera input.
