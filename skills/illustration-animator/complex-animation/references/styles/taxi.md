# Taxi

Measured on 25 Icons8 Taxi animations with their source SVGs (Lottie). Sizes are on the 1200×1200 canvas, durations in frames at 30 fps (at 24 fps multiply by 0.8), ranges are p25–p75; a "swing" is the motion between two turning points, measured frame by frame.

Taxi is three colours only: taxi yellow, black and white. Thin black line drawing with yellow and black fills, set on a big yellow blob behind the scene. Subjects are witty metaphors and everyday scenes: a baseball player batting an envelope, a carnivorous plant catching a bee, a cow abducted by a UFO, penguins on an ice floe, vegetables reaching for each other, a press conference, a handshake, plus UI still lifes (a browser with coins, data charts, a megaphone with a target). About two thirds have characters or animals.

## Format

- **24 fps** (17 of 25) or **30 fps** (8). Loops **3 s** typical (72 frames at 24 fps in 8 of 25), or **6 s** (6 of 25, the UI still lifes at 30 fps); 1.2–4 s for gags.
- Almost never still (short holds in 4 of 25, up to 7 %).

## Motion

| What | Frames (at 30 fps) | Amount |
|---|---|---|
| Rotation swing | 40 (16–89) | 13° (6–22°) |
| Move swing | 89 (34–89) | 28 px (15–57) - slow drift with period = loop |
| Scale swing (pops, blinks, swells) | 10 (7–31) | big: 72 % (10–89 %) |

- **Two layers**: slow drifts and rocks of objects over the whole loop (like the Techny float, but on flat objects), and quick events on top: a bat swing, a snap of the plant's jaws, a pop of coins, a bubble.
- **Pops and quick scales**: elements swell and shrink fast (10 frames), pops from 0 in 3 of 25 (38 times).
- Replacement drawings in 9 of 25 (up to 128: a bat swing, faces, a handshake breaking apart); fades 42, instant 6.
- Lines draw themselves in 8 (speed lines, charts).

## Easing

- **Easy Ease `[0.33, 0, 0.67, 1]`** - 56 % of keys; linear - 29 %.

## Engine limits and what to do

- **Thin line art is live strokes** (25 of 25) - outline before export.
- **Morph** (25 of 25: plants, cloth, blobs) - needs a pose; the yellow background blob can stay still.
- Gags with a big pose change (a bat swing, a jaw snap) are replacement drawings in the source; in the engine do them with rotation of separate parts (the bat with the arms from the shoulder, the jaw on a pinned hinge).
- Slow drift layer: `float`-like custom keys with period = loop, Easy Ease.

## Differences from common.md (measured in this style: a hint; the bans and lessons of common.md and of this style still win)

- A slow loop-long drift under everything is the base; quick events go on top.
- 24 fps is the default for character scenes.

## Lessons

## User bans
