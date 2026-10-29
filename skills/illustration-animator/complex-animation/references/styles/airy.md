# Airy

**Preliminary**: measured on only 2 Icons8 Airy animations with their SVGs. Treat the numbers as a first sketch until more files come in.

Airy is soft gradient illustration: a big terracotta hand holding an object (a % flag, a rocket), with translucent pastel droplets and flames around. The motion is a light, airy rock of the hand and the object, with particles floating off.

## Format

- 30 fps; loops 2 s and 3 s. Never still.

## Motion

- The hand and the object rock: swings of ~22 frames (21–23), ~13° (9–19°); the % flag waves.
- Droplets and particles drift far: 74–380 px over up to 3 s, fading and shrinking; the rocket's exhaust is a stream of particles made of many short layers (209 in a 2 s loop).
- Easing: Easy Ease `[0.33, 0, 0.67, 1]` on the cycles, plus `[0.33, 0, 0.83, 1]` and `[0.33, 0, 0.09, 1]`.

## Engine limits and what to do

- Gradients (both files) - the engine carries linear and radial gradients.
- Particle streams made of many short layers - no generator in the engine; use a few drops from the SVG that pop, drift up and collapse in turn.
- Path morph on the hand and flag (both files) - needs a pose.

## Lessons

## User bans
