# Transistor

Measured on 23 Icons8 Transistor animations with their source SVGs (Lottie). Sizes are on the 1200×1200 canvas, durations in frames at 30 fps (at 24 fps multiply by 0.8), ranges are p25–p75; a "swing" is the motion between two turning points, measured frame by frame.

Transistor is bold black line art on white with solid black areas and exactly two accent colours: signal red and bright cyan-blue (people have red trousers and blue hair). Two kinds of scenes: people (a courier on a kick scooter, a girl riding an ostrich, painters with rollers, a woman dancing with a robot, a man on a bike charging batteries, meditating on a cloud) and icon still lifes (a house with insurance, a lab, a hospital, a cloud upload, a web design app, a zoom call).

## Format

- **30 fps** (16 of 23) or **24 fps** (7, the character scenes). Loops: **6 s** for still lifes (8 of 23), 2–4 s for characters, 0.9 s for a run cycle.
- Short holds in 4 of 23.

## Motion

| What | Frames | Amount |
|---|---|---|
| Rotation swing | 11 (9–23) | 9° (5–21°) |
| Large rotation (≥ 15°) | 12 (9–22) | up to 60° |
| Move swing | 15 (8–30) | 15 px (6–36) |
| Scale swing | 12 (8–93) | 13 % (6–66 %) |

- **Characters**: lively cycles - kicking a scooter, pedalling, rolling paint up and down, dancing with big arm swings, an ostrich running.
- **Still lifes**: UI events - a padlock opens, password stars type, files fly into the cloud, a waveform plays, a heart beats with a cardiogram, a crane swings, batteries fill and drain.
- **Lines draw themselves** (trim in 17 of 23): checklists, cardiograms, waveforms, cables.
- **Replacement drawings in 19 of 23** (up to 39): hands, faces, icons swap; instant switches 22, fades 15.
- Pops from 0 - 20 in 4.

## Easing

- **Easy Ease `[0.33, 0, 0.67, 1]`** - 36 %; linear - 12 %; the rest custom.

## Engine limits and what to do

- **Bold lines are live strokes** (23 of 23) - outline before export.
- Replacement drawings - build character cycles from rotations of separate parts; still-life swaps (a padlock open/closed) work only if both states are parts in the SVG.
- Draw-on lines - replace with a mask wipe along the line.

## Differences from common.md (measured in this style: a hint; the bans and lessons of common.md and of this style still win)

- Quick character swings (about 11 frames) with big angles in dance and sport scenes.
- Still lifes run 6 s with several events one after another.

## Lessons

## User bans
