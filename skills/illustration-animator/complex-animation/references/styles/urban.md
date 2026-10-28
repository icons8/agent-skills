# Urban

Measured on 14 Icons8 Urban animations with their source SVGs (Lottie). Sizes are on the 1200×1200 canvas, durations in frames at 30 fps, ranges are p25–p75; a "swing" is the motion between two turning points, measured frame by frame.

Urban is small, slim people in a wide scene, in blue only: royal blue, navy and pale blue clothes, the rest of the scene (offices, desks, screens, a city, the sea) in very light grey line drawing, almost a sketch. Subjects: office meetings, doctors at a telemedicine screen, investors reclining at a desk, a designer in a space dome, a courier with a moped, friends meeting at the airport, a walk with a dog. 14 of 14 have characters; the figures are small in the frame.

## Format

- **30 fps**. Loops **3 s** in 7 of 14; up to 6 s.
- Holds happen: 5 of 14 have still frames (up to 22 % in a group scene).

## Motion

| What | Frames | Amount |
|---|---|---|
| Rotation swing | 20 (10–38) | 6° (4–13°) |
| Move swing | 16 (8–29) | 6 px (4–16) |
| Scale swing (UI pops and charts) | 41 (27–65) | 20–100 % |

- **Small, calm gestures** of small figures: a wave, a nod, a hand gesture at a chart, typing, leaning back in a chair; people barely move from their place.
- **The UI does the storytelling**: charts draw and grow, health indicators pulse on screens, pop-ups appear (pops from 0: 47 in 5 of 14), sign boards flip.
- Fades 85, no instant swaps; replacement drawings in 7 of 14 (hands, heads).
- Lines draw themselves in 5.

## Easing

- **Easy Ease `[0.33, 0, 0.67, 1]`** - 41 %; linear only 6 %.

## Engine limits and what to do

- Small figures: keep rotations small (≤ 8°) - at this scale bigger swings look jerky.
- The grey sketch background is live strokes (13 of 14) - outline before export; keep it still.
- Morph (14 of 14) - needs a pose; mattes (10) - `clipBy` the screen.

## Differences from common.md (measured in this style: a hint; the bans and lessons of common.md and of this style still win)

- Quiet scenes: small gestures, short holds are fine; the event is usually on a screen.

## Lessons

## User bans
