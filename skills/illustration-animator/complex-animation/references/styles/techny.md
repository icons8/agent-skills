# Techny

Measured on 34 Icons8 Techny animations (Lottie). Sizes are on the 1200×1200 canvas, durations in frames at 30 fps. "p-p" = peak to peak (the whole swing), "med" = median, ranges are p25–p75.

Techny is isometric objects without characters: devices with UI, money, documents, rockets, bulbs. The animation is a living still life: every object drifts and rocks slowly all the time, and small events happen on top of that. The motion is calm and soft, not rubbery. This file overrides `common.md` where they disagree (see "Differences from common.md").

## Format

- **30 fps**. Loop **120 frames (4 s)** in 21 of 34; the rest 100–240 (3.3–8 s), the longer ones for scenes with more events.
- **Something always moves**: none of the 34 has a still frame (the longest frame with no motion is 1 frame). No holds where everything stops.

## Base layer - the float cycle (32 of 34)

Every object lives on its own slow cycle for the whole loop:
- **Period = the whole loop** (two halves of 60 frames for a 120 loop), Easy Ease on every key.
- **Drift:** x p-p 24 px (16–38), y p-p 22 px (18–34). Large single objects (a bulb, a key) up to 60–90 px.
- **Rock:** rotation p-p 10° (7–15°), so ±5°.
- **x and y are offset by a quarter period** (median 84°): the object drifts along an oval, not just up and down.
- **Objects are out of phase with each other**: in scenes with several objects there are 2–5 different phases. Not everything moves in unison.
- The 3D volume "turns" in time with the rocking: a morph to a pose (see "Engine limits and what to do").

## Events on top of the cycle

Typical: a chart grows, a line or a checkmark draws itself, a screen changes, a letter goes into the envelope, the key turns. 30 event segments per loop (10–51).

| What | Frames | Amount |
|---|---|---|
| Move | 25 (9–40) | 30 px (16–68) |
| Turn | 25 (15–50) | 14° (8–22°) |
| Scale change (swell, UI) | 10 (1–20) | 10 % (4–15 %) |
| Line draw-on (trim) | 14–20 (6–30) | - |
| Fade in / out | 8–10 | 100 % |
| Instant state swap | 1 | - |

- **Appearance - not from scale 0.** Scale 0 → 100 is used once in 34. New elements fade in over 8–10 frames, draw themselves (lines, checkmarks, signatures - trim 14–20 frames), or swap instantly on a frame where the change is covered by the motion.
- **Swells are small**: 10 % (4–15 %), not 115–130 %. This number of the style outranks the swelling in `common.md` ("Smooth does not mean small"): measured Techny is a calm still life, a big swell breaks it. The other bans of `common.md` still apply.
- **Overshoot is rare**: about 2–3 per animation; when it is there, the return is ~23 % of the motion (23–47 %). No springs after every touch.
- Opacity is a normal tool here (11 of 34), unlike the other styles.

## Easing

- **Easy Ease `[0.33, 0, 0.67, 1]`** - the main curve: 63 % of all keys, ~92 % of the float cycles, about half of the events.
- **Linear** - 18 %: constant rotation (gears), scrolling maps, conveyors.
- The rest are custom handles; the most frequent: `[0.17, 0, 0.83, 1]`, `[0.78, 0, 0.83, 1]` (slow start, quick stop), `[0.66, 0, 0, 1]` (strong S: slow start, long soft finish).

## Engine limits and what to do

- **Fake 3D turn by path morph** - the main Techny technique, in all 34: as the object rocks, its side faces and extrusion change shape, as if the volume turns. The engine does it with a **pose** (`SCENE-FORMAT.md`, "Morph"): the designer draws the turned object as a second SVG (points moved, nothing added), the part gets `"morph"`, and its `m` keys follow the rock: turned most at the rock's extreme, back at rest. Keep `m` within about −0.25…1. No pose - no turn: don't imitate it with a flip (100 → 0 → −100 %), in isometry it looks broken; write "needs pose" in the story.
- **Live strokes** - all 34 use strokes (and 11 animate them with trim: draw-on). The engine takes only outlined shapes, so a draw-on of a line can't be reproduced; use a fade 8–10 frames or a growth by scale from the line's start.
- Gradient fills (28 of 34) and parenting (27 of 34) - the engine handles these.

## Differences from common.md (measured in this style: a hint; the bans and lessons of common.md and of this style still win)

- Floating and rocking is **the base**, not a ban: every object floats on the loop-long cycle, events go on top. A plot (action → reaction) is welcome on top of it, but a living still life with UI changes is a complete Techny animation.
- **No rubbery springs**: overshoot only on a rare large event, ≤ 25 %.
- **Appearance** - fade 8–10 frames or draw-on, not scale 0 → 100 with overshoot.
- **Easing** - Easy Ease `[0.33, 0, 0.67, 1]` instead of `soft` `[0.3, 0, 0.15, 1]`.
- **Loop** - 4 s (120 frames), without holds.

## Templates: starting parameters

- The engine's `float` and `sway` don't fit the cycle as is: they go from rest to one side and back (`sine`), with no phase shift. Techny swings to both sides around the rest pose, x and y a quarter period apart, each object in its own phase. Use custom keys `p` and `r`: extremes ±11 px (y), ±12 px (x), ±5° at the quarter points of the loop, passing the rest pose at speed (not stopping at it). Work out the exact keys on the first scene and add them here as a lesson.
- Different objects - different phases: shift their cycles by 15–30 frames.
- Rock + turn + oval drift that passes the key pose at frame 0 (tested on a coin): `m` and `r` - keys at 0 / 30 / 90 / 120 with the values 0 / extreme / opposite extreme / 0 and curves `[0.39, 0.575, 0.565, 1]` → `sine` → `[0.47, 0, 0.745, 0.715]` (they pass rest at speed); `p` - an oval through the rest point: keys every quarter of the loop with arc tangents and `constant: true`.
- Events: `move` `dur` 25, `turn` `dur` 25, ease Easy Ease `[0.33, 0, 0.67, 1]`; `pop` only as a small swell: `peak` 108–110, `under` 99.

## Lessons

## User bans
