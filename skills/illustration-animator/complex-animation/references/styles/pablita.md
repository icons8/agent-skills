# Pablita

Measured on 18 Icons8 Pablita animations with their source SVGs (Lottie). Sizes are on the 1200×1200 canvas, durations in frames at 30 fps, ranges are p25–p75; a "swing" is the motion between two turning points, measured frame by frame.

Pablita is thin dark line art with flat fills in two blues (indigo-violet and light blue) and white; people with long limbs in office, tech and everyday scenes: online meetings, a courier on a motorbike, a designer with a giant pencil, analytics, a reader with books, a cemetery at night. 17 of 18 have characters. The motion is lively and bouncy: the whole body acts.

## Format

- **30 fps** (15 of 18), also 24 (2) and 60 (1). Loops **2–4 s** (median ~3 s; 1.7–4.8 s), frame counts are often irregular (59, 67, 77, 82, 97…).
- Never still.

## Character motion

| What | Frames | Amount |
|---|---|---|
| Rotation swing (limb, torso, head) | 11 (6–17) | 20° (12–32°) |
| Large rotation (≥ 15°) | 12 (7–20) | up to 67° and more |
| Move swing | 12 (8–24) | 19 px (9–36) |
| Large move (≥ 40 px: a jump, a step) | 16 (13–32) | up to 85 px and more |
| Scale swing | 9 (4–20) | 19 % (9–36 %) |

- Fast, wide limb swings: arms wave and gesture, legs step and kick, a man jumps in celebration, people walk out of frame with briefcases.
- **Replacement drawings in 13 of 18** (up to 96 swaps): heads turn, hands change pose, whole figures swap in walks and jumps.
- Opacity almost unused (8 fades, no instant swaps): changes come from swaps of drawings and pops.
- Pops from scale 0 - sometimes (44 in 6 of 18): bubbles, hearts, stars, chart pieces.

## Decoration and lines

- **Lines draw themselves** (trim in 13 of 18): chart lines, speech squiggles, motion lines, plant stems.
- Small props live all the time: plants sway, stars twinkle, a chart bar grows, a pie chart turns.
- Strokes in all 18, morph in all 18, track mattes in 13.

## Easing

- **Easy Ease `[0.33, 0, 0.67, 1]`** - 41 % of keys; linear - 13 %; the rest custom (rig curves).

## Engine limits and what to do

- **Line art is live strokes** (18 of 18) - outline before export, or the engine drops the lines.
- **Replacement drawings** - the engine can't swap; build stories from bends and moves of separate parts.
- **Large limb swings** (20°+ typical) need arms and legs as separate parts; on fused limbs keep within the cut limit (`common.md`, "Fused parts").
- **Draw-on lines** - replace with a quick pop or a growth by scale from the line's start.

## Differences from common.md (measured in this style: a hint; the bans and lessons of common.md and of this style still win)

- Fast swings (about 11 frames, 20°) are normal, not jerky; no holds.
- Short loops around 3 s.

## Lessons

## User bans
