# Rough Sketch

The style has no rules of its own yet: work by common.md. fr 30, loop 3–5 s.

Style rules:
- Time limits are hard: scenario 3 minutes, animation 7 minutes, judge 3 minutes, fixes after the judge 4 minutes (see common.md). Don't dig in, don't compare frame by frame.
- Affordance: a wheel rolls, a pen writes, a person in a walking pose walks.
- Output is only Lottie JSON and MP4.
- Bend arms at the joints (`bones.joints`, `bend`); legs in walking may be rigid pieces with masks ("joints don't have to bend").
- Walking references are the hiker and the skeleton; for masks and cutting off limbs — the hiker: `examples/rough-sketch/scenes/` (common.md, "Walking and overlaps").

## Lessons

## User bans
- Don't make "Speed up" a race of motion speeds → cut empty stretches and dead holds, shorten the loop.
- Don't move only the ball symbols (antennas, sparks) when a character is next to them → the character raises and lowers an arm, moves the head and torso, rubbery.
- Don't spin the center of an atom that stands still → only the orbits rotate and the electrons fly along the orbits.
- Don't leave some of the gears stationary → all of them turn, in counter-rotation.
- Don't levitate a character standing on the ground → pose on the support; for a ghost (it flies) — levitation up and down.
- Don't leave a raised arm detached from the torso (the torso side is gone, the underside of the arm ends in the air) → the torso side is intact, the underside of the arm meets it at the armpit.
- Don't merge two legs into one column with doubled or broken trouser lines → the legs always read as two, the trouser lines are intact; the far one hides under the near one's mask.
- Don't deform the body to make lines meet → the body and outline stay, the lines themselves are animated: brought to the junction.
