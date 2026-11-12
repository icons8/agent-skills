# Tiny

Measured on 7 Icons8 Tiny animations with their source SVGs (Lottie). Sizes are on the 1200×1200 canvas, durations in frames at 30 fps, ranges are p25–p75; a "swing" is the motion between two turning points, measured frame by frame.

Tiny is tiny people next to giant objects: small figures with black trousers and orange or royal-blue tops climb and push huge chess pieces, gears, a seesaw with work and leisure items, a cauldron with a potion, a monitor of a web shop. Flat, no outlines; greys for the big objects, orange and blue accents. 7 of 7 have several characters.

## Format

- **30 fps** (6 of 7), also 60 (1). Loops **long: 6 s** typical (5–6.7 s), one 3 s.
- Short holds in 3 of 7 (up to 11 %).

## Motion

| What | Frames | Amount |
|---|---|---|
| Rotation swing | 11 (6–27) | 12° (6–25°) |
| Large rotation (≥ 15°) | 14 (9–43) | up to 50° |
| Move swing | 13 (8–49) | 15 px (5–47) |
| Large move (≥ 40 px: climbing, jumping) | 27 (13–67) | up to 100 px |

- **Little people at work on a big thing**: they push a chess piece, climb steps, turn gears, balance on a seesaw, cheer with raised arms, fish social icons with a rod, stir a cauldron.
- Each figure has its own action and rhythm; the giant objects move slowly (a gear turns, a seesaw tilts over the whole loop, a scale 6 s long).
- **Replacement drawings in all 7** (up to 53): figures change pose; few fades (9), almost no pops.

## Easing

- Linear 45 % (dense rig keys), Easy Ease 15 %.

## Engine limits and what to do

- Small figures doing big actions are pose swaps in the source - in the engine move figures as a whole (hop, slide, tilt) and swing separate arms; don't promise climbing poses.
- Giant objects: slow rotation (gears: linear, constant speed) and slow tilts with period = loop.
- Strokes (7 of 7, details) - outline before export; morph needs a pose.

## Differences from common.md (measured in this style: a hint; the bans and lessons of common.md and of this style still win)

- Long loops (6 s) with several small characters acting at their own rhythm around one slow big motion.

## Lessons

## User bans
