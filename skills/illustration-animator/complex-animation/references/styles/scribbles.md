# Scribbles

Measured on 10 Icons8 Scribbles animations with their source SVGs (Lottie). Durations in frames at 30 fps.

Scribbles is not a scene style: it is a set of black ink marks to use as decoration - brush strokes, dabs, dots, a paint stain, a crown-shaped splash, a loop, a scribbled outline. No characters, no colour. There are two kinds of animation, and nothing else.

## Format

- **30 fps**, 800×800. Loops are tiny: **10 frames (0.3 s)** for "boil" and **30–40 frames (1–1.3 s)** for "draw and erase".

## The two motions

- **Boil (5 of 10)** - the mark stays in place but is redrawn: 2–3 slightly different drawings swap every few frames (swaps in all 5; up to 16 per loop), so the edges tremble like hand-drawn animation. Loop 10 frames. Used on dots, dabs, stains, splashes.
- **Draw on, hold, erase (5 of 10)** - the stroke is painted on along its length (trim on a stroke or a matte that wipes along it), holds, then wipes off from the start and the loop restarts from empty. Loop 30–40 frames; the empty and full holds give 10–34 % still frames.
- No easing curves to speak of: the keys are few (44 in all) and the motion is in the swaps and wipes.

## Engine limits and what to do

- **Boil** = replacement drawings - the engine has one drawing per scene. Without extra drawings, imitate the tremble with tiny jitter: position ±2–3 px, rotation ±1–2°, scale ±2 %, a new value every 3 frames, `constant: true` (stepped), no easing.
- **Draw-on/erase** - the engine can't trim a stroke. Use a wipe with a mask: a rectangle part that moves along the stroke as `maskBy`, revealing then hiding it; or grow by scale from the stroke's start point.
- Strokes (5 of 10) - outline before export.

## Differences from common.md (measured in this style: a hint; the bans and lessons of common.md and of this style still win)

- Stepped motion (on 3s) instead of eased motion; loops of 10 frames are fine.
- Empty frames are part of the loop for draw-and-erase marks.

## Lessons

## User bans
