# Retro

Measured on 8 Icons8 Retro animations with their source SVGs (Lottie). Sizes are on the 1200×1200 canvas, durations in frames at 30 fps, ranges are p25–p75; a "swing" is the motion between two turning points, measured frame by frame.

Retro is 90s nostalgia objects as a still life: a flip phone, a brick phone, a Nokia 3310, a cassette with a pencil, a lava lamp, a beige PC with Windows, a Tetris console, a reel-to-reel recorder with a disco ball, a Rubik's cube, a magic 8-ball. Soft volume with flat shading and thin dark outlines, small pixel-art doodles (a duck, a heart, a smiley, notes) and yellow sparkles around. No characters.

## Format

- **30 fps**. Loops **long: 4.5–8.7 s** (median ~6 s); one 2 s loop (the cassette).
- Never fully still.

## Motion

| What | Frames | Amount |
|---|---|---|
| Rotation swing (slow rock) | 92 (60–120) | 15° (5–31°) |
| Move swing (slow drift) | 119 (80–126) | 22 px (10–43) |
| Scale swing (sparkles twinkling) | 58 (30–75) | 0 ↔ 100 % |

- **Very slow float**: the objects rock and drift over 3–4 s per swing, like floating in space.
- **3D turns by morph** (8 of 8): the cassette flips over, the phone turns, the console twists, the Rubik's cube rotates - the volume changes shape as it turns.
- **Sparkles twinkle**: yellow stars grow from 0 and shrink back slowly (~2 s), in turn, around the objects.
- Little events: the lava blobs float, the 8-ball window changes, the PC cursor moves, music notes bounce, the disco ball spins.
- Fades 48, instant 11, replacement drawings in 5 of 8.

## Easing

- **Linear - 76 %** (dense keys of the 3D turns), Easy Ease 19 %.

## Engine limits and what to do

- **3D turns** - need poses (`SCENE-FORMAT.md`, "Morph"); without them keep each object facing the same way and rock it gently (≤ 10°).
- Sparkles twinkling by scale from 0 - the engine does this well; give each sparkle its own phase.
- Lava lamp blobs - morph; without a pose, move the blob parts up and down slowly inside the lamp (`clipBy` the glass).
- Outlines are live strokes (8 of 8) - outline before export.

## Differences from common.md (measured in this style: a hint; the bans and lessons of common.md and of this style still win)

- Very slow, long swings (3–4 s) and long loops (6–8 s); no quick events, no overshoot.

## Lessons

## User bans
