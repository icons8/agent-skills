# Changelog

What changed in the `illustration-animator` skill, newest first. Each entry says what the skill does differently now, in terms of what you see in the result.

Not every part of the work is in the packaged skill. A part that lives only in the skill's source tree is marked "source tree only": the scoring script of the router, the After Effects build path, and the tools that measure the skill itself (regression and capability runs, the run ledger, grids). They are listed here so the history is complete, and they are not in this folder.

## Unreleased

### Choosing how to animate

- **The skill is now a router with two paths.** `illustration-animator` keeps its name and picks the path per illustration: `simple-animation` for whole objects whose parts swing, turn or pop (a bell, a clock, a ghost, a robot, a bust), `complex-animation` for people and animals with limbs, fused outlines and anything that has to be cut. A borderline picture is looked at, not guessed. The user can force either path for the whole folder; a simple scene that fails the checks twice moves to the complex path. The scoring script of the router is source tree only.
- **The simple path is one short build script per scene.** No scenario to read, no cutting by an analysis, one round of checks, about four minutes per scene. The style's bans and lessons are checked on top of it: opacity fades, a loop that is too short, a still scene, frame 0 against the SVG on black and white. It delivers Lottie, GIF, MOV and a white MP4.
- **The simple path runs on a swappable module.** The module sits in one folder; one adapter is the only place that knows its inputs and outputs. The adapter stops with the reason instead of a stack trace when a file it needs is missing. Swapping the module is source tree only.
- **The simple path needs no copyleft package.** SVGs are rendered with `resvg` (the `resvg-py` package, MIT; resvg itself is MIT or Apache-2.0) through a stand-in for the module's renderer calls, so Cairo, CairoSVG and PyMuPDF are neither needed nor suggested. The `tools` command lists the missing Python packages and prints the pip command; it installs nothing.
- **The complex path is the former skill, unchanged.** Analyze, create, verify and the judge, now in `complex-animation/`.

### Analysis

- **A scene brief comes before the story.** What is in the frame, the action as three or four beats of visible change, each object with the motion its shape asks for (a round loader turns, it does not pulse), the mood, and what stays still and why. A living part is never marked "still" without a reason.
- **A Pace line fixes the tempo before the code.** `Pace: 60f loop, 12f accents, soft, playful` (loop length, frames of one push, easing, feel). The verify step compares it with the build: the loop length, the accent frames, the share of easing families by the main stroke of each run and the feel (a calm scene that overshoots, a snappy one with slow strokes) are errors; the style's rhythm profile only warns. A story of the old form, without labelled lines, is skipped.
- **The story is the intent in a few lines.** The frame, the motion with its axis and trajectory, the mechanism (what turns about what, what is cut, what grows or folds; the parts named there are never left standing because they are hard to cut), a facing line for a walker, and why. Five worked examples are in the analysis step.
- **The SVG is checked before the batches.** Strokes, text, images, `<use>` and `<line>` are set aside with the fix; `clip-path` and `mask` only if frame 0 fails to match the drawing.
- **Style profiles and a story catalog.** Rhythm profiles for 71 Icons8 styles and a catalog of 74 story files, looked up by grep. Order of authority: the user's bans and lessons, then the style's numbers, then the common rules, then the catalog.
- **A people gate, open for puppets.** A person, an animal or a hand drawn on hinges (arms, legs and head are separate shapes that overlap the body at the joints) is a puppet: nothing has to be cut, so the gate is open and it is built in the same run. A fused figure, or one where a limb would have to be cut and its hidden part redrawn, stays behind the gate; the reason goes to `scenarios.md`.
- **A fused figure says "we won't cope" and the run waits.** A figure that is not a puppet and needs a cut (arms and legs in one outline, steps with bent knees) is analyzed like any scene and gets `Warning: stop, we won't cope - <reason>` as the first line of its story. When the whole batch is analyzed and any scene has the warning, nothing is built until the person says go; then the warned scenes are built as well as they can be and named in the summary. A puppet never gets the warning. Reference and capability scenes never stop.
- **One loop length and period per track** in the plan; decor moves only by its affordance or by the story.

### Motion

- **Walking and running bend at the knee.** The rules give the ranges (hip, knee in the swing, a run, the standing leg), say that a flat one-piece leg is cut into thigh and shin with an overlap, and ban a leg that bends the other way. `angles.js` reports a knee bent backwards from the scene's `facing`, and the plan carries a `Facing:` line.
- **The deform check measures pinned parts on the canvas**, not in the layer's own scale; bones may compress a limb by 35 %, a blended pinned rigid part by 20 %. Fewer false "deform" stops on walkers, real folds still caught.
- **Through easing is the default for a swing through rest and for the loop seam.** The tangent comes from the neighbouring keys, speed is zero only at the edges of a swing, and the motion stays smooth across the seam. Opt out with `through: false` or an explicit `easing`.
- **Every part lives softly or stands for a named reason.** Replaces "everything moves". A cause chain for mechanisms (what pushes what), one 2 s loop for simple scenes, repeated gestures take the long end of the range, no frame where everything stands, a 2-3 frame delay only for a mechanism push.
- **Whole figures move as one block where they are fused**, with motion floors and a ceiling for fused blocks. `node engine/bin/vigor.js --check` reports parts that barely move or that swing so far that the drawing pulls apart. Reactions of different parts start at least 6 frames apart. Line integrity outranks vigor.
- **The loop is read as a whole.** The engine measures the energy of the frame from the speed of all tracks: a long rest that ends in a burst at the seam is an error; a held frame, an energy jump across the seam and a period that does not divide the loop are warnings. Files of one scene may differ in length, each is a clean loop on its own, and an MP4 is never cut mid-cycle. `node engine/bin/loop-energy.js` measures any Lottie by pixels.
- **A limb gesture is a rotation of the whole cut-off limb or its segment about the joint**; bones add only a final bend of about 10 degrees. `node engine/bin/angles.js` reports the largest rotation and bend of the limbs against a floor of 14 degrees, as a hint to the judge, not a gate.
- **Morph between two drawn poses.** A scene may name poses (`poses`, a part's `morph`, `m` keys); the Lottie gets path keys at the `m` keys with the same curves. The poses keep the same artboard, elements, point count and start point as the SVG; a mismatch is an error naming the element.
- **Style rules for new tests.** Little (balloons float and are not swayed from their feet, nothing on the back of a sheet, a wrist pivot for a hand with a tool, no rigid-leg walk), Black Chalk (below), and the corrections that came with them in the common rules.

### Line integrity

- **A narrow seam detector.** Thin dark pixels along a cut that the drawing does not have at rest are an error, and the cut falls back to moving the part whole.
- **Line-end warnings with the places to look.** Where a line end leaves foreign ink or a new ink contact appears, the engine writes `places.png` and `places.md` for the judge.
- **The overlap at a cut grows by itself** (3 to 12 px per cut) until the seam closes.
- **Rules on foreign lines.** A moving part keeps off lines that belong to other parts; cut outlines are extended at the break; lines that meet in the drawing keep meeting in motion.
- **Tear is measured by visible size.** Up to 2 px at the output size is a warning, not a failure.

### Verification and the judge

- **The judge gives advice in one round per scene.** The script keeps the counter and refuses a second round. There are ceilings of 180 seconds and 60,000 output tokens; a judge over them is skipped with a note. The brief is assembled by a script from the style's rules and lessons, the common rules, the judge's examples and the closest rated clips (first-attempt pluses first, then every minus).
- **No judge-driven rebuild loop.** The judge's remarks go to the user in `manual-review.md`. The machine checks decide what is rebuilt: at most two tries per check, then the part moves whole, the old cut is kept in `.attempts/`, and the case is written to `manual-review.md`. The judge may answer "unknown" where the pictures do not decide.
- **The judge sees the loop.** `seam.png` (last frame next to the first) and `loop.md` go into its sheet with a 13-question checklist (does the loop read, is there extra motion, and so on). Sheets are drawn with Skottie (`canvaskit-wasm`, an exact dependency) with Chrome as the fallback.
- **Three hard rejects come first.** The judge answers `direction` (does it move the way the picture says), `anatomy` (no limb bent the wrong way, no torn or detached part) and `intact` (the drawing is whole) before the checklist; `false` in any of them is the first remark of the report and the scene is not called passed. For a walking figure "unknown" counts as a fail. The drawing outranks the story: the judge does not ask for a bigger swing or a deeper squat.
- **A character must show life.** The judge looks for breathing, a look, a blink, weight carried, no freezing and no jumping; a head that hardly moves is a "no" on its own, a blink too small to see is "unknown", a blink that changes the expression is a broken drawing. A bigger swing is never the answer.
- **The legs get their own sheet.** `legs.png` shows the legs of the key frames large, because they do not read on the 16-frame sheet.
- **A pair judge for comparing two builds** (`pair.js`): frames and a motion map (heat, trail, energy strip) of both, shown in both orders; a disagreement between the orders is a tie. The mechanism the brief asks for counts before tidiness.
- **`timing.json` is written for every scene** so that the cost of a scene is known.
- **A scene the user calls bad** still becomes a ban for the style; a refinement of one scene by several remarks keeps a short journal and turns it into rules.

### File weight

- **A post-pass optimizer over the finished Lottie.** Shorter numbers, thinned per-frame bake keys, merged sub-pixel segments of dense outlines, rigid parts moved to group transforms. `make.js` runs it (`--tol` sets the tolerance, `--no-optimize` turns it off); `node engine/bin/optimize.js` and `node engine/bin/lottie-psnr.js` run and check it by hand. On the reference scenes, 5.14 MB became 2.86 MB at PSNR of 40 dB or more, and the heaviest one fell from 71.6 MB to 12 MB.

### Delivery

- **A white MP4 preview** (`preview-mp4.js`): H.264 from the scene's MOV at the scene's own frame rate and length. It refuses a MOV that would resample or break the loop.

### Black Chalk

Rules from blind comparisons of finished animations, one per rejected defect: beams and light lines move in sync with the source; document text and photos stay still unless the story needs them; clasps, buttons and hardware do not pulse; one soft cycle per beat, no two-snap pulse; the backdrop never covers a holding hand; a disco ball swings and its sparkles flash, it is not squashed as a whole; progress ticks appear in the direction the bar fills; bubbles and drops appear top to bottom and fall continuously; a mark appears behind the tool tip after it arrives; an object flying along a path stops and shrinks to zero at the end of the line; wheels are cut exactly along their own outline; a source SVG may carry a stray black silhouette fill under the outline, so frame 0 is compared with the intent by eye.

## 0.6.1

The skill reads like the rest of the Icons8 line: `SKILL.md` has hard rules, when not to apply, never ship, what to hand back and credits; the steps are written as instructions; `ouch`, `motion` and `icons8-design` point to the skill.

## 0.6.0

First release. Static SVG illustrations of one style become looped Lottie JSON, GIF and MOV without background, and on macOS an MP4 with alpha: a story per illustration, parts with joints and tight line masks, characters fused into one outline cut and bent with a pinned seam, script checks and a visual judge, fixes within time limits, and a scene the user calls bad becoming a rule for the style.
