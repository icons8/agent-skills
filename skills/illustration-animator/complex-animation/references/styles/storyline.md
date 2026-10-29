# Storyline

Measured on 15 Icons8 Storyline animations with their source SVGs (Lottie). Sizes are on the 1200×1200 canvas, durations in frames at 30 fps, ranges are p25–p75; a "swing" is the motion between two turning points, measured frame by frame.

Storyline is monochrome isometric still lifes: one hue per scene (teal-green, blue, cyan, violet) in many tones, with thin white or light lines; a desk or table with devices - laptops, phones, a smart speaker, a microphone, VR goggles, a smart house model - plus floating UI windows. No characters. The motion is a calm "screens are alive" still life: things glow, blink, scroll and pulse; objects barely move.

## Format

- **30 fps** (14 of 15), also 60 (1). Loops **long: 5 s** typical (4–8 s).
- Still frames happen (up to 20 %, one scene 45 %): it is a quiet style.

## Motion

| What | Frames | Amount |
|---|---|---|
| Rotation swing (a knob, a camera, a cat's tail) | 37 (25–53) | 5° (3–10°) |
| Move swing (a window drifts, a slider moves) | 60 (36–84) | 18 px (7–57) |
| Scale pulse | 3 | 6 % (flicker) |

- **Screen life is the story**: sound waves pulse, charts redraw, sliders and gauges move, icons light up on a smart-home panel, timers tick, a message bubble appears.
- **Lots of opacity**: 419 fades and 75 instant switches; light flickers, screens switch states, glows breathe. Replacement drawings in all 15 (thousands of tiny swaps in some - flicker frames).
- Lines draw themselves in 11 of 15 (chart lines, cables, waves).
- Few pops (15 in 3).

## Easing

- **Easy Ease `[0.33, 0, 0.67, 1]`** - 50 %; linear - 31 % (flicker and scrolling).

## Engine limits and what to do

- **Opacity flicker and state switches** - fades are normal in this style; switch screen states by fading between parts only if both states are separate parts in the SVG, otherwise show the change by small scale pulses (3–6 %).
- **Draw-on lines** - replace with a mask wipe or a scale growth from the start.
- Strokes (15 of 15) - outline before export; mattes of screens (15 of 15) - `clipBy` by the screen part.
- Keep object motion minimal: ≤ 5° rocks and slow 2 s drifts of the floating windows.

## Differences from common.md (measured in this style: a hint; the bans and lessons of common.md and of this style still win)

- Long, quiet loops (5 s) with holds; the action is in the screens, not the objects.

## Lessons

## User bans
