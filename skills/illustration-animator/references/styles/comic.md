# Comic


## Format

- **30 fps**, 1200×1200, loop **90 frames (3 s)**.
- The first frame is the rest pose (`start` is usually 0).
- Line boil (as in the original) is not done.

## Story

An emotional reaction of a character, a short gag with a return to the initial pose: pondering and an "epiphany"; fear and hiding ("peekaboo"). 4–7 beats.
- Example: a finger at the chin taps → "idea", finger up, squat → hand back to the face → settle.
- Example: peeks out → wind-up → dive into the pumpkin, the lid falls and trembles → fingers catch the edge → peeks out, eyes dart.

## Timing (frames at 30 fps)

| What | Frames |
|---|---|
| Main poses | every 20–30 |
| Small keys, jerks | 2–9 |
| Dive | ~7 (acceleration) |
| Hold ("moving": 5 more frames of drift) | 13–20 |
| Blink | 4–6 |
| Eyes darting | move 6–9, hold 3–11 |

## Character

- Rotations 3–41°, for leaves and ghosts up to 160°; positions 22–120 px, dive up to 344 px.
- Lag 1–5 frames by hierarchy; secondary parts trail by 1–3 frames and swing 1.5–2 times more. Fingers in a cascade, 1 frame each.
- Overshoot as a separate key rolls back 16–50 % over 2–7 frames.
- Holds are "moving": after the pose, ~5 more frames of drift in the same direction, then stop. For Comic this is allowed and expected.
- Trembling (fear) — by keys: ±7 px and ±2° switching every 2 frames.

## Easing

- Main curve — fast start, long settle: `[0.34, 0, 0.15, 1]`.
- Body, pupils: `[0.34, 0, 0.06, 1]`.
- Fall, dive: `[0.84, 0, 0.76, 1]` (slow start, fast end).
- Fingers: `[0.33, 0, 0.67, 1]`.

## Templates: starting parameters

- `turn` of a hand, head: `dur` 20, overshoot as a separate key 16–20 %.
- `pop`: `peak` 115–120, `under` 92, `dur` 8.
- `click` (tapping): `down` 4, `up` 4–8, damped oscillations as separate keys.

## Lessons

- Don't make the hold between main poses shorter than 13 frames → starting hold 16 frames, the middle of the 13–20 range (three fast runs in a row had a median of 6.5 → 9 → 12.5, below the range; became 16). 2026-10-05, scene comic-man-hiding-from-ghosts-in-halloween-pumpkin, source: eval

## User bans
