# Active

Measured on 14 Icons8 Active animations with their source SVGs (Lottie). Sizes are on the 1200×1200 canvas, durations in frames at 30 fps, ranges are p25–p75. Rig keys are baked frame by frame, so motion was measured per frame ("swing" = motion between two turning points).

Active is bright, outlined characters in everyday situations: working at a laptop, presenting, jogging, a date, holding a cat, paying by card. Medium and full shots, often on a coloured blob. The animation is **character acting**: the body moves softly, the face changes expression, the hands gesture; a symbol (a bulb, a chat bubble, a heart, a pin) supports the beat.

## Format

- **30 fps**. Loops **3–6 s** (median ~4.5 s); a run cycle is 0.8 s.
- **Almost never still**: 12 of 14 move on every frame; the other two hold for at most 4 frames.

## Character motion

| What | Frames | Amount |
|---|---|---|
| Rotation swing (head, arm, torso) | 14 (8–22) | 9° (5–17°) |
| Move swing | 28 (12–45) | 11 px (6–18) |
| Scale swing | 8 (8–33) | 20 % (9–39 %) |

- **Facial acting by path morph** in all 14 (hundreds of shape keys per animation): blinks, smiles, mouth shapes, eyebrows, a wink. The face is alive the whole time.
- The body moves softly and continuously (breathing, weight shifts, small head turns); the gestures are bigger: an arm up with a pointing finger, a hand to the face.
- Replacement drawings for some hands and poses (9 of 14, a few to ~70 per loop).
- Symbols support the beat: a bulb pops when she gets the idea, a bubble with a check appears in the support chat, a heart pops on the date. Pops from 0 are rare (4 times), short (5 frames) and big (peak ~135 %).
- Opacity only as instant switches (26), no fades.

## Easing

- Authored keys mostly Easy Ease `[0.33, 0, 0.67, 1]`; the body motion comes baked from rigs.

## Engine limits and what to do

- **Facial expressions** (morph in all 14) - the core of the style. The engine changes a face only with a pose (`SCENE-FORMAT.md`, "Morph"): a second SVG with the face changed (eyes closed, smile). Without poses - no acting: blink by scaling the eye vertically (`common.md`), keep the face as drawn.
- **Strokes** (14 of 14): outline before export.
- Soft body motion with small amplitudes (9°, 11 px) fits a cut with a pinned seam well (`common.md`, "Fused parts").

## Differences from common.md (measured in this style: a hint; the bans and lessons of common.md and of this style still win)

- Constant soft motion of the whole character, no full holds.
- Amplitudes of the body are modest (9° rotations, 11 px moves); the life comes from the face and the hands, not from big jumps.

## Lessons

## User bans
