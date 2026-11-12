# Outline

Measured on 21 Icons8 Outline animations with their source SVGs (Lottie). Sizes are on the 1200×1200 canvas, durations in frames at 30 fps, ranges are p25–p75; a "swing" is the motion between two turning points, measured frame by frame.

Outline is dark navy line drawings with flat fills in lilac and lime green, no background. Objects: phones, screens, charts, cards, suitcases, a globe, holiday greetings with hand-lettering; people in yoga poses, on a skateboard, at a desk, taking a selfie. About half have a character. The motion is calm UI micro-stories.

## Format

- **30 fps** (21 of 21). Loops **2.5–4.5 s** typical (median ~3.2 s); 6–7 s for scenes where lettering writes itself; 1 s for a short cycle.
- Short holds happen: 5 of 21 have still frames (up to 12 % of the loop, in lettering scenes where the finished text holds).

## Motion

| What | Frames | Amount |
|---|---|---|
| Rotation swing | 14 (9–35) | 6° (3–12°) |
| Move swing | 30 (21–89) | 30 px (9–105) |
| Large move (≥ 40 px: a card slides, a plane flies) | 89 (53–89) | up to 160 px |
| Scale swing | 54 (21–89) | large: elements grow from 0 or shrink to 0 |

- **Lines and lettering draw themselves** (trim in 20 of 21): "Back to School", "Happy New Year", "Thank You" are written on stroke by stroke, held, erased and written again; chart lines, routes, dashed paths draw on.
- Rotations are small (6°): gentle wobble of objects; people move little (breathing in meditation, a waving hand, skating cycle).
- **Pops from 0** (106 in 9 of 21): checkmarks, icons, bubbles, coins pop up in sequence.
- Fades are frequent (225) with some instant swaps (18); replacement drawings in 8 of 21 (characters' limbs, faces).
- Morph in all 21, mattes in 13.

## Easing

- **Easy Ease `[0.33, 0, 0.67, 1]`** - 50 % of keys; linear - 8 %.

## Engine limits and what to do

- **Live strokes (21 of 21) and draw-on (20 of 21)** - the main look; outline strokes before export. The engine can't write lettering on: replace with a fade or a growth by scale; for lettering - let the whole word pop or fade in, hold, and fade out.
- **Morph** - needs a pose (`SCENE-FORMAT.md`, "Morph").
- Replacement drawings - build character motion from bends of separate parts.

## Differences from common.md (measured in this style: a hint; the bans and lessons of common.md and of this style still win)

- Small rotations (~6°) and long, slow moves and scales (up to 3 s) for UI elements.
- Fades are a normal tool; short holds of finished lettering are fine.

## Lessons

## User bans
