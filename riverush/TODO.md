# River Rush 3D TODO

## Done

- Split code into modules: `game`, `world`, `raft`, `obstacles`, `steering`, `input`, `ui`, `materials`, `assets`, `debug`.
- Added `Vehicle` and `BehaviorManager` for steering behaviours.
- Added keyboard and motion-style controls with AZERTY/QWERTY support.
- Added fixed camera.
- Added Babylon Inspector toggle with `I`.
- Added gameplay hitbox toggle with `H`.
- Added Kenney Nature Kit CC0 assets for scenery and kept the license file.
- Kept gameplay obstacles procedural so hitboxes and orientation are controlled.
- Added obstacle `escapeActions` for cleaner collision rules.

## Next Priorities

1. Make the river feel less rectangular and more like a natural 3D course.
2. Improve Kinect River Rush style: stronger depth, better water, better set dressing.
3. Replace random spawning with authored wave/pattern progression.
4. Add gameplay feedback: collect sparkle, jump/duck success cue, crash effect.
5. Tune obstacle hitboxes using the `H` debug overlay.
6. Improve bot reliability after obstacle tuning.
7. Add README sections for controls, steering behaviours, assets/licenses, and personal experience.

## Visual / 3D Work

- Make the river visually curve or use staggered bank pieces to hide the straight rectangle.
- Add more natural bank transitions instead of flat strips.
- Improve water with better foam, wake behind raft, and optional splash particles.
- Make jump gates look like natural ramps or river hazards, not yellow bars.
- Keep rocks/logs/gates readable at speed.
- Consider adding more Kenney CC0 scenery assets only where they improve the scene.

## Gameplay Work

- Create wave patterns:
  - dodge rock
  - jump gate
  - duck log
  - collect star arc
  - dodge plus collect
  - jump/duck combo
- Make early waves easy and readable.
- Increase difficulty by combining actions, not by random unfair placement.
- Keep center lane safe during early/simple waves.
- Add combo or bonus scoring for clean collections.

## Obstacle Rules

- First check lateral overlap.
- If no overlap, the player avoided the obstacle by leaning.
- If overlap exists, check `escapeActions`.
- Current mapping:
  - rock: `JUMPING`
  - log: `DUCKING`
  - jump gate: `JUMPING`
  - star: collect only

## Debug / Testing

- Use `I` for Babylon Inspector.
- Use `H` for gameplay hitboxes.
- Run `npm run build` after changes.
- Check that root `index.html` and `dist/index.html` still load correctly.
- Verify bot sensors ignore stars and detect only hazards.

## Licensing / Deliverable

- BabylonJS is the only 3D framework.
- Kenney Nature Kit assets are CC0.
- Keep asset license files in `assets/vendor/...`.
- Add license/source notes to the README before final delivery.
- Do not add third-party assets without checking license terms.
