# Weekday

Measured on 6 Icons8 Weekday animations with their source SVGs (Lottie). Sizes are on the 1200×1200 canvas, durations in frames at 30 fps, ranges are p25–p75; a "swing" is the motion between two turning points, measured frame by frame.

Weekday is black-and-white ink: realistic office people drawn with thin black lines and solid black fills (suits, hair, trousers), white everything else, no colour, no background beyond a desk or a shelf. Subjects: office workers walking together, shaking hands, toasting, reviewing papers, buried in sticky notes, a woman doing skincare at a mirror. 6 of 6 have characters, often several.

## Format

- **30 fps**. Loops **long: 4.3–6.7 s** (median ~5.6 s, odd frame counts: 128–200).
- Almost never still.

## Motion

| What | Frames | Amount |
|---|---|---|
| Rotation swing | 16 (8–24) | 8° (4–13°) |
| Large rotation (≥ 15°) | 12 (6–23) | - |
| Move swing | 16 (8–24) | 22 px (12–99) |

- **Realistic acting, frame-dense**: people walk with natural steps, gesture, nod, adjust glasses, flip papers, apply cream, raise glasses for a toast. Motion is small and lifelike, but constant - a huge number of keys (34 000 for 6 files).
- **Replacement drawings in all 6** (up to 232 swaps): hands, faces and papers are redrawn for new poses; opacity used only for these swaps (13 instant, 2 fades).
- No pops; draw-on in 2.

## Easing

- Easy Ease 37 %, linear 11 %; the rest custom (rig curves).

## Engine limits and what to do

- **Realistic acting by replacement drawings** - the engine can't swap; keep to small gestures of separate parts: a head nod (≤ 8°), a forearm lift, a paper sheet rocking. Walking cycles of realistic figures are out of reach without drawings - don't promise them.
- **Thin lines are live strokes** (6 of 6) - outline before export.
- Realistic proportions show stiffness: slow, small rotations with pinned seams.

## Differences from common.md (measured in this style: a hint; the bans and lessons of common.md and of this style still win)

- Long loops (5–6.5 s), small natural motion, no pops or overshoot.

## Lessons

## User bans
