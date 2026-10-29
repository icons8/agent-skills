# Beam

Measured on 10 Icons8 Beam animations with their SVGs. Durations in frames at 30 fps, ranges p25–p75, motion measured per frame.

Beam is soft gradient flat illustration in light blues, pinks and warm yellows: people at work and health/finance/travel interfaces (laptops, charts, medical cards, maps, a camera). The motion is calm and smooth, mostly UI changes with a gently moving person.

## Format

- 30 fps (one at 60). Loops 2.5–6 s (median ~4.5 s). Never still.

## Motion

| What | Frames | Amount |
|---|---|---|
| Rotation swing | 31 (16–44) | 6° (3–12°) |
| Move swing | 30 (22–45) | 17 px (8–30) |
| Scale swing | 16 (12–35) | 10 % (9–25 %) |

- Small, slow body motion: breathing, a head tilt, a typing hand.
- UI life on top: charts redraw, lines and signatures draw themselves (trim in 9 of 10), a plane flies a dotted route, a camera shutter clicks, pills pop out of a bottle.
- Pops from 0 sometimes (8 times in 4 scenes); fades rare (12).

## Easing

- Easy Ease `[0.33, 0, 0.67, 1]` - 48 %, linear - 25 % (lines drawing, routes, scrolling).

## Engine limits and what to do

- Gradients (10 of 10) are carried.
- Draw-on lines and signatures (9 of 10) - not possible; use a pop or a quick fade.
- Face and shape changes by morph (10 of 10) - need poses.

## Lessons

## User bans
