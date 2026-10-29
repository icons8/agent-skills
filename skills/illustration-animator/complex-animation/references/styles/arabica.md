# Arabica

Measured on 10 Icons8 Arabica animations with their SVGs. Durations in frames at 30 fps, ranges p25–p75, motion measured per frame.

Arabica is a folk-like cartoon in a warm palette (black-brown, red, orange, cream) with dotted textures: funny animals (a hedgehog couple, a monkey, a bird, a rabbit, a dog, a chicken) and party confetti. The animation is **character comedy**: clear gags with big poses.

## Format

- 30 fps. Loops 2.3–4 s (one 1.1 s). Never still.

## Motion

| What | Frames | Amount |
|---|---|---|
| Rotation swing | 18 (6–34) | 15° (7–54°) |
| Move swing | 24 (10–59) | large: 113 px median (confetti and flying objects) |
| Large move | 28 (13–60) | - |

- Gags in poses: the couple hug, step apart and hug again with hearts; the angry monkey hides behind a tablet that fills the frame; the rabbit taps an hourglass; the chicken's car flies away and back.
- Replacement drawings in most scenes (8 of 10; up to ~190 in the confetti bursts) - body poses and particles.
- Confetti and particle bursts are a separate scene type: dozens of pieces fly out and fall.
- Pops from 0: rare (4 times in 2 scenes). No fades.

## Easing

- Easy Ease `[0.33, 0, 0.67, 1]` most, with strong custom ease-outs `[0.33, 0, 0.29, 1]`, `[0.33, 0, 0.13, 1]` and a slow start `[0.73, 0, 0.67, 1]`.

## Engine limits and what to do

- Big pose changes are replacement drawings - without extra drawings, build the gag from bends, hops and moving objects.
- Strokes in all 10; outline before export.

## Lessons

## User bans
