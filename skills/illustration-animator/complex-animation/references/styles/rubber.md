# Rubber

Measured on 9 Icons8 Rubber animations with their source SVGs (Lottie). Sizes are on the 1200×1200 canvas, durations in the table are in frames at 30 fps (at 24 fps multiply by 0.8), ranges are p25–p75; a "swing" is the motion between two turning points, measured frame by frame.

Rubber is the 1930s rubber-hose cartoon look: characters with noodle arms and legs, pie-cut eyes, white gloves, big shoes, drawn in black and golden-orange only, with pale cream city or room silhouettes behind. Subjects: a businessman whistling on his way to work, a courier on a kick scooter, a gangster with a cigar, a girl with a party horn, a man with a radio, a band, a racer in a vintage car. 9 of 9 have characters.

## Format

- **24 fps** (9 of 9). Loops **short: 1–2.7 s** (median 2 s; 48 frames in 3 of 9).
- Never still.

## Motion

| What | Frames (at 30 fps) | Amount |
|---|---|---|
| Rotation swing | 11 (8–20) | 14° (7–34°) |
| Move swing | 10 (6–16) | 15 px (9–72) |
| Scale swing | 20 (19–29) | 16 % (10–25 %) |

- **Bouncy rhythmic cycles**: the classic rubber-hose bounce - the whole body bobs up and down on every beat, head and hat bob, a walk with springy steps, arms wave like noodles.
- **Noodle limbs bend by path animation** (morph in 9 of 9, strokes in 9): arms and legs are curved hoses whose shape changes, not rotated segments.
- Small cartoon accents: music notes, smoke rings from a cigar, puffs of dust behind the scooter, radio waves, a glow behind the character.
- Replacement drawings rare (2 of 9); fades 13, instant 5.

## Easing

- **Linear - 45 %** (dense keys on hoses), Easy Ease 38 %.

## Engine limits and what to do

- **Hose limbs are live strokes animated by path** - outline them; then bend with `bend` on a hose part with bones, or draw a pose with the hose curved the other way (`SCENE-FORMAT.md`, "Morph").
- Background silhouettes - keep still or drift slightly.

## Differences from common.md (measured in this style: a hint; the bans and lessons of common.md and of this style still win)

- Constant on-beat bounce of the whole body through the loop (a bob every 12–24 frames at 24 fps); short loops of 2 s.
- Squash & stretch on the bounce is welcome (scale 10–25 %).

## Lessons

## User bans
