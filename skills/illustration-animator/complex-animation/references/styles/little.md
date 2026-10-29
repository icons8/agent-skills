# Little

The style has no rules of its own yet: work by common.md. fr 30, loop length per common.md "Smoothness" (a simple scene - 2 s).

Style rules:
- Time limits are hard: scenario 3 minutes, animation 7 minutes, judge 3 minutes (one round, advice), fixes of script findings 4 minutes (see common.md). Don't dig in, don't compare frame by frame.
- Affordance: a wheel rolls, a pen writes, a person in a walking pose walks.
- Move arms and legs at the joints, don't move them as a rigid piece: rotate the cut-off limb or its segment about the joint, bones (`bones.joints`, `bend`) only for a bend up to ~10°.
- Output is only Lottie JSON and MP4.

## Lessons
- A sheet or screen turned to the viewer with its back side: nothing appears on it - do not draw lines, words or text there (lines on the back of a sheet are a defect). The writing is carried by the tool and the hand, not by marks on the sheet.
- `svg-extra` never changes the layer order of the source. When the reason for a reorder is gone (the drawn-in words were removed), put the source SVG back; after every edit compare frame 0 and the layer order with the source (an object in the hand that sits above the hand in the source stays above it: the notepad over the writing hand).
- A hand with a tool (pencil, pen): rotate it about the centre of the wrist section, the angle within the overlap on the cuff (~4–6°, wrist ~160 px wide); a sleeve fused with the torso moves ≤ ~25 px, otherwise the seam parts - cut the shift down first, cut the part only after that. When the tip is hidden by an object, writing reads by the top of the tool: a series of tilts of 5–6° (smaller strokes do not read as writing).

## User bans
- Don't make "Speed up" a race of motion speeds → cut empty stretches and dead holds, shorten the loop.
- Don't move only the ball symbols (antennas, sparks) when a character is next to them → the character raises and lowers an arm, moves the head and torso, rubbery.
- Don't spin the center of an atom that stands still → only the orbits rotate and the electrons fly along the orbits.
- Don't leave some of the gears stationary → all of them turn, in counter-rotation.
- Don't levitate a character standing on the ground → pose on the support; for a ghost (it flies) - levitation up and down.
- Don't make an object carried by balloons jerk up and spring back (a tug, squash, bounce) → a smooth slow float: the bundle drifts up and down on sine, the hanging load sways like a pendulum with lag, the balloons sway one after another.
- Don't sway a standing figure from the feet (the legs rotate and bob, the whole body tilts) - it reads as drunk → feet planted, legs still, only the torso leans with the gesture, up to 2–3°.
- Don't walk a figure with rigid trouser legs by lifting one leg high and scissoring the other (reads as a cripple's limp) → the even step of rigid legs: both legs converge toward parallel and diverge back to the SVG pose, about ±6–10°, the back leg lifts a little on the pass, the body bounces gently; close a fill hole at the crotch with the figure's own fill at the very bottom.
- Don't make the letters on a held card, sign or plate jump one by one (a wave of bounces) - it is one rigid card → the hand turns the card a little, smooth and slow; the lettering stays fixed on it.
