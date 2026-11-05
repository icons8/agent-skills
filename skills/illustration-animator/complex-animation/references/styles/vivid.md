# Vivid

Measured on 9 Icons8 Vivid animations with their source SVGs (Lottie). Sizes are on the 1200×1200 canvas, durations in frames at 30 fps, ranges are p25–p75; a "swing" is the motion between two turning points, measured frame by frame.

Vivid is semi-realistic vector scenes inside a soft blob-shaped frame: realistic proportions, soft gradients (8 of 9), daylight interiors with big windows and city views, mountains and forests. People do calm everyday things: present a chart, teach at a blackboard, stream from home, draw at a desk, launch a drone, shake hands, take a photo, hike. 9 of 9 have characters. The motion is quiet, almost a living photo.

## Format

- **30 fps** (8 of 9), also 60 (1). Loops **long: 6 s** in 6 of 9; 3–5 s in the rest.
- Short still moments (up to 11 % of the loop) in 6 of 9.

## Motion

| What | Frames | Amount |
|---|---|---|
| Rotation swing (head, arm, hand) | 27 (18–40) | 7° (4–15°) |
| Move swing | 69 (37–95) | 12 px (5–20) |
| Scale swing | 31 | 7 % |

- **Small and slow**: a head turns a little, an arm gestures towards a chart, a hand types, a blink, a nod; the body barely moves. Swings are about a second long.
- Background: lights slide over walls, a drone flies across the sky, trees sway, clouds drift; a few objects move along long, slow paths (69 frames, up to 200 px).
- Everything is clipped by the blob frame (mattes in 9 of 9).
- Opacity and swaps are rare (fades 6, instant 11; swaps in 2 of 9).

## Easing

- Linear 38 %, Easy Ease 20 %: body motion comes from a rig with dense keys.

## Engine limits and what to do

- **Gradient-heavy realistic drawing** - the engine carries gradients; keep the parts in their gradients and don't scale them much.
- **Blob frame mattes** - clip moving content by the frame part (`clipBy`).
- **Morph** (9 of 9: cloth, hair) - needs a pose; without one, keep cloth still.
- Realistic proportions show any stiffness: keep rotations small (≤ 10°) and slow (≥ 25 frames), pin seams carefully.

## Differences from common.md (measured in this style: a hint; the bans and lessons of common.md and of this style still win)

- Long loops (6 s) and small, slow motion; no bouncy pops or overshoot.
- Short holds are fine.

## Lessons

## User bans
