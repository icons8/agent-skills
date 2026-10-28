# Bendy

Measured on 30 Icons8 Bendy animations with their SVGs. Durations in frames at 30 fps, ranges p25–p75, motion measured per frame.

Bendy is monoline illustration: thin navy outlines, white fills, coral-red and navy accents. Two kinds of scene: **big hands working with a device** (a phone, a tablet, a card, a calculator) and **people with bendy, hose-like limbs** at work (calls, coding, presentations, parties). The animation is a clear interaction story told by the hands.

## Format

- 30 fps (one at 60). Loops **4–5.5 s** (from 2.3 to 8.3 s).
- Mostly continuous motion, but short holds exist (6 of 30 have still frames, up to 12 % of the loop) - the pause after a completed action.

## Motion

| What | Frames | Amount |
|---|---|---|
| Rotation swing (hand, arm, head) | 15 (8–31) | 8° (5–17°) |
| Move swing | 45 (13–81) | 22 px (12–53) |
| Scale swing | 35 (11–82) | 20 % (10–68 %) |

- **Bendy limbs**: arms bend as smooth curves (path morph in 30 of 30), not on stiff joints; the hands reach, tap, swipe and point.
- **Interaction stories**: a finger touches the fingerprint sensor → the print scans → a check pops; a hand drags a card to the basket → a check; a finger rates a product → the face goes from happy to sad and back; a pen draws a logo on a tablet.
- Results appear by a pop from 0 (28 times in 12 of 30) or a fade (48); lines and routes draw themselves (16 of 30).
- Some replacement drawings (16 of 30, up to 36).

## Easing

- Linear 47 % of authored keys (path morph steps, drawing lines), Easy Ease `[0.33, 0, 0.67, 1]` 35 %.

## Engine limits and what to do

- Bendy limbs: the engine's bones bend a cut arm smoothly (`bend` with several joints) - a good match, keep the bend soft with lag.
- Strokes in all 30 - outline before export. Draw-on lines - not possible; use a pop or a fade.

## Lessons

## User bans
