# Polar

Measured on 7 Icons8 Polar animations with their source SVGs (Lottie). Sizes are on the 1200×1200 canvas, durations in frames at 30 fps, ranges are p25–p75; a "swing" is the motion between two turning points, measured frame by frame.

Polar is bold flat geometry with no outlines: a tall arch split into a blue half and a black half, a person in profile in front of it (a musician, a guard, a scientist, a farmer, a man in a VR headset), and a small scene inside the arch (a rocket, a UFO with a cow, a cloud with a padlock). Palette: deep blue, black, teal, red-orange, cream. 7 of 7 have a character.

## Format

- **24 fps** (4 of 7) or **30 fps** (3). Loops short: **1–4 s** (median 3 s).
- Never still.

## Motion

| What | Frames | Amount |
|---|---|---|
| Rotation swing | 8 (5–20) | 9° (6–15°) |
| Large rotation (≥ 15°) | 14 (5–25) | up to 30° and more |
| Move swing | 16 (9–30) | 14 px (7–56) |
| Scale swing | 22 (12–42) | 10 % (8–19 %) |

- Small, quick actions: a drumstick hits, a trumpet blows notes, a hand drops a coin into a piggy bank, a guard raises a barrier, the UFO beam turns on.
- **Replacement drawings in 6 of 7**, often frame by frame (up to 588 swaps): hands, heads and props are redrawn every few frames - a hand-made, cut-out feel.
- **Opacity fades are a main tool** (214 fades, no instant swaps): beams, sparks, notes, signs fade in and out.
- Lines draw themselves in 5 of 7 (a cable to the cloud, motion lines); strokes in 6, morph in 7, track mattes of the arch in 7.
- Pops from 0 - rare (9 in 2).

## Easing

- **Linear - 58 % of keys** (frame-by-frame and stepped motion); Easy Ease only 9 %.

## Engine limits and what to do

- **Frame-by-frame replacement drawings** - the core look; the engine can't do it. Use short quick bends and taps of separate parts (8-frame swings) instead and don't promise redrawn poses.
- **Scene inside the arch** - clip it by the arch half (`clipBy`).
- Strokes and draw-on lines - outline before export; replace draw-on with a fade.

## Differences from common.md (measured in this style: a hint; the bans and lessons of common.md and of this style still win)

- Short, quick swings (about 8 frames, ~10°) and mostly linear keys.
- Fades are normal.

## Lessons

## User bans
