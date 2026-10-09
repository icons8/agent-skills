# Common animation rules

The source is Icons8 animations; this is a distillation of them. It takes priority over any external principles.

## Hard rules

- Every animation has a plot: a short story with cause and effect. At least one action (`action`) and a reaction to it (`reaction`).
- One action at a time: one click — one reaction. Two reactions of different parts do not start closer than 3 frames to each other.
- Floating and swaying (`ambient`) — only as part of the plot, on top of an action. An animation made of floating alone is forbidden.
- On holds the character is still, unless the style rules allow otherwise (Plain — body sway as part of the plot, Comic — drift of ~5 frames after a pose). Symbols, interface and decor live on background motion.
- The illustration (SVG) is a key pose somewhere in the loop. The loop can start at any phase (`start` in the scene). Symbols outside their moment are hidden.
- The loop is seamless. Geometry from the SVG is carried over one to one: we move, rotate, scale, bend on bones.
- Motion templates are a starting point. Parameters are tuned for each scene.
- We do not do line boil.

## Affordance — the motion an object asks for

Before the plot, decide for each object by its shape and role how it moves on its own: a round thing rolls or spins, a wheel, gear, loader ring and spinner rotate around the center (`spin`), a clock hand goes around in a circle, a pendulum and a sign swing (`swing`), a door and a lid open on a hinge (pivot on the hinge), a lever and a button are pressed, a spring compresses, cloth ripples. The plot is built from these motions. Pulse and swelling — only for what itself "breathes" (a heart, a lamp, a notification); they do not replace rotation or travel: a round loader is a rotation of the whole ring, not a wave of swellings across the segments. 2026-10-06, scene ballpoint-pen-loading-progress-bar-circle-with-running-character-indicating-waiting-time, source: owner

## Loop — one mini-story

- Vignette: 3–10 beats, holds between them, a return stroke; palindrome or A–A–B.
- Cycle: walking, running, swinging, flight, riding, pulsing in a circle; no holds, the event on top of the cycle. If the illustration allows a continuous looped story (a rocket flies, a car drives, a dashed line runs in a circle and the figures move in time with it) — make it: that is a plot too.
- A simple illustration (one symbol without a character: a lamp, an icon in a bubble) — a simple loop without a plot is acceptable: the main symbol "breathes" (smoothly swells and subsides), small elements around it scale one after another in a circle. Parts do not move in time with each other: each has its own period (a divisor of the loop, so the seam is seamless), peaks are spread apart in phase; nested parts do not inherit the parent's scale.
- Almost always there is an animated attribute symbol: a star, a battery, Zzz, a heart, "?", a cloud, a paper plane, a note, a checkmark, a chart. The symbol is the main carrier of meaning.
- The ending returns to the pose at the start of the loop, often through a spring.
- Symbols around the main object: the first frame of the output loop is only the main object (a coupon, a card, a closed door), symbols appear one at a time toward the middle, hold, and toward the end leave one at a time, the last one before the seam. Key pose = SVG, the needed loop start is set through `start`.
- **The first frame of the loop does not have to match the SVG.** If in the plot the illustration is the peak of an action (circles from a touch, a heart, checkmarks, confetti, a raised hand), the loop starts from the state before it: the circles are not there yet and the finger is raised, there is no heart, the checkboxes are empty and the pencil lies down, one cone is visible. The peak (the SVG pose) is in the middle of the loop, then a return to the initial state. Set through `start` and hiding symbols; key pose = SVG remains the author's frame 0, and the `frame0` check is run against it. 2026-10-07, source: owner
- A gesture-state (waves, breathes, sways) goes as a continuous cycle through the whole loop, and events (symbols appearing) go on top of it; a single gesture with a return reads as a reset.
- A figure whose legs are merged with the body into one outline is not made to step or run: peek out and hide, hop, tilt of the torso (the torso bends, the feet are pinned to the floor — "Fused parts").

## Smoothness

The smoothness reference for all styles without their own profile is Plain (rules in `plain.md`).
- Large parts (character, head, shield, car) do not move in jerks: head turn 8–12 frames, tilt and gesture 10–20, travel 15–34; deceleration longer than acceleration (`[0.3, 0, 0.15, 1]`), spring 13–38 frames.
- Fast (2–6 frames) — only pop-ups and clicks of small symbols.
- Almost all the time something is moving, but softly: a long smooth motion is better than a short sharp one.
- Smooth does not mean slow: the tempo is like Plain (loop 3–4 s, gesture 10–20 frames), extra holds and stretched motions are not needed. Take the short end of the motion ranges (holds — per the style table, do not cut them; travel of a large part — not shorter than the distance dictates, see "Duration grows slower than distance"): in review the user asked again and again to speed up (shield, collaboration ×2, premium, door ×2), never to slow down. A simple plot of 2–3 beats fits in 1.5–2.5 s.
- Smooth does not mean small: amplitudes stay large (hop 20–60 px, tilt 5–15°, swelling 115–130 %), time is stretched, the range is not reduced.

## Fused parts

When a character is fused into one outline with an object or with itself (a bartender with the counter, an arm with the torso, a horse's leg with the body, as in Journal), it is cut and bent (`cuts` and `pin` in `scene-format.md`). Don't filter such illustrations out.

- **Cut only what moves.** An arm that reaches — cut at the shoulder; a character that sways — cut from the counter or the floor. Leave the rest alone.
- **Bend with bones, don't cut into rigid segments.** A cut-off arm, leg or torso bends on bones (`bones`, `bend`). A chain of rigid pieces with round joints gives steps at bends over 10°, and in an outline style the line breaks already at 8°.
- **The seam is pinned.** Every cut-off part has `pin`: points on the cut line (`line`) stand still, the motion grows over 100–250 px (`feather`: a short part — 100–120, a torso — 200–320). Support points are pinned too: feet on the floor, a palm on the counter (`zone` or the same `line`).
- **No drawing in.** Up to ~15–20° at a joint, a torso tilt of 3–6°. What is hidden isn't in the drawing and can't be drawn in: don't take stories where a part travels far and reveals the hidden (the bartender steps out from behind the counter, an arm comes out from behind the back, legs walk). Replace such a story with one that rests on a bend and a tilt, and make a symbol the main event.
- **Never bend a whole fused figure with bones without a cut:** bone weights leak into the neighbouring parts (the counter, the other arm), the motion comes out robotic.
- **Check the seams by eye.** `poses.js --cuts` — what moved where; `poses.js --frames … --box …` — the seam in the strongest poses. `make.js` catches a seam visible at rest (`cut`) and a tear in motion (`tear`).

Moving a character as a rigid whole silhouette (tilt, hop, sway) when the plot rests on a body pose (dance, squat, run) looks robotic — bend its outline on bones (arms, legs, torso), cutting where needed.

## Matching the SVG

After every build — in analyze before animation and in verify after every fix — the key pose frame is matched against the SVG: all elements in place, the layer order is the same, nothing is covered by the wrong thing. `make.js` checks this itself (`structure`, `frame0`); a missing or covered element is a scene error, not a style feature.

## Motion

- **Appearance** — scale 0 → 100 % over 2–6 frames with an overshoot of +3…+7 % (small ones up to +18 %), settle 2–5 frames. We almost never use opacity.
- **Disappearance** is faster than appearance: 4–6 frames, a swell up to +24 % before collapsing is allowed.
- **Overshoot and settle.** A large motion ends with an overshoot of 15–30 % of the amplitude and a settle over 2–5 frames. Spring: each swing is 0.3–0.4 times smaller than the previous one, half-period 4–8 frames.
- **Anticipation.** Before a large motion — a wind-up in the opposite direction.
- **Hierarchy lag.** `bend` with 2+ bones has `lag` 1 by default. 1–2 frames per level (shoulder → forearm → hand → fingers; torso → neck → head). Siblings in a staircase +1. Chain ends (hair, tails, earrings) lag by 3–12 frames and swing 1.5–2 times more than the parent.
- **Linked event** (a symbol, a reaction of the surroundings) starts together with the gesture or 1–3 frames later. Successive departures of elements — about 9 frames apart.
- **Easing.** Linear — only for uniform motion (passing through the frame, a conveyor, constant rotation: `constant: true`). Everything else — with zero velocity at the extremes, deceleration usually longer than acceleration. A fall is pure acceleration; surfacing and landing — deceleration plus a spring.
- **Start from rest — only with a flat start.** From rest (after a hold, from the loop start) — `soft` [0.3,0,0.15,1] (as in Plain), `inOut` or `sine`. `out` and `back` start 4.5 times faster than the average speed — that is a jerk; they suit only the continuation of a motion already underway (speed before the key ≈ speed after). The exception is a snap of up to 8 frames (a pop, a click, a rebound after an impact, a squash released): it may start with `out` — the owner approved such accents. Speeds on both sides of a key converge: a kink of more than 2 times and arriving at a key at full speed (`hit at the key`) are rejected by `make.js` (`speed`).
- **Overshoot and settle — by spring.** Not by hand keys "overshoot → undershoot → rest", but by a damped spring: the `pop`, `slide`, `bounce` templates are already like that; after your own motion — the `spring` template (`zeta` 0.28–0.36, half-period `half` 4–8 frames, `v0` — the speed of the incoming motion).
- **Arcs.** Living travel goes along an arc, not along a ruler: `arc` 0.1–0.2 for `move` and `slide` (a hand, a jump, a symbol's flight). Straight — only UI (a toggle, a slider, a cursor along a row).
- **Duration grows slower than distance.** 100 px — ×1, 200 px — ×1.3, 400 px — ×1.6 (Plain: 230 → 460 px in 27 → 34 frames; at 100 px ~20 frames). Rhythm checks this (`move duration to distance`).
- **Parts do not run into each other.** Parts that are apart in the key pose must not overlap each other in motion by more than 15 % (`overlap`). An intended touch (a cursor on a button, palm on palm) — `touch` on the part or an action → reaction pair.

## Durations (frames at 30 fps; at 24 fps multiply by 0.8)

| What | Frames |
|---|---|
| Micro-motion, jerk, click | 2–9 |
| Symbol appearance | 2–6 |
| Blink | 4–7 (closing shorter than opening) |
| Gesture, head turn | 8–20 |
| Slow tilt, "tired" motion | 20–30 |
| Hold in a vignette | 4–20 |
| Step | 12–20 (tired — 32) |

## What the engine cannot reproduce and what to replace it with

- Facial expression, mouth, hand gesture change, three-quarter head turns — we do not depict them unless they are in the SVG.
- Blink — scaling the eye vertically.
- A stroke being drawn — strokes appear one at a time.
- Going under water — squeezing to the waterline or disappearing.
- 3D turn — horizontal flip 100 → 0 → −100 %.
- Hair physics — keys with a lag of 1–2 frames.
- There are no cameras, blurs or glows anywhere.

## Easing in a scene

Engine names: `soft` [0.3,0,0.15,1] (default for `move`, `turn`, `bend`), `inOut` [0.65,0,0.35,1], `out` [0.22,1,0.36,1], `in` [0.5,0,0.75,0.5], `back` [0.34,1.5,0.64,1], `sine` [0.37,0,0.63,1], `lin`. From rest — only `soft`, `inOut`, `sine` (`out`/`back` jerk at the start). Any key also accepts its own curve `[x1,y1,x2,y2]` (x1, x2 from 0 to 1). Style curves are in the style files.

## Owner review 2026-10-07 (Little, Rough Sketch) — takes priority over the rest

- "Speed up" = cut the stretches where almost nothing happens (holds, empty pauses, stretched wind-ups), not drive the motions faster. A simple vignette with a simple plot — a short loop (1.5–3 s), no dead spots.
- The animation is "rubbery" and smooth: overshoot and spring after every hit, touch and click; squash & stretch by scale on whoever got hit or took the hit (a magnet on touching money, a knot on a click, a hand on a clap). Clumsy = a rigid turn of a piece without spring and lag.
- The character must look alive: torso, head, shoulders and arms move together with the gesture (chain lag, breathing, tilt), not only the hand or the symbol balls.
- Affordance is strict: a car drives (everything sways up and down together), a pencil puts checkmarks, a ghost flies (levitation up and down), electrons fly along their orbits, gears all rotate (as a pair, in opposite directions), a tape measure extends. A character standing on the ground does not levitate.
- A center that by meaning stands still (an atom's nucleus, a block) does not rotate.
- Lines that cross during motion (legs in walking, bends) are hidden with dynamic masks (`maskBy`), not left sticking out (see "Walking and overlaps").
- Bend arms and legs at the joints rubbery, with chain lag; running and walking — not a rigid pendulum.

## Owner review 2026-10-07, second round

- Deadlines are hard (owner, 2026-10-09): script per illustration — 3 minutes, animation — 7 minutes, judge — 3 minutes per scene, fixes after the judge — 4 minutes. At the start of a stage take the time (`date +%s`), check it before each new round of fixes. Time is up — stop and deliver the best assembled version; there are no extensions and no "one more attempt". Write its deadline into the prompt of every subagent (animator, fixer, judge). Do not compare frame by frame. The judge → fix round is one, then deliver.
- What is not in the SVG is not drawn with a white backing and not "redrawn" anew: cut the missing part out of existing geometry (tape measure — cut a piece off the existing tape and extend it, do not insert a foreign strip).
- If the needed pose of an object is not drawn in the SVG, the object is rotated or extended: paper money turns flat toward the magnet, the tape pulls out of the housing.
- Something rose and the needed line is missing in the SVG (the arm is raised, the torso is left without an outline) — draw the line in (a copy of the SVG with an additional stroke, hidden in the SVG pose).
- Two parts moving along their own orbits must not stick together: different electrons have different phases and periods, in one frame their centers are ≥ a diameter apart.
- A character peeking out, exiting and appearing — smooth, with a wind-up and a spring, not an abrupt poking out (organic door).
- Do not overcomplicate: if the plot is levitation, blinking and light stirring of the arms (a ghost), that is all, without a scatter of events.
- The best of today's scenes is the skeleton runner (rough-sketch-spooky-skeleton…): running with a bouncing pelvis, bends with lag, rubbery arms. The reference of rubberiness for characters.

## Owner review 2026-10-07, third round (body and leg outlines)

- A raised arm does not "hang" separately: the line of the torso's side from the armpit down stays in place, and the underside of the raised arm meets it at the armpit. The correct frame: the arm is raised, the torso's side is intact, the lower line of the arm runs into the side. The wrong one: the torso's side and the arm have drifted apart, the lower stroke of the arm ends in the air.
- Two legs in walking always read as two legs. In the passing pose they do not merge into one pillar with doubled and broken trouser lines. The key step pose — legs wide apart (the correct frame), the intermediate ones — a smooth transition between the wide step and the passing pose, where the legs are slightly offset from each other, not coinciding.
- The trouser line of each leg is whole from hip to shoe in every frame. Intersections are not cured by losing pieces of line (scraps, shortened strokes): spread the legs apart by phase, change the layer order.

## Owner review 2026-10-07, fourth round (lines at a bend)

- If something bends and a line pulls away from another, we animate that line: it lengthens or shortens and is always brought to the place where it was joined (armpit, crotch, knee). The body and outline are not deformed: lines move and stretch, not the shape.
- Astronaut: the torso's side stays vertical in place, as in the SVG, the lower line of the raised arm stretches to it. The torso does not turn into a triangle.

## Walking and overlaps (reference — the hiker, 2026-10-08) — takes priority over the old items

Walking references — the hiker and the skeleton: `examples/rough-sketch/scenes/rough-sketch-hiker-walking-with-backpack-and-trekking-poles-among-pine-trees.json` and `…/rough-sketch-spooky-skeleton-figure-running-forward-with-outstretched-arm-gesture.json`. Before your own walk, open their scenes.

- Moving limbs are cut off from the body as separate parts (the whole leg with the shoe, its own pivot at the hip — at the outer upper corner of the trouser leg, so the top does not come away from the waistband).
- What goes behind one another hides under the dynamic mask of the near part (`maskBy`, `out: true`). The near one is the one whose line runs straight through at the junction, while the other's line butts into it (T-junction). The far leg's shoe gets its own mask by the traced outline of the near shoe (`poly`), not by the convex hull.
- A line that sticks out past the waistband on rotation is cut off by a mask at the waistband (`maskBy` without `out` on the torso).
- Line breaks are drawn in with a dynamic line (a copy of the SVG with an additional stroke in `svg-extra`, as with the astronaut); an object butting into a limb (a pole) is attached to it at the point of contact (`parent`, pivot at the point) and subtracts its rotation.
- The ends of lines cut by a mask are round, like a pen's (the engine puts them itself on a part sawn off by a mask on itself); the cut goes across the lines, never along (along — splinters and stubs).
- A short stub seam at the junction of sawn-off parts (the crotch) is not given to either part; a hole in the fill is closed with the figure's own fill at the very bottom.
- The near leg of a runner in three-quarter view — by the side rule below (faces right — near is left, as in the Ballpoint loader); when in doubt — whose line runs straight through at the junction.
- Running is not "scissors" (both legs together converge and diverge, reads as a side-step): the legs swap places, the leading leg in the swing rises (the top goes under the torso), the support leg stands on the ground; the torso is lowest on the support, higher in flight.
- Layer order of limbs on a person in profile (owner's rule, 2026-10-09): faces right — the limbs that are to the left of the body in the picture are ABOVE the body, those to the right — UNDER the body; faces left — the opposite. This applies to arms, legs and details on them.
- A T-junction is a check of the same thing: the part whose line butts into the other at the junction is the one underneath (the lower line of the arm butts into the shirt's side — the arm is under the torso). Lead the cut right up to the line that is butted into: the whole line of the limb leaves with it, and that line stays whole (otherwise a stub with a tip hangs on the body). Limb details (sleeve stripes, a cuff) go under the body together with it — as a copy in `svg-extra`, otherwise they are drawn on top.
- Tight line mask (owner's technique, Figma 2026-10-09, `maskBy.lines`): the mask hugs the stroke itself tightly, by its thickness, with round ends where the line is cut off; no convex hull and no outline traced with a margin. Variant A (`fill: true`) — the strokes plus the interior of the limb, the open side closed by a straight chord between the ends: the limb covers what is behind it. Variant B (without `fill`) — only the lines: cuts them off with round ends, covers nothing. A limb drawn as one outline with the body (a hanging arm in the witch's dress) is sawn off like this: the body — `out: true` by the arm's lines, variant B (only its lines leave the body, the fill stays), a copy of the body in `svg-extra` — variant A by the same lines. The ends are led under the neighboring detail (a cape, a hem), the chord also under it. The ends can be moved along the line (`trim`) — the line lengthens and shortens on the step. Leg fills (chords and `add`) must meet the torso cut and each other without gaps, otherwise a transparent triangle shows under the hem; the gap at the crotch is closed by the figure's own fill without lines, and the crotch stub stays in no part — the near leg's line ends at the T-junction (loader runner, 2026-10-09). References for line masks — the witch with the cat and the loader runner: `examples/ballpoint-pen/scenes/` (their redrawn copies in `svg-extra/`).
- Torso on tight line masks too (loader runner, owner 2026-10-09): every cut line ends round and lines meet at junctions without gaps. Torso, limbs and the line between them end at the same junction point (round ends overlap). A short side line that runs from the waist to under a raised arm belongs to the arm, and the arm turns about the middle of that line: its bottom then slides along the waistline and the shoulder line slides along itself, so neither junction opens; start the arm's shoulder line 30–40 px into the torso's line. A line that lies on another contour of the compound path (the waistline) is found only from points on that line itself, away from junctions; check the found width (a thin waistline vs the thick outline). When a line moves from one part to another, move the white fills too: the upper part's fill (chord and `add`) stops 6–8 px short of the lines that now belong to the part below it, otherwise its straight edge shows over that part (a hard edge across the sleeve). Where two white fills meet, the lower part's `add` reaches 10–20 px under the upper one: two coincident anti-aliased edges leave a hairline seam. Check fills over every frame of the loop, not only the key pose. A white line split at its corner between body and leg (cat): if the leg also shifts (lift on the swing), the body piece gets the same shift, otherwise the line tears at the corner. Loop seam check: frame op equals frame 0 by keys (lint `seam`), and the pixel change across 63→0 must equal the change at other step keys (31→32); frame op itself is outside the loop and must not be rendered. Do not split a white line with a straight-edged mask: at any bend the cut corners stick out past the round dot (a kink). Redraw each piece in `svg-extra` as a round-capped stroke along the line's center (both pieces end at the exact corner center found with `centerline`), so the round ends coincide at every angle.
- Animals (2026-10-09, the witch's cat): walk with a diagonal gait — near hind with far front, then far hind with near front; the paw in the swing rises; swing about ±16°. The paws of a filled silhouette are cut off as separate vectors (as in the owner's Figma), not by masking copies of the body: the body without them, each of the four paws moves on its own; the far paws are under the body, rotating at the top. A hind leg bends at the knee: the thigh stays, the shin turns. A white dividing line is cut at its corner into two pieces — the one along the body stays, the one along the paw moves with it — and the paw's axis goes into that corner: the line bends instead of tearing or sticking out (a white dot on the bend).
- No white backing (`backfill`) and no trimming lines by scaling to zero.
- Step: the legs converge to parallel and diverge to the SVG pose (rigid legs — about ±14°), do not go deep behind one another; the torso bounces on the pass.
- Short legs under a skirt or dress (the witch, owner 2026-10-09): "the knees need to be extended" — draw the legs longer upward under the dress (`svg-extra`: a fill and two capsule lines continuing the sides of the leg), the axis is in the new hip, then the hips are close together and a straight leg walks by a rotation of ±40° with a shift of ±60, as in the loader: the legs swap places, the leading one in the swing rises. Otherwise the top of the leg sticks out from under the hem as a "box", and the legs break.
- White dividing lines on a filled silhouette (the cat's paws) are extended to the silhouette's edge — with drawn-in capsule ends, otherwise on the paw's rotation the line breaks off inside.
- A leg extension continues the leg's sides strictly in a straight line: take the direction from the last 15–20 centerline points at the end of each stroke, same width, not by eye — otherwise a "knee" appears at the seam (owner: "broke the legs at the knees again", 2026-10-09).
- A straight leg turns as one rigid piece with its boot: never counter-rotate the boot — any opposite turn breaks the shin at the bootleg edge. On the pass the whole leg lifts along an arc.
- `bounds` in lint checks a part's rotated bounding box, not its drawing: a rotating boot can report a false exit off the canvas — confirm with the pixels at the frame edge.
- Where the body line was cut out from under a sawn-off arm, the remaining line (the dress corner under the fingers) gets its own round end: a circle the thickness of the line in `svg-extra` under the arm, at the edge of the cutout.
