# 8bit

Measured on 12 Icons8 8bit animations with their source SVGs (Lottie). Sizes are on the 1200×1200 canvas, durations in frames at 30 fps, ranges are p25–p75. Rig keys are baked frame by frame in these files, so motion was measured per frame: a "swing" is the motion between two turning points of a property.

8bit is a flat character in big, energetic full-body motion (a dance, a jump, a spin, a run, skating, climbing stairs) with pixel-art icons around her: a heart, a star, a coin, a gift, a gamepad. 11 of 12 have a character. Compared with Techny, the motion is fast and large.

## Format

- **30 fps** (11 of 12). Loop **2 s (60 frames) or 4 s (120)**; also 6 s (180) for scenes with a longer story, and 1.5 s (44) for a single jump.
- **Never still**: every frame of every animation changes; there are no holds where everything stops.
- **The SVG pose can be anywhere in the loop**: only 4 of 12 have it near the start; in the rest it sits from a fifth to nine tenths of the way through, often at the peak, where all the symbols are out. Use `start`.

## Character motion

| What | Frames | Amount |
|---|---|---|
| Rotation swing (limb, torso, head) | 8 (4–28) | 24° (9–63°) |
| Large rotation swing (≥ 15°) | 10 (5–30) | up to 130° and more on arms and legs |
| Vertical move swing | 11 (5–37) | 42 px (12–131) |
| Large vertical move (≥ 40 px: a jump, a step up) | 13 (6–36) | up to 340 px |

- The whole body works: arms swing far, legs kick, the torso bends and the head follows. It is a full-body performance, not a gesture.
- **Turns and pose changes are done with replacement drawings**: whole drawings of a limb, a head or the whole figure are swapped on and off (10 of 12; median ~6 swaps per second, up to 40–80 in a spin or a run). Opacity is used for these swaps (118 instant switches against 16 fades), not for fading.
- Squash & stretch is rare (2 of 12).

## Symbols (pixel icons)

- They bob and rock slowly around the character, like the Techny cycle (54 layers in 9 of 12): period = the loop, Easy Ease, rock p-p 12° (5–18°), drift p-p 16–32 px, in different phases (2–8 per scene).
- Appearance from scale 0 - sometimes (4 of 12): about 5 frames, peak 100–110 %.

## Easing

- The authored keys are mostly **Easy Ease `[0.33, 0, 0.67, 1]`**. Character motion comes baked from a rig (a key every frame), so its curves are the rig's.

## Engine limits and what to do

- **Replacement drawings** (a turn of the head or the body, a hand in a new pose) - the main 8bit technique. The SVG has only one drawing, so the engine can't swap to another. Without extra drawings, don't promise turns and spins in the story; build it from bends, jumps and steps.
- **Large limb swings** (24° typical, 60°+ often) go beyond what a cut with a pinned seam bends cleanly (~15–20°, `common.md`, "Fused parts"). Bend arms and legs fully only where they are separate parts in the SVG; otherwise keep the swing within the limit and make the body move (jump, bounce, lean) to carry the energy.
- Strokes (12 of 12) and path morph (12 of 12) are used here too: outline the strokes before export; for a morph, draw a pose (`SCENE-FORMAT.md`, "Morph").

## Differences from common.md (measured in this style: a hint; the bans and lessons of common.md and of this style still win)

- **No holds**: something moves on every frame; the character keeps performing through the whole loop.
- **Large and fast**: swings of 8–13 frames with 20–60° rotations and 40–130 px moves are normal, not jerky.
- Opacity is used for instant swaps of drawings, not for fades.

## Lessons

## User bans
