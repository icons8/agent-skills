# Project

Measured on 19 Icons8 Project animations with their source SVGs (Lottie). Sizes are on the 1200×1200 canvas, durations in frames at 30 fps, ranges are p25–p75; a "swing" is the motion between two turning points, measured frame by frame.

Project is isometric tech objects with thick black outlines and a flat black extrusion side: phones, laptops, clouds, locks, a robot head, a drone, a globe, plus big peach-coloured hands. Palette: violet, acid lime, pink, mint, pale blue. No characters except hands (6 of 19). The motion is UI micro-stories with snappy object moves, closer to Techny than to character styles, but without the constant float.

## Format

- **30 fps** (19 of 19). Loop **4 s (120 frames)** in 10 of 19; 3 s in 5; up to 6 s.
- Almost never still.

## Motion

| What | Frames | Amount |
|---|---|---|
| Rotation swing | 12 (8–20) | 11° (6–20°) |
| Move swing | 17 (7–59) | 26 px (10–62) |
| Large move (≥ 40 px: a card slides out, the drone lands) | 45 (11–81) | up to 210 px |
| Scale swing | 13 (5–63) | 16 % (5–25 %) |

- UI events: a card slides out of a phone and back, a toggle switches, password stars type in, a fingerprint scans, a pin bounces on a map, a cursor clicks, folders shuffle, a robot face changes expression.
- Hands act: a finger taps a phone, two hands high-five, a hand holds a gift or a phone and turns it.
- **Fades are the main switch tool** (240 fades, 2 instant): screens, scan lines and icons fade between states.
- Pops from 0 - sometimes (67 in 6 of 19): confetti, checkmarks, bubbles.
- Replacement drawings in 7 of 19 (hands, robot faces, a phone turning).
- Lines draw themselves in 10 of 19 (checkmarks, routes, sound waves).

## Easing

- **Easy Ease `[0.33, 0, 0.67, 1]`** - 41 % of keys; linear - 20 %.

## Engine limits and what to do

- **Thick outlines are live strokes** (19 of 19) - outline before export.
- **Isometric turn** (a phone turning in the hand, a gift box rotating, path morph in 19 of 19) - needs a pose (`SCENE-FORMAT.md`, "Morph"); without one, keep objects facing the same way and move them along the isometric axes.
- **Track mattes** (15 of 19): content slides inside a screen - clip by the screen part (`clipBy`).
- Draw-on checkmarks - replace with a pop.

## Differences from common.md (measured in this style: a hint; the bans and lessons of common.md and of this style still win)

- Fades of screen states are normal.
- Moves follow the isometric axes (30° diagonals), not the screen horizontal.

## Lessons

## User bans
