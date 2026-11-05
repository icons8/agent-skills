# Orange

Preliminary: measured on 1 Icons8 Orange animation with its source SVG (Lottie). Treat the numbers as a hint, not a rule; refine when more files arrive.

Orange is a single object in a hand, drawn in flat peach skin tones with one strong accent colour (orange-red), white details, no outline. The sample: a small rocket lifts off from an open palm.

## Format

- **30 fps**, loop **2 s (60 frames)**. Never still.

## Motion

- Rotation swings about 27 frames at ~15°; moves large (median ~280 px on the 1200 canvas - the rocket flies out of the hand).
- **Fades are the main tool** (126 fades, 16 pops): exhaust puffs and a smoke trail fade in and out under the rocket.
- Replacement drawings - many (up to 160 swaps): the hand changes pose as it pushes the rocket up.
- Linear easing dominates (83 % of keys): mostly baked, frame-by-frame motion.

## Engine limits and what to do

- The hand's pose changes are replacement drawings - the engine can't swap them; let the hand lift and tilt slightly instead.
- Smoke puffs: pop + fade on separate parts, staggered.

## Lessons

## User bans
