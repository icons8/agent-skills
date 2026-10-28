# Purr

Measured on 6 Icons8 Purr animations with their source SVGs (Lottie). Sizes are on the 1200×1200 canvas, durations in frames at 30 fps, ranges are p25–p75; a "swing" is the motion between two turning points, measured frame by frame.

Purr is hand-drawn cats: thin sketchy black outlines, white bodies with orange tabby stripes or grey spots, light hatching, no background. Subjects: a cat sleeping, washing itself, sitting in a box, lying by an empty bowl, held up by hands. 6 of 6 are cats. The motion is slow and cat-like: breathing, licking, tail flicks.

## Format

- **30 fps** (4 of 6) or **24 fps** (2). Loops **1.5–5 s** (median ~3.5 s).
- Almost never still (only the sleeping cat has 2 % still frames).

## Motion

| What | Frames | Amount |
|---|---|---|
| Rotation swing (head, paw, tail) | 27 (11–54) | 6° (4–14°) |
| Large rotation (≥ 15°: tail flick, paw) | 15 (8–37) | up to 20° and more |
| Move swing | 36 (15–65) | 10 px (7–23) |
| Scale swing (breathing) | 44 (8–74) | 17 % |

- **Slow and small**: breathing by scale over 1.5–2.5 s, a head tilting a few degrees, a tail swaying slowly, then a quick flick.
- Licking and washing: a paw goes up and down in short repeats, the tongue pops out.
- Sleeping: "z" letters appear and float up.
- **Replacement drawings in all 6** (up to 35 swaps; 24 instant opacity switches): the cat in the box turns around, eyes close, the tongue appears - done by swapping drawings.
- Pops from 0 - rare (6 in 2).

## Easing

- **Easy Ease `[0.33, 0, 0.67, 1]`** - 46 % of keys; linear - 30 %.

## Engine limits and what to do

- **Sketchy outlines are live strokes** (6 of 6) - outline before export.
- **Replacement drawings** (a turn in the box, closed eyes) - the engine can't swap; build from breathing, head tilts and tail sways.
- **Morph** (6 of 6: a belly breathing, a tail bending) - use `bend` on the tail and scale for breathing, or draw a pose (`SCENE-FORMAT.md`, "Morph").

## Differences from common.md (measured in this style: a hint; the bans and lessons of common.md and of this style still win)

- Slow swings (about 27 frames) with small angles (~6°); breathing is a slow scale of 2–5 %, not a pop.
- No big actions: the story is a cat's small habit, looped.

## Lessons

## User bans
