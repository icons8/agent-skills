# Flexy


## Format

- **30 fps**, 1200×1200, loop 135–180 frames (4.5–6 s).

## Story

Work in an interface: a UI object changes state (scroll, checkmark, chart, highlight), the character accompanies it with small movements. 6–8 events per loop.
- Example: mouse click → the list scrolls with a kickback → a row appears, a checkmark is set → the ring chart redistributes; the head looks aside and back.
- Example: a pointing hand to the chart → the chart's arrow turns → head tilt; a cat in the arms turns its head, twitches an ear.

## Timing (frames at 30 fps)

| What | Frames |
|---|---|
| Movement (median) | 10–17 |
| Hold (median) | 14–19 |
| List scroll | 14 + kickback 7 |
| Head tilt | 15, hold 23, return 15 |
| Finger extension | 4–6 |
| Checkmark | 7–9 |
| Blink | 7 (2 closing + 5 opening) |

## Character

- Amplitudes are small (pixels on the 1200 canvas): head 2–10 px and 3–7°, torso ≤ 3° and ≤ 10 px. Large — only the UI scroll (~75 px), the pointing hand (up to ~58 px), running.
- No lag inside the head; secondary parts +2…+3 frames; strands +9…12.
- Earrings and pendants live on their own keys with 22–48 % overshoots.
- Background as part of the story: panels float 9–16 px with a period of the whole loop.

## Easing

- Easy Ease: `[0.33, 0, 0.67, 1]` — the main curve.
- Hard S-curve (chart, torso): `[0.72, 0, 0.28, 1]` and `[0.86, 0, 0.16, 1]`.
- Scroll: `[0.82, 0, 0.56, 1]`, kickback `[0.34, 0, 0.32, 1]`.
- Head tilt: `[0.34, 0, 0.02, 1]`.

## Templates: starting parameters

- `move` of a scroll: `dur` 14, kickback as a separate track of 7 frames over 10 % of the travel.
- `turn` of the head: `from` 0, `to` ±3…7, `dur` 15.
- `click` of a finger: `depth` 92, `down` 2, `up` 4.
- `float` of a panel: `amp` 9–16, period = loop.

## Lessons

## User bans
