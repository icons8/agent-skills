# Art director's principles

Learned from an art director's reviews. They override defaults in SKILL.md and motion-recipes.md.

These are principles, not fixes for particular pictures. Each review comment was about one
illustration, but the point behind it applies to anything you will animate: a person, a
device, a plant, an icon, a scene. For every new illustration, run the **analysis pass**
below first, then plan the story so the answers are visible in the motion, then check the
finished loop against every principle.

## Analysis pass (do this for every illustration, before planning)

Look at the labelled render and answer in a few words each - write the answers into your plan:

1. **Depth.** Which parts overlap which? What is in front? Will anything I move pass behind
   something drawn in front of it (even an outline with no fill)? → Principle 1
2. **Controls and cause.** What on this object can be operated or triggered - buttons, switches,
   levers, handles, lids, screens, keys, strings, a hand that could press something? What would
   make the story happen, and what would end it? → Principle 2
3. **Drivers and passengers.** What part leads the motion, and what is attached to it? Order them
   from the driver outward (body → arm → hand → held object; vehicle → wheel; stem → leaf). → Principle 3
4. **Loose things.** What hangs, dangles, flaps or is springy - clappers, straps, cables, hair,
   ears, tails, tags, antennae, leaves, cloth ends? Where is each one's real attachment point? → Principle 4
5. **Resolution and ending.** What is the beat that resolves the story, how quickly can
   everything calm down after it, and how do I keep the pause before the restart short
   (≤ ~12 still frames)? → Principle 5
   Also: which single action is the hero, and does it read clearly at a glance? → Principle 10
   Can this motion be done in 2D as drawn, or does it need a turn in depth (spin, head turn)? → Principle 12
   Is anything here motion by nature (wave, flame, smoke, water, wind)? It must keep moving itself. → Principle 14
   What is the plainest story the drawing itself tells (progress → result)? Start from it. → Principle 17
6. **On a revision:** what moved in the previous version? It all must still move. → Principle 6
7. **What is separate in reality?** Objects that merely touch or overlap in the drawing (often merged
   into one path by the illustrator) must be able to move independently. → Principle 8
8. **What stays whole?** For every cut: does each moving part move complete, and does everything else stay
   complete, at the frames of largest displacement? → Principle 13 (absolute)
9. **What stays inside the frame?** Will anything - drift, bob, a line sliding out, a swing - get cut
   by the comp edge at any frame? → Principle 9 (absolute)
10. **Who are the siblings?** Group elements that play the same role (faces, icons, symbols, items in a
   row). If one of a group reacts, does every member get a reaction? → Principle 15

## 1. Depth follows the drawing, not the fill
Viewers read line art as solid objects. If something is drawn in front, whatever moves behind
it must disappear behind it, even when the front element is only an outline. Check the full path
of every moving part - rotations sweep large areas (hands, arms, doors, lids). Where a crossing
happens: hide the moving part inside the front object's silhouette with
`silhouette()` + `matte_layer()` + `set_matte(inverted=True)`, matte parented to the front object.
If masking is impossible, change the motion so it doesn't cross.
Examples: a clock hand passing under an unfilled bell; an arm swinging behind an outlined body;
a card sliding out from behind a phone outline; a planet orbiting behind another.
Getting the layer order right is not enough: line art is transparent inside, so a back object shows
through the front object's interior unless it is matted by the front object's silhouette.
*Learned from: alarm clock (hand crossed the bell); again on the calendar + clock (the clock sat behind
the calendar in the layer stack, yet its hands still showed across the calendar's unfilled body).*

## 2. Use the object's controls to drive the story
Motion is more convincing when it has a cause on screen. If the picture contains something
that can be operated, make the interaction a beat with clear cause → effect: the button starts
or stops the action, the switch turns on the light, the lever drops the ball, the finger taps
the screen and the notification pops. A press/tap reads as: tiny lift (anticipation), fast push
with squash, short hold, springy release with slight overshoot. If nothing operable exists, look
for an equivalent trigger (a character's gesture, an object landing, a timer reaching zero).
Let effects depend on their cause: what a light reveals exists only while it shines - ALL of it (text,
photos, icons, marks; not just the obvious part), appearing in the beam and erased when it goes dark; what a
switch controls changes only after the switch is pressed. When applying a rule like this, go through every
element it covers, not only the one named in the comment.
If a character or hand is in the picture, it is usually the one who triggers the story: let it act first
(a finger taps the screen → the route builds → the pin fires), with a visible contact (tap ripple, press squash).
*Learned from: alarm clock ("add the button press"); flashlight + ID ("press the button on the torch to turn
the light on; the writing should appear in the light and be erased when it goes off", then "why don't you hide
the picture with the person too?"); GPS ("move the hand as if the finger presses the screen, and then the
route builds and the pin fires").*
The other side of this: an effect only follows a cause it is physically connected to. Things merely
attached nearby (sticky notes on a screen, a poster on a wall, a plant beside a keyboard) do not jolt with every
key tap or click - that reads as a twitch. Give them their own calm life instead (paper fluttering in a breeze:
a wave running out to the free end, loop-periodic sines), unless the cause is big enough to shake the whole object.
*Learned from: laptop ("the notes shouldn't twitch in time with the key presses, just flutter in the wind").*

## 3. Overlapping action: connected parts never move in sync
The driver moves first; attached parts start 2–5 frames later and keep going after the driver
stops (follow-through), with the delay growing the further a part is from the driver. Applies
to every start, stop and direction change. Characters: hips → torso → head → hair; shoulder →
elbow → hand → held object. Objects: body → attached bell/lid/antenna → loose bits.
Implement with offsets on keyframe lists, phase offsets on `sine()`, or physics (Principle 4).
Marks drawn next to a moving object - action lines, click marks, sparkles, sound lines, motion dashes —
belong to it: they ride along with it (parent them, or follow its motion a few frames late). A mark left
standing still while its object moves reads as detached. Check every such mark in the analysis pass.
*Learned from: alarm clock ("offset between the clock and the bell"); flashlight ("the little lines right of
the torch stayed static - they must move with it or with an offset").*

## 4. Loose parts move by physics, and visibly
Anything that hangs or dangles must react to its carrier the way it would in reality: lag,
swing, overshoot, knock against limits, settle. Don't hand-key a timid wiggle. Bake it with
`pendulum(...)`: hinge at the real attachment point (where it is fixed, which may be hidden —
e.g. inside a bell, at a bag's strap ring, at the root of a tail), driven by the carrier's
actual motion sampled with `sample()` through every parent. Tune `period_f` near the carrier's
shaking/stepping period and `gain` so the swing reads clearly (≈10–15° on a long part, more on a
light short one). Time accents (sound lines, sparks, dust) to the moments it hits or peaks.
*Learned from: alarm clock ("move the clapper more actively, like it would from the bell's rotation").*

## 5. Clean ending, short pause - never a frozen screen
After the resolving beat, secondary motion dies out within ~10–15 frames, then a SHORT calm moment
and the loop restarts. Two failure modes, both seen:
- lingering wobbles and ring-outs after the story is over read as noise;
- a long fully-still stretch reads as "the animation froze". Keep total stillness ≤ ~10–12 frames
  (0.3–0.4 s); `check.py` reports the longest fully-still stretch.
Shorten the loop rather than padding it with stillness. Rewinds/returns (a playhead going back,
a lid closing) count as motion and can fill the gap. For physics parts, raise damping at the
resolving moment (`zeta=lambda t: ... if t < RESOLVE else 0.5`).
*Learned from: alarm clock ("extra movement at the end") and microphone ("very long pause at the end,
feels like it froze").*

## 6. Revisions keep everything that already worked
When redoing a loop, every element that moved in the previous version must still move unless
asked otherwise; only the commented parts change. Compare with the previous build before
delivering: `check.py` prints "static layers" - each must be intentionally still. `anim()`
refuses overlapping keyframes, the bug class that silently froze an element once.
*Learned from: alarm clock revision (sound lines stopped animating).*


## 7. Limbs and soft parts bend as one piece; only rigid parts rotate
Arms, legs, tails, sleeves, cloth, stems must bend through path animation - the drawn shape
deforms smoothly - never be cut into segments that rotate like a robot. Rotate/move rigidly only
what is rigid in reality (helmet, star, phone, wheel). Animated parts must stay one-to-one with
the original drawing at rest. Use `deform_group(..., bend_warp(root, tip, angle_fn))` with
`frames=motion_frames(keys, OP, step=3)` (chalk/brush paths are heavy - bake only while moving).
A held object follows the hand through the same warp at full weight.
Every rotation needs its real joint as the pivot: a hand turns at the wrist, a head at the neck, a lid at its
hinge - never around the drawing's centre or bounding box. For a body part cut off by the picture, the joint
is where it enters the frame.
When a part turns by deformation (a head on a merged silhouette), measure the joint on a zoomed grid of the
actual art - the narrowest point of the neck between its two contour lines, not a guess - and keep the
transition band narrow (~1 stroke width across the neck): the part above rotates rigidly, the part below
stays. A wide falloff (tens of px) shears the lower face and reads as a jaw being torn off.


## 8. Separate objects move separately - never stretch one to stay glued to another
Illustrators often merge touching objects into one outline (DNA strand fused with a cell membrane,
a hand fused with a cup, a character fused with a chair). If those are separate things in reality,
split them before animating: classify the ink (thin vs thick strokes, distance to a known region —
`ink_mask`, `ndimage` opening/distance, `mask_to_paths` + `mask_group`), rebuild what the front
object was hiding (`stroke_group` arcs, `hidden_patch`) and hide it again with the front object's
silhouette as an inverted matte. A region-weighted warp that makes one object drag/stretch the other
reads as them being stuck together - wrong.
The same goes for mechanisms drawn as one shape: two clock hands merged into one "L" must be split and
driven by their real relationship (hour hand = minute / 12), never rotated together as one piece —
that never happens in reality. Mind how the loop closes with real ratios (e.g. time runs forward to the
story beat, then visibly rewinds at a reset beat).
Same for parts of one readout: when some characters of a display change (digits rolling, text retyping,
a counter ticking), separators and decorations that belong to the value (decimal point, comma, currency sign,
unit, colon) must change with it - hide them while the value is in flux and bring them back when it settles.
A static decimal point between spinning digits looks pasted on.
Cut cleanly - leftovers are the typical failure: chalk strokes are thick and uneven (30+ px, doubled on
outer edges, thicker at crowns), so a fixed small dilation of the enclosed region leaves slivers of the moving
part behind, and a large one steals the neighbour's line ends. Measure the stroke where you cut; dilate by region
(more on free outer edges, less where another object's line touches); rebuild hidden lines on the MEASURED
centreline and width of the visible part. Then render the moving part at its farthest offset, zoomed, and look
for double edges, stubs and dashes left behind before delivering.
Never cut with a box (x > a and y > b): a rectangle catches pieces of whatever else crosses it (the brim, the
tip's own edge) and tears them off with the moving part. Select the moving part by its own shape (its stroke
corridor, its connected component, its silhouette), check the cut mask by eye before animating, and let the
two pieces overlap by a few pixels at the joint (a knot, a hinge) so no hairline opens there.
*Learned from: DNA + cell ("this part of the DNA stuck to the cell and stretches when it levitates");
calendar + clock ("the hands move simultaneously, merged into one layer - that doesn't happen in life"); zero-balance card ("the decimal point stands still while the digits move - strange"); GPS ("pieces of the hand
and the pin are left behind - can you cut more carefully?"); witch hat ("look what you did to the tip of the hat,
it's torn to pieces" - a box cut for the hanging star took part of the tip with it).*

## 9. ABSOLUTE: the drawing is never cut by the frame edge
No element may cross the comp boundary at any frame - not a wind line sliding out, not a swing,
not a bob or drift near the edge. Fade things out before they reach the edge, limit travel by the
element's distance to the edge, or keep motion inward. `check.py` renders a 30 % larger copy of the
comp and reports "frame edge: CUT OFF" if any ink appears outside - this must say OK.


## 10. The hero action reads clearly; restraint is for everything around it
The one action that drives the story (pouring, pressing, throwing, waving, typing) must be easy to read
at a glance, or the loop feels timid. Give it real travel and a shape: a wind-up in the opposite direction,
a clear move into the working pose (often with a supporting move - lift, step in), a small accent for every
event it causes (a flick of the wrist per drop, a tap per keystroke, a nod per beat) and a return with an
overshoot. Rough scale: a hand/tool tilt of ~8–10° plus ~3° wind-up, not 4°. Keep the restrained level
(Principle 7 and the brain reference) for secondary and ambient motion - nods, breathing, levitation, the
reaction of things being acted on. When the hero action gets bigger, re-check clearances: the larger pose
may now touch or cross other objects (lift it, shift it) - and Principle 9 still holds.
A floating/levitating thing held or guided by a hand is driven by that hand: the hand moves (a small circling,
a tilt that pivots at the WRIST - where the hand enters the picture, usually at its edge - plus a little lift;
not a translation of the whole hand around its centre, and not side to side), and the floating thing follows the
palm point under it with an offset
(several frames late, a larger swing) plus its own float - not two unrelated gentle bobs.
*Learned from: lotus over a hand ("a bit more active: the hand should move a little and the flower follow with
an offset, as if someone holds a ball of fire in the air"; then "it moves too much left-right" and "the pivot should
be on the left, near the edge of the hand").*
*Learned from: hand pouring into a flask ("make the hand movement livelier, it's very timid" - 4.5° tilt was too little).*

## 11. Squash & stretch and springs are smooth curves, not sharp key-to-key snaps
Deformation (squash, stretch, wobble, tilt-and-settle) looks jerky when built from a few keys with sharp
eases ('in' into the squash, 'out' out of it, 5-frame gaps): the velocity jumps at every key. Instead:
- wind-up into the squash slowly (~10–12 f) with a sine-like in-out, ending at zero velocity;
- release as a **damped spring sampled every frame** (`cos` for scale so it starts from the squash at zero
  velocity, decay ~0.07–0.1/f, period ~12–16 f), volume-preserving (sx = 100 − 0.7·x, sy = 100 + x);
- a tilt that starts with the release is a `sin` spring ramped in with a smoothstep over ~6 f (no kick);
- fade the spring to exactly 0 with a window before it ends, so the hold is truly still and the loop is clean;
- followers (lids, neighbours) use the same spring shape, smaller and a few frames later.
Sharp 'out'/'in' eases stay for genuinely hard events: an impact, a click, an object thrown or caught.
Applies to any bouncy body: a cup, a jelly, a character landing, an icon pop, a button settling.
*Learned from: coffee cup ("make squash & stretch softer - the easings are sharp, the cup looks jerky").*
When something pops out / appears (cash out of a wallet, a card from a slot), it comes out in ONE elastic move —
not in several hesitant pushes with pauses - and a small rotation that lags the position (offset) sells the elastic.
That rotation belongs to the move only: it comes out turned, eases back to the drawn angle and then stays there —
no idle rustle or sway on the object afterwards (if the loop would freeze, let the container breathe instead).
*Learned from: wallet ("why does the money come out bit by bit with pauses? Let it all fly out at once, with elastic, plus a little rotation offset from the position").*

**Default way to get there: simulate, don't stitch.** Hand-stitched pieces (a parabola for the hop, a windup
function, a spring that starts at the landing, a ramp for the tilt) each look fine alone, but where one hands
over to the next the velocity jumps - that reads as "sharp, dirty easing". Instead drive every secondary channel
(squash, tilt, a bow/ear/tail flop, the neighbour's rock) through a **damped-spring simulation** (`spring_sim` + `loop_bump` in lot.py) fed by smooth
forces: gaussian bumps for the crouch and the landing, the body's velocity for stretch, its acceleration for
inertia of soft parts. The output is continuous in position and velocity by construction. Run the sim over 3–4
loops and keep the last one - the seam is seamless for free. The primary path itself is a curve with zero
velocity at its ends (hop: −h·sin(πu)^1.6, not a parabola). Plot the curves before rendering: any corner in a
curve is a jerk on screen. Give the action room: ~4 s for a hop-hop-settle, not 3.
*Learned from: gift stack ("again too sharp and dirty easings - make it prettier"). Not confirmed yet: the
simulated version was also "still not it" and the illustration was skipped - treat this as a technique to try,
not a proven fix; the easing problem on hops is still open.*

## 12. Stay inside what the drawing style can carry - no pseudo-3D on hand-drawn flat art
A flat, hand-drawn illustration (chalk, brush, marker, doodle) is a 2D picture: its parts are drawn squeezed,
merged and approximate, not as projections of a 3D object. Faking a turn in depth - spinning a globe or a
disco ball, turning a head, rotating a box - means re-projecting that drawing, and it shows: shapes stretch
into slabs, cut edges appear where the artist stopped, poles turn into blots, invented "back sides" look
wrong, frame 0 drifts from the drawing. Default to 2D motion that the drawing supports as drawn: float, rock,
swing, sway, squash & stretch, bend, flips, pops, reveals, things moving across the picture plane, light
effects. The pseudo-3D recipe (motion-recipes.md) stays available for art that is built for it - clean
geometric line art with regular grids, even meridians, a symmetric object - and then only if it holds up
on the first look; otherwise fall back to 2D without being asked.
*Learned from: disco ball and globe - both "great idea, but very hard to pull off in this style", redone without the spin.*

## 13. ABSOLUTE: never tear the drawing apart
No moving part may leave pieces of itself behind or carry away pieces of anything else - not a sliver of an
edge, not a chunk of a neighbouring line, not a stub at a joint. A drawn object that moves stays whole; what
stays still stays whole. Cut by each part's own shape (Principle 8: measured strokes, no box cuts, overlap at
joints), then before delivering render the frames of largest displacement zoomed in on every cut and look:
any stray piece, gap or torn edge means the cut is wrong - fix it, don't ship it.
Check BOTH end states: the moved part's frames AND the frame where it is gone. When something slides into/behind an
object (cash into a wallet, a letter into an envelope), render the empty state zoomed: the edge it slid behind must be
the edge as drawn - no stubs of the departed lines, no ruled straight cut, no flat ledges. Split along the edge's own
chalky boundary (its clean side shifted by its measured width, smoothed), not along a hand-drawn polyline; give each
part only its own ink (an overlap band to kill hairline seams only where that part's ink truly continues).
If the moving part may rise above its drawn position (elastic overshoot, tilt), continue its crossing lines under the
edge on their measured centreline and width (fit x(y) above the edge, not a guessed direction), a round thing as its
hidden round half; skip tapered stroke ends. Keep the overshoot where the run-on can't show a seam (~15 px), and put
the elasticity in the rotation instead.
*Learned from: wallet ("terribly cut! what is this garbage!" - stubs on the empty wallet's edge).*

## 14. Things that are motion by nature never stand still
Some drawn things ARE movement: a sound wave, a flame, smoke, steam, water, a waving flag, wind lines, a
spinning loader. Scaling or pulsing them as a block is not enough - their shape must keep moving: a wave
travels along a waveform, a flame flickers and licks upward, smoke curls and drifts, water ripples. Animate the
path (deform_group) with a travelling wave or flicker that runs the whole loop; if the motion repeats every
N frames, bake one period into a looping precomp (`D.looped`) to keep the file light.
*Learned from: headphones ("animate the wave on the left somehow - it's a wave, it's always in motion, dynamic").*

## 15. Equals get equal treatment - if siblings react, every one of them reacts
When several elements play the same role - the faces of a die, icons on a card, items in a row, windows of
a house, the pips/symbols/decals on one object - and some of them get their own reaction, all of them must.
One left still while its siblings pop and twinkle reads as a forgotten layer, not as a choice. Before
building, list the sibling groups and give each member a reaction (its own kind is fine and even better:
the pip pops, the sparkles twinkle, the figure turns its head), staggered in time. If a sibling is merged
into the outline, deform it in place (deform_group, anchored where it touches the outline - Principle 13)
rather than leaving it out.
*Learned from: dice ("why doesn't the person on the cube move when all the other faces do?").*

**Deform only the thing that is alive; its container stays rigid.** A figure inside a frame (a photo on a
badge, a portrait in a picture frame, a character in a window or screen) is often merged into one path with
its frame. Its deformation weight must be zero on the frame's stroke - gate the warp by the distance from the
frame's centreline (`ss((sd_poly(x, y, FRAME) - ~2×stroke) / ~stroke)`), not only by "above the neck":
a frame corner that bends with the head looks like rubber and kills the effect. A rigid frame around a
moving figure is what makes the movement read.
*Learned from: ID badge ("deform only the person, not the frame around it - it'll be more effective").*

**Signed distance to a region = distance to its edge SEGMENTS, never to the edges' infinite lines.**
Otherwise points far away that happen to lie on an edge's extension (a lanyard, a neighbouring object) get
pulled into the warp and the drawing tears there.

## 16. Travel and flight are one continuous smooth motion - no unseen jolts
A thing that flies, floats, swims or drives (plane, bird, balloon, fish, car on a road) reads best as one
unbroken, flowing motion. A sudden event with no visible cause - a turbulence bump, a kick, a jolt from
nothing - reads as something invisible poking the object, not as "air". For such subjects:
- build the path from loop-periodic sines (e.g. period OP plus OP/2 for a swoop): perfectly smooth, seamless;
- make "dynamic" by amplitude and coupling, not by events: a real climb and dip (~20–30 px), the body's
  angle following its path (pitch = vertical speed: nose up while climbing, ~4–6°), a slight surge forward
  and back, and a faster-moving surrounding (clouds, waves, road marks) with parallax;
- small accents (a glint along the windows, a blink of a light) are fine - they don't push the body.
*Learned from: plane ("the turbulence looks more like someone sharply pressing on the plane - drop it, just a
dynamic, smooth flight"). The sine-swoop v2 was kept as "so-so": smooth was right, but it still lacked
life - next time try more character in the path (a banked S-curve, a gentle loop of the nose, a contrail or
wind lines if drawn) rather than only a bigger bob.*

## 17. Tell the drawing's own plain story first - don't over-invent
Most of these illustrations are icons with one obvious story built into them: a progress bar loads and then
the result shows; a bell rings; a letter flies out. Find that plain story and tell it cleanly before adding any
idea of your own. Read the marks by their role in that story, not by their look: short lines radiating from a
corner next to a progress bar are the "done!" burst that appears when loading finishes - not a perpetually
spinning loader. Elements that are the RESULT start hidden and appear on the payoff beat; elements that are
the PROCESS (ticks, steps) build up one by one. Frame 0 matching the drawing gives way to this: the loop may start
from the empty state, as long as the full drawing is shown clearly during the hold.
*Learned from: loading folder ("it's an elementary story: the bars load, scaling in one by one, and when they
reach the end the lines on the right of the folder appear").*
The motion belongs to the element the story happens on: a badge that confirms gets the press (it squashes in as
the check is written and springs back), not the building around it. Don't give fixed structure (an awning, a roof,
walls) ambient motion of its own - a waving canopy just competes with the story. If a pause would freeze the
loop, shorten the loop or give the hero a slow breath instead.
*Learned from: verified shop ("no wave on the canopy; scale-press the circle while the check appears").*
The pop goes to the symbol that carries the meaning - the thumbs-up on a liked photo, not a detail inside the
picture (the sun). Ask: what is the icon SAYING? That element gets the accent.
Don't paint new shapes over a character's face to fake an expression (black lids sliding over white eyes to blink):
in this flat chalk style it reads as strange black blots, not a blink. Keep faces as drawn unless they have parts
that can move as drawn.
*Learned from: robot ("remove the black dots animation on its eyes, it looks weird").*
*Learned from: liked photo ("scaling the hand fits better here than the sun in the picture").*
Technical: when a ring is cut out of a merged path so it can scale, the lines that meet it keep a small overlap
into the ring ONLY inside narrow corridors along those lines; everywhere else the ring's whole chalk rim
(including wobble beyond the fitted radius) goes with the ring - otherwise a sliver of its outer edge stays behind
when it shrinks. Run the lines on under the ring and hide them with the ring's disc as an inverted matte.
Better still (new email badge): give the ring its WHOLE band, rebuild the meeting lines from just outside the band
(same width as the drawing's lines, chalky edge, on their measured direction) through to the hidden corner, and
make the matte the ring's inner area grown into the middle of its band - the lines then end under the ring's own
ink, so no hairline gap shows at the junction at any scale. Call set_matte LAST: a layer parented to the target
created afterwards is inserted between the matte and its target and silently breaks the matte.

---
## Examples
Complete build scripts, for the level of finish, not as templates to copy - a new picture gets its own story built from the analysis pass: `examples/ai_brain.py`, `examples/alarm_clock.py`, `examples/bell_ring.py`, `examples/chemistry_pour.py`, `examples/coffee_cup.py`, `examples/coffee_cup_split.py`, `examples/disco_spin_pseudo3d.py`, `examples/disco_spin_split.py`, `examples/dna_cell.py`, `examples/flashlight.py`, `examples/ghost.py`, `examples/globe_spin_pseudo3d.py`, `examples/gps.py`, `examples/handshake.py`, `examples/microphone.py`, `examples/new_email.py`, `examples/new_email_split.py`, `examples/party_blower.py`, `examples/saturn_constellation.py`, `examples/skeleton_run.py`, `examples/wallet.py`, `examples/wallet_split.py`, `examples/zero_balance.py`.
