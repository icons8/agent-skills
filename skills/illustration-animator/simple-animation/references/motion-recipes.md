# Motion recipes

Proven patterns from real illustration loops. Each is a story beat, not a decoration —
pick the ones that match what the drawing *is* (a bell rings, a megaphone shouts, a
loader runs). Frames assume 30 fps. All helpers are in `scripts/lot.py`.

## Contents
- Pendulum / ringing object
- Pop-in / collapse (bubbles, badges, icons)
- Squash-and-stretch bob (talking, nodding, someone reacting)
- Hop / jump with anticipation
- Burst lines on an impact
- "Typing" dots and staggered waves
- Shake "no" / wiggle
- Fly-out from a source (icons out of a megaphone, files into a cloud)
- Converging hit (arrows into a target)
- Cut-out character rig (bones / limbs as separate shapes)
- Running in place
- Weightlifting (body scales, held object follows hands)
- Ambient float
- Wipe reveal of filled "handwriting"
- Highlight wave around a ring (loaders)
- Physically driven hanging parts
- Moving a character that covers drawn background (levitation, stepping aside)
- Dangling / swinging limbs that share outlines
- Heavy paths: looping precomps
- Loop structure

---

## Pendulum / ringing object
Pivot at the hanging point (hook, top of bell). Decaying alternation with `'io'` eases,
6–8 frames per half-swing, end exactly on 0 at the drawn pose:

```python
r=anim([(0,0,'io'),(12,7,'io'),          # anticipation: pull back a little
        (22,-24,'io'),(30,11,'io'),(37,-17,'io'),(44,8,'io'),(51,-10,'io'),
        (58,6,'io'),(65,-3.5,'io'),(72,1.5,'io'),(80,0,'lin'),(OP,0,'lin')])
```
Keep the swing *toward* neighbouring elements smaller so it doesn't hit them.

## Pop-in / collapse
Pivot at the element's "source" (speech-bubble tail tip, badge centre). Scale
0 → 110–118 → 96 → 100 over ~20 frames with a small rotation settling to 0. Exit = tiny
anticipation (105) then `'in'` to 0 in 8–12 frames. Hidden elements at frame 0 are fine as
long as the hold section shows the full original drawing.

```python
s=anim([(0,[0,0,100],'lin'),(26,[0,0,100],'out'),(35,[112,112,100],'io'),(41,[96,96,100],'io'),
        (47,S100,'lin'),(98,S100,'io'),(102,[106,106,100],'in'),(111,[0,0,100],'lin'),(OP,[0,0,100],'lin')])
```

## Squash-and-stretch bob
For a character "speaking" or reacting. Pivot at the base (feet / bottom of a silhouette).
`bob(f, peak=(93,110), settle=(104,96))` gives 22 frames; 6 % is subtle, 10 % reads at icon size.
Stagger several characters 20–22 frames apart so they take turns.

## Hop / jump
Anticipation squash (107,92) 5 f → rise with stretch (95,107) to −h px → short hang → fall
with `'in'` → landing squash (110,90) → settle. h ≈ 4–5 % of canvas height. A second, lower
wave in the opposite direction makes a nice loop.

## Burst lines on an impact
Action lines (sound marks, sparkles): one layer, pivot at the impact source, scale 60 → 112
with opacity 0 → 100 in 5 frames, then fade in 8. Fire on each impact frame.

## "Typing" dots and staggered waves
Each dot hops up 12–16 px for half of a 30-frame period, phase offset 5 frames per dot.
Make dots children of their bubble so they follow its pop and float.

## Shake "no" / wiggle
Rotation 0 → 14 → −12 → 9 → −5 → 0 at 3-frame intervals, optionally with a scale pulse
(122 → 96 → 100). Fingers/hands: same with ±10, around the wrist.

## Fly-out from a source
Start each element at ~25 % of the way from the source (mouth of megaphone) to its home,
scale 0, rotated −20°. Travel home with slight overshoot past it (6 %), scale overshoot 115,
stagger 4 frames. Return the same way (`'in'`) at the end of the loop.

## Converging hit
Each arrow moves along its unit vector toward the target: wind-up back −48 px (`'in'`),
strike +42 px (`'out'`), recoil −14, settle. All hit on the same frame; the target squashes
(80) then pops (128) with a twist and wobble-settles.

## Cut-out character rig
Works when limbs/bones are separate shapes (sketchy skeletons, outlined kids with separate
arms). Root = torso (or hips), children: head, upper arms, pelvis; chains
upper → lower → hand. Give every joint a pivot at the joint, drive with `sine()` and phase
offsets: lower segments lag the upper by 0.1–0.15 period, legs opposite (phase 0.5), arms
opposite to legs, head lags body for follow-through. Body bounce = period/2.
See `examples/skeleton_run.py`.

## Running in place
When the body+legs are one shape: bob the whole body (period 15 f, 12–16 px), tilt ±2°,
swing separate arms ±14° in opposite phase, head lags. Keep everything sine-based so any
OP that is a multiple of 30 loops.

## Weightlifting
Body scale-y from the feet: 100 → 95 (squash) → 106 (push) → hold with tremble → 98 → 100,
sx = 100 − (sy−100)·0.6. Objects held by the hands are NOT scaled - move them by
`−(feet_y − hands_y)·(sy/100 − 1)` px so they stay in the hands; same for the head with the neck.

## Ambient float
Secondary objects (pages, badges): `sine(pos(c),[0,-12,0],60,OP,phase)` plus rotation ±3°
on a 120 f period. Different phase per object (0, .33, .66 …) so nothing moves in lockstep.

## Wipe reveal of filled "handwriting"
Illustrator strokes are usually expanded to fills, so trim paths won't work. Use
`wipe_mask(layer, y0, y1, [(0,x0,x0,'lin'),(f,x0,x0,'io'),(f+14,x0,x1,'lin'),(out,x0,x1,'in'),(out+10,x1,x1,'lin'),(OP,x1,x1,'lin')])`
— the closing keys wipe it away left→right so the loop restarts clean. Stagger lines 12 f.
Masks are less portable than transforms: tell the user to check the target player.

## Highlight wave around a ring
For loaders: order segments clockwise from 12 o'clock; for each, a pulse (scale 118 and
22 px outward along its radius) at `f = n·LAP/N`. Place copies at f−LAP, f, f+LAP and pass
through `wrap_keys(keys, OP)` so the wave wraps seamlessly.

## Physically driven hanging parts
Clappers, pendants, tags: `keys, _ = pendulum(hinge_world, carrier_angle, OP, rod=(dx, dy),
period_f=8, zeta=0.05, gain=2.5, limits=(-15, 15))`. `hinge_world(t)` transforms the hinge point
through every parent's motion using `sample(keys, t)` on the parents' own key lists - so keep
those lists in variables. Fade the result to 0 over the last ~18 frames so the loop closes.
Strikes = |angle| local maxima above ~2/3 of the limit. See `examples/alarm_clock.py`.

## Moving a character that covers drawn background
The art only contains what was visible: background shapes stop at the character's outline. When
the character moves (floats up, leans away) those cuts get exposed. Fix all three:
1. Hide the background inside the character: `silhouette(P, figure_idxs, (W,H), shrink=5)` →
   matte (deformed with the same warps as the limbs via `deform_path_keys` + `region_warp`),
   parented to the character root, `set_matte(..., inverted=True)` on the background layer.
2. Rebuild hidden outlines: e.g. `fit_circle` on a planet outline, `stroke_group` arc over the
   missing angles, in the background layer under the matte.
3. Continue cut fills (continents, shadows) underneath: `hidden_patch(P, idx, figure_idxs, size,
   grow=90, clip_disc=...)` → `poly_group` in the background layer.
Check the frames of maximum displacement zoomed in: no white slivers, no straight cut edges.

## Dangling / swinging limbs that share outlines
In line art two limbs often share a line (one thigh's underside is the other leg's edge). Separate
warps per limb tear those shared lines or make lines cross. Use ONE coherent warp for the whole
limb system: rotate around the hip with weight growing with distance and a phase lag down the
limbs (feet trail knees). Overlap-free and no tearing.

## Heavy paths: looping precomps
Chalk/brush outlines have hundreds of points; baked path animation gets heavy (MBs). Simplify the
deformed shapes (`deform_group(..., simplify=1.0)`), bake only while moving (`motion_frames`), and
for periodic motion bake ONE period and replay it with `D.looped(name, groups, period, parent=...)`.

## Connect-the-dots / drawing a connector
For lines between elements (constellations, diagrams, flow arrows) drawn as filled chalk strokes:
`axis_reveal(layer, a, b, half_width, keys)` reveals along any direction. The element at the end
reacts when the line arrives (cause → effect). Erase afterwards in the same direction
(u0 0→1) so the loop restarts empty. Spin only symmetric accents and only by their symmetry angle
(4-point star: 90°, so the pose snaps back invisibly); asymmetric glyphs just pulse - rotated,
they read as letters.

## Loop structure
- 3–8 s, 30 fps unless told otherwise (90–240 frames).
- Shape a beat: setup → action → hold → reset. The hold is where the original drawing is
  fully visible - that's also the frame to compare against the source.
- Loops close exactly when every keyed property returns to its frame-0 value at OP and
  every `sine` period divides OP.
- Only the hero gets the strongest motion; one or two supporting motions; everything else
  still. 1/3 rule: no more than a third of elements moving hard at once.

## Coil / spiral "breathing" (party blower, snail shell, rolled paper, spring)
A drawn spiral can't honestly unroll, but it can wind and unwind in place: rotate each point around the coil
centre by angle·w and scale by 1 + loose·w, where w = (1 − r/R)^1.3 - the centre turns most, the outer ring
(and whatever attaches to it) stays put, so nothing tears. Wind-up = small negative angle, release = damped
spring to ~+60° at the centre plus ~13 % loosening (Principle 11 shapes). Bake with `deform_group(...,
simplify=1.4)` only on the moving frames. See `examples/party_blower.py` (accepted "for now", not a
signed-off reference - a true unroll into a straight tube was out of reach on a chalk outline).

## Pseudo-3D spin of a drawn sphere / globe / ball (kept as a technique, use with judgment)
Rotation around the vertical axis: latitude rings stay put; everything on the surface moves in longitude.
Per vertex: r(y) = sqrt(R² − (y − cy)²), φ = asin((x − cx)/r), φ' = φ + spin(t), x' = cx + r·sin φ'. Clamp φ' to
±90° so anything behind collapses onto the rim (hidden in the outline) - decide the wrap ONCE PER PIECE from
its centroid longitude, or a piece straddling the back gets stretched across the ball. While a piece is hidden,
key it with hold keys so it never sweeps across the front. Split the art first: rim + string (static), latitudes
(opening with long ±24° line kernels, 111 px - short kernels fit diagonally across thick chalk strokes),
meridian segments (connected components; dilate them vertically ~±14 px so their ends stay tucked under the
rings), tiles (opening with a big disc); rebuild ring stretches the tiles were covering. A drawing only shows
the front, so repeat the drawn sector around the sphere (e.g. 4 copies at 90°) and spin by a whole number of
sectors per loop. Costs: frame 0 no longer equals the drawing (extra copies appear at the sides), poles turn
blotchy, files ~1.5 MB. See `examples/disco_spin_pseudo3d.py`.
Verdict on the chalk disco ball: very hard to pull off in this style; the no-spin version was kept as an exception, and this knowledge stays for drawings where it fits (cleaner line
art, regular grids, globes with even meridians).
