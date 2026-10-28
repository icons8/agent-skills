# Puzzle

Measured on 18 Icons8 Puzzle animations with their source SVGs (Lottie). Sizes are on the 1200×1200 canvas, durations in frames at 30 fps, ranges are p25–p75; a "swing" is the motion between two turning points, measured frame by frame.

Puzzle is a collage of torn-paper colour patches (magenta, violet, blue, cyan, teal, orange, yellow) fitted together like puzzle pieces into an object - a head, a padlock, a truck, a bag, a monitor - with a thick black brush outline over them and white line icons on the patches (an eye, a hand, a key, a checkmark, a dollar). The motion is a quick, playful shuffle of the pieces and their icons.

## Format

- **30 fps** (18 of 18). Loops **short: 1.7–3 s** (median ~2.3 s).
- Never still.

## Motion

| What | Frames | Amount |
|---|---|---|
| Move swing (a patch slides) | 20 (15–35) | 50 px (25–127) |
| Scale swing (a patch grows or shrinks) | 18 (15–24) | 40 % (12–74 %) |
| Rotation swing | 20 (14–26) | 10° (5–10°) |

- **Patches shuffle**: pieces slide, swap places, grow and shrink, so the object re-assembles; the black outline wobbles along (path morph in 17 of 18).
- **Icons change**: a white icon on a patch turns into another (a dollar → a coin → a bitcoin, a cross → a check, an eye opens and blinks) - by path morph and draw-on (trim in 6) and some swaps (7 of 18).
- Eyes blink and look around; small dots pop.
- Opacity - little (24 fades, 8 instant); pops from 0 - 22 in 3.

## Easing

- **Easy Ease `[0.33, 0, 0.67, 1]`** - 35 % of keys; linear only 8 %; the rest custom (snappy ease-outs).

## Engine limits and what to do

- **Icon transformations** are path morphs - need a pose per icon state; without poses, change icons by a quick scale-out / scale-in of separate icon parts (if both icons are in the SVG) or keep them and let them wobble.
- **Brush outline** - usually live strokes (15 of 18): outline before export; its wobble needs a pose.
- **Patch shuffles** are plain moves and scales - the engine does them well: slide 20 frames, ease-out, pieces in turn, not all at once.
- Patches clipped inside the outline (mattes in 12) - `clipBy` by the outline's fill.

## Differences from common.md (measured in this style: a hint; the bans and lessons of common.md and of this style still win)

- Big scale changes of patches (40 %+) are normal: it is a collage being rearranged.
- Short loops (~2 s), everything keeps moving.

## Lessons

## User bans
