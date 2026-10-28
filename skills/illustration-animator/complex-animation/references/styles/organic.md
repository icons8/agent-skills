# Organic

Measured on 10 Icons8 Organic animations with their source SVGs (Lottie). Sizes are on the 1200×1200 canvas, durations in frames at 30 fps, ranges are p25–p75; a "swing" is the motion between two turning points, measured frame by frame.

Organic is hand-drawn UI and concept icons: thick black brush outlines with flat light-green fills, no other colours, no background. Objects: speech bubbles, a satisfaction meter, a cloud with uploads, a paper plane, a magnifier over a report, a kanban board, a laptop with typing hands, a video call grid. People appear only as silhouettes or hands. The motion is a short, playful UI story.

## Format

- **30 fps** (10 of 10). Loop **4 s (120 frames)** typical; 3–6 s (6 s for scenes with a longer story: kanban, laptop).
- Never still.

## Motion

| What | Frames | Amount |
|---|---|---|
| Rotation swing | 13 (7–26) | 12° (7–21°) |
| Large rotation (≥ 15°) | 18 (11–36) | - |
| Move swing | 17 (6–53) | 27 px (14–53) |
| Scale swing | 8 (4–63) | 11 % (9–36 %) |

- **Pops from scale 0 are the main way in and out** (180 times, in 4 of 10): speech bubbles, dots, file icons, sparks pop in, live a moment and pop out.
- Small wobbles everywhere: icons tilt 7–20° back and forth in quick swings; a pointer or cursor moves in and clicks.
- **Morph in all 10**: brush shapes squash, stretch and wobble (a hand bending, a bubble tail, a plane's wings).
- Opacity is rare (13 fades, 10 instant swaps); replacement drawings in 2 of 10.
- Lines: strokes in 6, draw-on in 3 (speed lines, a cloud's arrow trail).

## Easing

- **Easy Ease `[0.33, 0, 0.67, 1]`** - 51 % of keys; linear only 5 %.

## Engine limits and what to do

- Black outlines are often live strokes - outline them before export.
- **Morph** (10 of 10) - needs a pose (`SCENE-FORMAT.md`, "Morph"); without one, use bend/squash on separate parts.
- Track mattes (6 of 10) - use `clipBy`/`maskBy` by the frame or window part.

## Differences from common.md (measured in this style: a hint; the bans and lessons of common.md and of this style still win)

- Elements pop in and out all the time; pops are the main appear/disappear tool (but remove symbols one by one, see Lessons).
- The measured files have no still frames; short holds of one element (as in the door ban below) are fine.
- The User bans below win over the measured numbers: the team asked for smooth motion (like Plain), so use the measured swings as a guide to amount, not to sharpness.

## Lessons

- Don't make a reaction and an action small and short (swell below ~115 %, shift under ~15 px, rotation under ~5°, peak shorter than ~6 frames) → make them bigger and longer, so the peak is visible in at least 2 frames out of 16 (otherwise the action doesn't read).
- Don't remove several symbols at once or at the loop seam → one by one with a step of 4–8 frames, the last one leaves before the seam, taking start into account (otherwise they go as a "bunch" and there is a jump at the seam).
- Don't fade symbols out with opacity → collapse them by scale: swell to 118–124 %, then 0 over 4–6 frames (opacity is almost not used in our animations).
- Don't let reactions pop up without a visible cause → the press or gesture first, large (arm rotation from the shoulder 10–20° with anticipation), the reactions after.
- Don't promise a change of brightness or color (the engine doesn't change them) → show the state by motion: drooped - squashed and tilted, lit up - hopped and swelled.
- Don't depict a step or a run of a figure whose legs are not separated from the body (one contour) → move it as a whole: poke out and hide, hop, tilt (otherwise "running on one leg").

## User bans

- Don't make sharp movements → smoothness like Plain (deceleration longer than acceleration, spring 13–38 frames).
- Don't open a door as an opening → the leaf with the handle turns around the hinge (squeeze in width toward the hinge).
- Don't start the blogger with all the icons → first the card where the person waves, then the other elements appear one by one.
- Don't give the truck starting off and braking → continuous driving in the loop.
- Don't make the door figure "run" on one leg and don't start with the door open → in the first frame of the loop the door is closed, then it opens, the figure pokes out, holds, hides, the door closes; the tempo is fast (twice as fast as the previous 94 frames).
- Don't give the brainstorm a story with a drooping lamp and synchronous movement of the parts → the lamp pulses separately from the bubble, the bubble "breathes" at its own rhythm, the dashes scale in turn clockwise; the phases of the parts are offset.
- Don't drag out the tempo of premium → faster, shorter loop, shorter movements (keep the smoothness).
- Don't have the blogger wave a hand once → the person waves continuously for the whole loop, the other elements appear in turn and at the end of the loop disappear in turn.
- Don't ring a phone sharply → softer, smoother, more rubbery: the impulses of the ring decay with a spring and long settling, no twitching.
