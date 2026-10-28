# Bouncy

Measured on 16 Icons8 Bouncy animations with their SVGs. Durations in frames at 30 fps, ranges p25–p75, motion measured per frame.

Bouncy is chunky object icons with a hard black offset shadow in saturated blue, pink, lime and yellow: a paper plane, a calendar, a trophy, gears, an hourglass, a kettlebell, a monitor with errors, a phone with a fingerprint. No characters. The motion is exactly what the name says: **squashy, bouncy pops**.

## Format

- 30 fps. Loops **4–5.5 s** (one 1.2 s). Short holds are part of the rhythm: 6 of 16 have still frames (up to half the loop in a reset-and-redo scene).

## Motion

| What | Frames | Amount |
|---|---|---|
| Scale swing (squash, swell, pop) | 47 (20–92) | 32 % (20–96 %) |
| Rotation swing | 17 (12–33) | 8° (4–16°) |
| Large rotation | 29 (16–83) | up to 56° |

- **Pops from 0 everywhere** (139 times in 10 of 16): checkmarks, stars, sparkles, chat bubbles, error windows pop in with a bounce.
- **Clear-and-refill vignettes**: the screen or the form empties (the check disappears, the windows close), holds, then everything pops back in one by one - the fingerprint, the checklist, the errors, the chat.
- The main object squashes and bounces as a whole (the kettlebell drops, the hourglass flips, the trophy wobbles); a pencil marks the calendar and ticks the checklist.
- Replacement drawings in 13 of 16 (up to 57).

## Easing

- Easy Ease `[0.33, 0, 0.67, 1]` - 30 %, the rest custom curves with long settles; linear only 5 %.

## Engine limits and what to do

- Pops and squash with spring - the engine's `pop`, `bounce` and `spring` fit well; use a big peak (115–130 %) and a visible settle.
- Strokes in 11 of 16 - outline before export.

## Lessons

## User bans
