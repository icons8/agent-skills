# Abstract

Measured on 46 Icons8 Abstract animations with their source SVGs (Lottie). Sizes are on the 1200×1200 canvas; durations are converted to frames at 30 fps (at 24 fps multiply by 0.8). Ranges are p25–p75; a "swing" is the motion between two turning points, measured frame by frame.

Abstract is a composition on a coloured card: soft blob shapes in the background, outlined flat objects in a pastel palette (yellow, pink, mint, periwinkle) with black lines. The objects are UI and concepts: browser windows, cursors, coins, hands, a bulb, a gift, a camera, a smiling face. Few characters; when there is one, it is a hand, an animal or a face-emoji. The motion is a short, lively UI-like story.

## Format

- **24 fps** (26 of 46) or **30 fps** (20). Loops are short: **2–4 s**, median 2.9 s (from 1.2 to 6.2 s). Typical: 96 frames at 24 fps, 60 at 30 fps.
- **Never still**: only 1 of 46 has any frame without motion.
- Almost everything sits inside the card: content is cut by a track matte of the card or a window (45 of 46).

## Motion

| What | Frames (at 30 fps) | Amount |
|---|---|---|
| Rotation swing | 22 (10–44) | 12° (6–23°) |
| Move swing | 30 (15–59) | 36 px (15–104) |
| Large move (≥ 40 px: a window slides, a coin flies) | 48 (22–65) | up to 350 px |
| Scale swing | 24 (12–42) | 20 % (10–36 %) |

- **The background lives**: blob shapes slowly change shape (path morph, 45 of 46) and drift; 220 layers in 40 animations run a slow cycle with period = the loop.
- **Appearance - pop from scale 0** (18 of 46, 148 times): 10 frames (4–15), peak 110 % (100–120 %); **disappearance** - to 0 in 6 frames (6–8).
- **Quick fades are normal here**: 838 fades of about 6 frames (5 at 24 fps), plus 218 instant switches. Unlike Plain-family styles, opacity is a working tool.
- **Lines draw themselves** (trim paths in 42 of 46): 15 frames (8–22) for a full line - doodles, arrows, chart lines, squiggles.
- Squash & stretch - sometimes (8 of 46).

## Story

- UI micro-stories: a cursor flies in and clicks, a window answers; windows shuffle and stack; a chart grows; a message bubble appears with dots; a coin flips in a hand; a lid opens.
- Small decorative elements - dots, stars, squiggles, sparkles - pop and draw around the main objects all the time.
- The source SVG pose can be anywhere in the loop (14 of 46 near the start); use `start`.

## Easing

- **Easy Ease `[0.33, 0, 0.67, 1]`** - 47 % of keys; linear - 17 %. Frequent custom: `[0.24, 0, 0.58, 1]`, `[0.17, 0, 0.83, 1]`.

## Engine limits and what to do

- **Strokes and draw-on lines** (45 and 42 of 46) - the main decorative technique. The engine needs outlined strokes and can't draw a line on; replace with a pop or a quick fade (6 frames).
- **Track mattes of the card** - the engine has masks (`clipBy`, `maskBy`); clip the moving content by the card or window part.
- **Background blob morph** - needs a pose (`SCENE-FORMAT.md`, "Morph"); without one, let the blobs drift and rock slightly.

## Differences from common.md (measured in this style: a hint; the bans and lessons of common.md and of this style still win)

- Short loops (2–4 s) and constant motion, no holds.
- Opacity fades of ~6 frames are allowed and common.
- Pops from 0 go up to 110–120 %, and decorative elements appear and disappear all the time, not one at a time.

## Lessons

## User bans
