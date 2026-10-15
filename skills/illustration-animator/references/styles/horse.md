# Horse

The style has no rules of its own yet: work by common.md, keep the character of motion the same across the whole batch. fr 30, loop 3–5 s.

## Lessons

- Don't make the horse's step short (op 32–34, leg swing ~8 frames) → op 44–48, swing of each leg 14–18 frames, the leg lift-offs spread by ~¼ of the cycle in 4 beats (otherwise the judge sees a mincing trot or a pace).
- Don't count a step as done while the hoof only goes onto its toe and slides → in the swing each hoof rises 35–55 px and the knee/hock visibly bend; check the lift by frames, not by keys (otherwise a "skater").
- Don't bend a leg fused with the body by a chain from the hip at the croup → fixed root bones along the croup and the back of the thigh, the hip joint lower, the leg's forward reach smaller (otherwise the croup vanishes, the leg stretches like a "noodle" from under the tail).
- Don't bend flat geometric legs with bones → rigid hinges: the top of the leg is a part with a bone, the bottom and the hoof through `attach` with their own `r`, the hinge inside the overlap zone of the pieces (otherwise the facets break, the hooves come off).
- A walk cycle with a seamless seam — keys on every frame from a generator script (`lin` + `constant: true`), the generators are in `styles/horse/walk-gen/`.
- Don't make the head nod small (about 5°) → 12° or more, the mane follows with a lag of 3 frames and overshoot (otherwise the nod and the mane don't read).

## User bans
