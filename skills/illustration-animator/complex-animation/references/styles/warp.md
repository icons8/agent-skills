# Warp

Measured on 21 Icons8 Warp animations with their source SVGs (Lottie). Sizes are on the 1200×1200 canvas, durations in frames at 30 fps, ranges are p25–p75; a "swing" is the motion between two turning points, measured frame by frame.

Warp is people made of thick, flat, bent tubes: arms and legs are long angular strips with a knee or elbow corner, big hands and shoes, tiny heads. Bright flat colours (orange-red, green, blue, yellow, pink), no outlines, no background. Subjects are sports and hobbies: skating, hockey, skateboarding, BMX, basketball, tennis, drums, guitar, saxophone, DJ, shopping, a scooter. 21 of 21 are a single character in full-body action.

## Format

- **30 fps** (19 of 21), also 60 (2). Loops **very short: 0.7–4 s**, median ~2.3 s (a run or a drum beat is under 1.5 s).
- Never still.

## Motion

| What | Frames | Amount |
|---|---|---|
| Rotation swing | 8 (5–14) | 17° (8–36°) |
| Large rotation (≥ 15°) | 10 (6–16) | up to 56° and more |
| Move swing | 10 (7–20) | 24 px (12–58) |
| Scale swing | 10 (7–20) | 15 % (10–30 %) |

- **Fast, big, exaggerated full-body cycles**: a run, a skate stride, a drum hit, a guitar jump; limbs swing wide and the whole body bounces.
- **Limbs bend by path animation** (morph in 21 of 21, strokes in 20): an arm or leg is one thick bent strip whose corner moves; there are almost no replacement drawings (3 of 21, 1 swap) and almost no opacity.
- Props fly with the body: a ball bounces, a racket swings, flyers fan out, a tennis ball zooms into the camera.

## Easing

- **Linear - 57 % of keys** (dense keys on the path points); Easy Ease 16 %.

## Engine limits and what to do

- **Tube limbs are live thick strokes animated by path** - the engine can't take strokes or animate path points without a pose. Outline the strokes and either (a) cut limbs into upper and lower parts as separate shapes and rotate them, or (b) draw a pose with the bent limb (`SCENE-FORMAT.md`, "Morph") and blend to it.
- Large swings (17°+ typical, 50°+ often) - only on separate parts; a cut fused limb bends cleanly only ~15–20° (`common.md`, "Fused parts").

## Differences from common.md (measured in this style: a hint; the bans and lessons of common.md and of this style still win)

- Very short loops (1–2.5 s) and fast swings (8–10 frames) with big angles: energetic cycles are the style, not jerky.
- Linear keys are fine for continuous cycles.

## Lessons

## User bans
