# Social

Measured on 39 Icons8 Social animations with their source SVGs (Lottie). Sizes are on the 1200×1200 canvas, durations in frames at 30 fps, ranges are p25–p75; a "swing" is the motion between two turning points, measured frame by frame.

Social is flat illustration without outlines, in a warm palette: cream, green, mustard yellow, blue-violet, pink, coral, with soft volume (lighter and darker shades on objects, a slight 3D feel: phones, terminals, cubes, batteries, VR goggles). Three kinds of scenes: people at work and leisure (analysts, couriers, a doctor, yoga, jogging), objects with UI (phones, laptops, a payment terminal, a globe with a shield), and bold lettering cards ("Boom!", "Be Mine", "Thank You", "SEO", "Contact Us"). About half have characters.

## Format

- **30 fps** (36 of 39), also 60 (2). Loops **4–6 s** typical (median ~4.5 s), up to 7 s; a jogging cycle is 0.7 s.
- Almost never still; lettering scenes hold the finished card briefly (up to 9 %).

## Motion

| What | Frames | Amount |
|---|---|---|
| Rotation swing | 19 (11–39) | 12° (6–19°) |
| Move swing | 39 (19–70) | 35 px (16–64) |
| Large move (≥ 40 px) | 45 (22–89) | up to 160 px |
| Scale swing | 38 (15–89) | 40 % (18–93 %) - elements grow in and out |

- **UI and object stories**: a phone taps the terminal and a check pops up, coins fly around, a chart line draws, a map unfolds and folds, a battery charges, VR goggles orbit and turn.
- **Lettering cards**: an envelope opens, the card with the word rises out with a bounce, decorations pop around, then it goes back and the envelope closes; "Boom!" squashes into a blob and bursts back.
- **People**: moderate gestures - pointing at charts, waving, typing, talking with a hand; some full-body cycles (jogging, a scooter).
- Pops from 0 - 56 in 13 of 39; fades 54, instant 17; replacement drawings in 19 of 39 (hands, heads, a map changing).
- Lines draw themselves in 17 (charts, routes, doodles).

## Easing

- Linear 48 % (dense rig keys), Easy Ease 31 %.

## Engine limits and what to do

- **Envelope and map unfolds, 3D turns of goggles and phones** - morph in 39 of 39; need poses. Without them, open an envelope by scaling the flap in height toward its hinge, and keep 3D objects facing the same way.
- **Lettering pops** - the engine does these well: the card rises with a pop (peak 110–115 %), decorations pop in turn.
- Strokes in 30 (decorative lines, doodles) - outline before export.
- Mattes in 36 (screens, envelopes) - `clipBy`.

## Differences from common.md (measured in this style: a hint; the bans and lessons of common.md and of this style still win)

- Large scale changes (elements growing from small, a map unfolding) are normal.
- Loops 4–6 s with a clear event in the middle (the check, the card, the shot).

## Lessons

## User bans
