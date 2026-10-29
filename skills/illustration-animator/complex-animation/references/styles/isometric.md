# Isometric

Measured on 20 Icons8 Isometric animations with their SVGs. Durations in frames at 30 fps, ranges p25–p75, motion measured per frame.

Isometric is crisp isometric line art in black outline, light grey, white and acid lime/green: factories and production lines, robots and AI, dashboards, cloud, servers, a potion cauldron, holiday decorations. Mechanical and systematic.

## Format

- 30 fps (one at 60). Loops **4 s** (14 of 20) or 6 s.
- Holds are common (5 of 20), long in decorative scenes (a lantern holds 78 % of the loop, a "2024" sign 17 %).

## Motion

| What | Frames | Amount |
|---|---|---|
| Rotation swing | 30 (15–46) | 14° (7–20°) |
| Move swing | 30 (12–67) | 20 px (8–42) |
| Large move (conveyors, robots) | 119 (42–141) | up to 140 px |

- **Linear, mechanical motion**: 77 % of authored keys are linear - conveyors move boxes at constant speed, robotic arms pick and place, gears and fans spin, a forklift lifts.
- UI panels update with fades (262 fades, 32 instant swaps): charts redraw, rings fill, an hourglass flips.
- Turns in isometric are faked by replacement drawings and morph (a "$" coin turning edge-on, a robot head turning) - 14 of 20 use swaps (up to 233).

## Easing

- **Linear 77 %**, Easy Ease 13 %.

## Engine limits and what to do

- Constant-speed conveyors and spins: `move`/`spin` with `constant: true`.
- 3D turns of isometric objects need poses (morph), like Techny.
- Strokes in all 20 - outline before export.

## Differences from common.md (measured in this style: a hint; the bans and lessons of common.md and of this style still win)

- Linear easing is the norm for machines and conveyors, not only for "uniform motion".

## Lessons

## User bans
