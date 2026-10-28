# Rough Sketch

The style has no rules of its own yet: work by common.md. fr 30, loop length per common.md "Smoothness" (a simple scene - 2 s).

Style rules:
- Time limits are hard: scenario 3 minutes, animation 7 minutes, judge 3 minutes (one round, advice), fixes of script findings 4 minutes (see common.md). Don't dig in, don't compare frame by frame.
- Affordance: a wheel rolls, a pen writes, a person in a walking pose walks.
- Output is only Lottie JSON and MP4.
- Bend arms at the joints (`bones.joints`, `bend`); legs in walking may be rigid pieces with masks ("joints don't have to bend").
- Walking references are the hiker and the skeleton; for masks and cutting off limbs - the hiker: `examples/rough-sketch/scenes/` (common.md, "Walking and overlaps").

## Lessons
- Don't pick the near leg by guess → the near one is the one whose line runs straight through at the junction while the other leg's line butts into it (T-junction); hide the far one under the near one's mask (`maskBy … out`), give the boot its own mask from the traced outline of the near boot (`maskBy.poly`), not from the convex hull - it eats the far leg's ankle (otherwise the far leg comes out to the foreground).
- Don't cross the legs in walking with fully rigid legs → swing ±14° from the SVG pose, the legs converge to parallel, don't go behind each other (a large amplitude hides the far leg entirely and tears the belt).
- Don't leave an object that rests on a swinging leg attached to the torso → attach it to the leg at the touch point (the leg's `parent`, pivot at the touch point) and subtract the leg's rotation from its own so the angle in the world doesn't change (otherwise there is a gap between the pole and the leg line).

## User bans
- Don't make "Speed up" a race of motion speeds → cut empty stretches and dead holds, shorten the loop.
- Don't move only the ball symbols (antennas, sparks) when a character is next to them → the character raises and lowers an arm, moves the head and torso, rubbery.
- Don't spin the center of an atom that stands still → only the orbits rotate and the electrons fly along the orbits.
- Don't leave some of the gears stationary → all of them turn, in counter-rotation.
- Don't levitate a character standing on the ground → pose on the support; for a ghost (it flies) - levitation up and down.
- Don't leave a raised arm detached from the torso (the torso side is gone, the underside of the arm ends in the air) → the torso side is intact, the underside of the arm meets it at the armpit.
- Don't merge two legs into one column with doubled or broken trouser lines → the legs always read as two, the trouser lines are intact; the far one hides under the near one's mask.
- Don't deform the body to make lines meet → the body and outline stay, the lines themselves are animated: brought to the junction.
- Don't take a grown line back by a reverse run, and don't let it "leave" from the other end → it leaves in the same direction it grew, tail first: `trim` start catches up with `end` (circuit lines of the brain grow from the brain to the dots, then run off into the dots), never back along the line.
- Don't read the offshoots of a character as limbs because of the file name, and don't hop or swing them like robot legs → decide the meaning from the picture: lines that end in dots are circuit traces and signals, they grow (`trim`), the folds of the brain move a little in time with them.
