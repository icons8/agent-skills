# Sammy

Measured on 18 Icons8 Sammy animations with their source SVGs (Lottie). Sizes are on the 1200×1200 canvas, durations in frames at 30 fps, ranges are p25–p75; a "swing" is the motion between two turning points, measured frame by frame.

Sammy is bright flat illustration without outlines: saturated red, teal, yellow, light blue, dark plum; people with small heads, long legs and big sneakers, often with a dog; still lifes of objects (a backpack with a camera, a sneaker with a ball, a Christmas tree with gifts, a fireplace). Lettering appears in holiday scenes ("Merry Christmas", "Christmas Sale"). Lively and funny.

## Format

- **30 fps** (17 of 18), also 24 (1). Loops **2–6 s** (median ~4 s; 6 s in 5 of 18).
- Short holds in 3 of 18 (up to 10 %).

## Motion

| What | Frames | Amount |
|---|---|---|
| Rotation swing | 10 (6–18) | 10° (6–21°) |
| Large rotation (≥ 15°) | 11 (6–20) | up to 40° |
| Move swing | 15 (9–43) | 47 px (12–60) |
| Scale swing | 15 (12–47) | big: grows from 0 to 100 % |

- **Cartoon gags**: a man pops out of a hole holding unplugged wires, connects them with a spark, then drops back into the hole; a woman rides a shopping cart that jumps; a coin flips; a moped hops with the dog on board.
- **Objects bounce and swap**: in still lifes items squash, jump and switch places (the phone in the backpack changes screens, the ball bounces).
- **Pops from 0** (66 in 8 of 18): stars, sparks, hearts, check marks, lettering letters.
- **Replacement drawings in 16 of 18** (up to 296 swaps): poses, faces and screens; instant switches 44, fades 18.
- **Lettering writes itself** (trim in 13 of 18): "Merry Christmas" and "Christmas Sale" are written on, held, and erased.

## Easing

- Linear 44 % (dense rig keys), Easy Ease 39 %.

## Engine limits and what to do

- **Replacement drawings** - the engine can't swap; build gags from moves, bounces and pops of separate parts (a character sinking into a hole works as a move down clipped by the hole: `clipBy`).
- **Lettering draw-on** - replace with letters popping in one by one (if letters are separate parts) or a mask wipe.
- Strokes (18 of 18, mostly decorative lines) - outline before export.
- Morph (18 of 18) - needs a pose; mattes (15) - `clipBy`.

## Differences from common.md (measured in this style: a hint; the bans and lessons of common.md and of this style still win)

- Quick, comic swings (about 10 frames) and big hops; pops from 0 are common.
- Clear gag stories with a peak and a reset inside 4 s.

## Lessons

## User bans
