# Plain


## Format

- **30 fps**, 1200×1200, loop 85–180 frames (2.8–6 s), usually ≈105 (3.5 s).
- Event elements ("?", speech bubbles, a paper plane) are hidden at the start of the loop and pop up along the way: set `start` so that the loop begins before they appear.

## Story

One loop is one mini-story with a return to the initial pose, 3–10 beats. Typical ones:
1. An object-character with an emotion: searching → not finding → upset → hid → popped out.
2. A hand and an interface: pulled → released → returned (a toggle, the top of a letter).
3. A person in an everyday scene: calm swaying and 1–2 events on top of it (a message bubble, a smiley, a paper plane "post sent").

## Timing (frames at 30 fps)

| What | Frames |
|---|---|
| Pop-in | 5–6 |
| Pop-out | 4–6 |
| Sharp character action | 5–6 |
| Head turn or tilt | 8–12 |
| Drag over 230–460 px | 27–34 |
| Spring settle | 13–38 |
| "Holding" an action (drinking) | ~27 |
| Hold (only for a scene character) | 11–15 |

## Character

- Almost always something is moving. Real holds — only for a scene character.
- The character's body may sway during pauses — it is part of the story, not a violation.
- Moves are large: character 60–475 px, UI drag 230–460 px.
- Pop-in with overshoot +3…+6 % (up to +18 % for a small one), settle 2–5 frames; swell +24 % before disappearing.
- Spring: the swing is 0.3–0.4 times smaller per half-period of 4.5–8 frames.
- Anticipation before a large move: 7–90 px in the opposite direction.
- Lag: an accompanying element 1 frame; height swinging 3 and 4–7 frames; environment reaction 1–9 frames; UI under a finger reaches the stop 4–6 frames earlier than the hand.
- Background as part of the story: body sway 12–33 px with a period of 34–36 frames, floating ±5–10 px, group tilt ~6.6°. Background cycles are multiples of the loop (`float`, `sway`).

## Easing

- Acceleration shorter than deceleration: `[0.3, 0, 0.15, 1]`.
- Dive — pure acceleration `in`; surfacing — `soft` from rest and a spring (`spring` with `v0` of the incoming motion).
- Background — `sine`.
- Dragging by the hand — almost uniform: `[0.2, 0, 0.8, 1]`.

## Templates: starting parameters

- `pop`: `peak` 104–106, `under` 98, `dur` 8–10 (pop-in 5–6 + settle).
- `appear`: `dur` 5–6. `disappear`: `dur` 4–6.
- `slide` (toggle): `dur` 30, `overshoot` 0.04.
- `click`: `depth` 88–92, `down` 3, `up` 5.
- `float`: `amp` 5–10, period a multiple of the loop. `sway`: `angle` 3–7.

## Lessons

## User bans
