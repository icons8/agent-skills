# Buddy

Measured on 16 Icons8 Buddy animations with their SVGs. Durations in frames at 30 fps (the files are 24 fps), ranges p25–p75, motion measured per frame.

Buddy is one recurring character: a big orange gradient face with blue hair and round glasses on a thin-line white body, often in blue-violet gradient props. It is an emotional mascot for UI states: errors (504, offline, empty list, nothing found), waiting, success, sign-in.

## Format

- **24 fps**. Loops **3–5 s** (1.1–6 s). Short holds on the emotional pose are normal (7 of 16 have a few still frames).

## Motion

| What | Frames | Amount |
|---|---|---|
| Rotation swing | 10 (9–32) | 6° (5–15°) |
| Move swing | 32 (32–65) | 22 px (14–42) |
| Scale swing | 29 (21–68) | big: 83 % (50–105 %) |

- **Emotion is the story**: surprised at "504", sad over a phone with no messages, irritated pinching his fingers, sleeping in offline mode ("Z Z Z"), proud with a newspaper.
- **Pose changes by replacement drawings** (12 of 16): the character switches between distinct drawings (turned away, arms crossed, curled up asleep); opacity is used for these instant switches (33).
- **Big scale moves** for the reveal: the magnifier fills with his face, the number "504" pops and grows, the list sheet unrolls.

## Easing

- Linear 42 %, Easy Ease 33 % of authored keys.

## Engine limits and what to do

- The core of Buddy is switching between drawn poses - needs extra drawings (or poses for morph). With a single SVG, play the emotion with the head (tilt, squash), the glasses and the props.
- Gradients (16 of 16) are carried; strokes (16 of 16) need outlining.

## Lessons

## User bans
