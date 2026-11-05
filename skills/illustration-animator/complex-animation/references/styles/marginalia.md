# Marginalia

Measured on 14 Icons8 Marginalia animations with their source SVGs (Lottie). Sizes are on the 1200×1200 canvas, durations in frames at 30 fps, ranges are p25–p75; a "swing" is the motion between two turning points, measured frame by frame.

Marginalia is flat people with gradient clothes (pink–orange–blue fades) in everyday scenes: at a desk, in a car, with a key and a keyhole, watering a tree, meditating, sleeping, lifting a barbell. The background is a thin pale grid with soft pastel hills; thin outline objects (pink, lilac) sit next to filled ones. 12 of 14 have a character; 2 are confetti backgrounds.

## Format

- **30 fps** (14 of 14). Loops **2 s or 4 s** (5 and 5 of 14); also 5–6 s for scenes with a longer story and 1.3 s for a short walk cycle.
- Almost never still: only the two confetti backgrounds have still frames (about 5 %, the empty gap between bursts).
- Canvas is mostly 800×800; confetti 800×600.

## Character motion

| What | Frames | Amount |
|---|---|---|
| Rotation swing (limb, torso, head) | 35 (15–57) | 32° (10–151°) |
| Move swing | 38 | 43 px (13–179) |
| Scale swing | 14 | 14 % |

- The whole body acts, in slow, wide swings: a lunge with the barbell overhead, arms rising in meditation, a big map pin swung between two people, a key carried to a keyhole.
- **Replacement drawings in all 14** (up to 53 swaps): head turns, hands in new poses, a whole figure swapped for a walk or a turn. Opacity mostly switches instantly (73) or fades (85).
- Pops from scale 0 are few (28 in 3 of 14): UI badges and code tags (`</>`, `if`, `else`) popping around a screen.

## Decoration and lines

- **Lines draw themselves** (trim in 13 of 14): falling lines of documents, sleeping "z", wind lines, the outline of the map pin, password dots.
- Path morph in 12 of 14 (a bag of water, a cloth, a bubble, hair), gradients in 11.
- Confetti backgrounds: bursts of small pieces that fly out, fall and disappear, then a gap and a new burst.

## Easing

- **Easy Ease `[0.33, 0, 0.67, 1]`** - 33 % of keys; linear - 19 %; the rest custom (rig curves).

## Engine limits and what to do

- **Replacement drawings** (all 14) - the engine has one drawing per scene; build stories from bends, lifts and moves of separate parts, not turns of the head or body.
- **Large swings** (30°+ on arms) need arms as separate parts in the SVG; on fused limbs keep within the cut limit (`common.md`, "Fused parts").
- **Strokes and draw-on lines** (14 and 13 of 14) - outline strokes before export; replace a draw-on with a quick fade or a pop.
- **Morph** - needs a pose (`SCENE-FORMAT.md`, "Morph").

## Differences from common.md (measured in this style: a hint; the bans and lessons of common.md and of this style still win)

- Swings are slow and wide (about 35 frames, 30°), continuous through the loop; no holds.
- Fades and instant opacity swaps are normal tools.

## Lessons

## User bans
