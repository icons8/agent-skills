# Notion Line Art


## Format

- **24 fps**, 1200×1200, loop 28–144 frames (1.2–6 s), usually ≈73 frames (≈3 s).
- The illustration's pose is often in the middle of the loop: set `start`.

## Story

One clear action of the character by the illustration's title, played as a small scene, plus an animated symbol.
- Scene: 4–6 beats, holds, a reverse run; palindrome or A–A–B (the bar twice, then the climax).
- Cycle: walking in place, swaying to music — without holds.
- Examples: adjusts glasses → a star flashes → smiles → lowers the hand; nods off → Zs float up → falls asleep → startles; makes a heart with the hands → the heart flies away → four hops → the heart back.

## Timing (frames at 24 fps)

| What | Frames |
|---|---|
| Elementary bone movement | 4–11 |
| Gesture (hand to face, wave) | 8–18 |
| Slow tilt | 20–23 |
| Torso turn | 24 |
| Hop | 6 (3 up, 3 down) |
| Symbol appearing by scale | 2–6 |
| Hold (the body fully still) | 3–11, usually 4–7 |

## Character

- Almost everything by bones: arms, legs, torso, head bend at the joints (`bones`, template `bend`).
- Lag 1–2 frames per level, the end of the chain finishes up to +6 frames later. Strands and fingers as a ladder +1–2.
- Overshoot in everything large: 17–32 % of the amplitude, settle 2–5 frames.
- Amplitudes are large: torso 4–19°, head 4–35°, arms up to 130°, forearms up to ±250°. Body shift 40–110 px. Squash and stretch ≤ 8–13 %.
- Symbols: scale 0 ↔ 100 % with 5–7 % overshoot, drift 100–160 px, swing ±7–20°.
- On holds the body is still. Only symbols and cycles move continuously.

## Easing

- Main curve (smooth): `[0.33, 0, 0.67, 1]`.
- Bezier with flat handles ≈0.3: `[0.3, 0, 0.7, 1]`.
- Heaviness (fatigue, falling): `in` or `[0.55, 0, 0.8, 0.6]`.
- Hands and fingers on a swing: `out` — only as a continuation of the arm swing (the hand starts when the arm is already moving); from rest — `soft`.
- `lin` — only for a uniform pass through a frame.

## Templates: starting parameters

- `bend` of an arm: `dur` 8–18, `lag` 1–2 — each next bone starts `lag` frames later (lag along the chain). Another way — the hand as a separate part with `parent` and its own `r` track 1–2 frames later. Own `bend` keys with an intermediate key in the middle of the motion stop the bone — don't do that.
- `pop` of a symbol: `peak` 105–107, `under` 98, `dur` 6–8.
- `appear`: `dur` 3–6. `disappear`: `dur` 4–5.
- `bounce` (hop): `height` 25–30, `dur` 6.
- `turn` of the head: `dur` 8–10, overshoot as a separate key 20–30 %.

## Lessons

## User bans
