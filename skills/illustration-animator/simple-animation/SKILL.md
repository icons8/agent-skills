---
name: simple-animation
description: Turn one SVG illustration of a whole object (an icon, a spot illustration, a device, a ghost, a robot, a bust) into a seamless looping Lottie JSON with a short story - look at the drawing, rig its parts in a short Python build script, render every frame with Skottie, check the loop and fidelity, deliver JSON plus a GIF preview. Use when illustration-animator picks the simple path, or when someone sends an SVG of a whole object and wants a Lottie, a loader or an icon loop.
---

# SVG → looping Lottie

The user hands over drawings; you hand back finished, verified loops. They should not have
to describe the motion, check the frames, or fix anything themselves.

## What "done" looks like

For each SVG: `<plot>_loop.json` (Lottie, transparent, canvas = SVG viewBox, 30 fps,
3–8 s unless asked otherwise) + `<plot>_loop_preview.gif`, and a short note per file: the
plot in 2–4 sentences and anything they should know (e.g. masks used). Layers named
sensibly (`Bell`, `Bubble`, `Arm L upper`…), parented where it's a rig, main accent colour
exposed as the `accentColor` slot.

## Workflow

### 1. Set up once per session
```bash
node "${CLAUDE_SKILL_DIR}/../engine/bin/simple.js" tools
```
It installs nothing: it lists the Python packages and the Skottie renderer (canvaskit-wasm 0.41.1) that are missing and prints the install commands. Show them to the user, run them only after the user agrees, then run `tools` again.

`${CLAUDE_SKILL_DIR}` is the folder that holds this SKILL.md; the engine is shared with the router, one level up (`../engine`).

### 2. Look at the drawing before deciding anything
```bash
node "${CLAUDE_SKILL_DIR}/../engine/bin/simple.js" run "${CLAUDE_SKILL_DIR}/scripts/inspect_svg.py" art.svg      # index, colour, bbox per shape + art_labels.png
```
Open `art_labels.png` and read it. Work out which shape indices form each semantic part
(head, arm, bubble, dots, pages…). Typical Illustrator pattern: a white fill followed by its
outline, so parts come in pairs. Note joints and natural pivots (hook, feet, tail tip, wrist).

### 3. Decide the plot
First read `references/style-notes.md` - the art director's principles. Run its **analysis
pass** on this illustration (depth, controls, drivers/passengers, loose parts, resolution) and
let the answers shape the story. They win over anything below.

Ask: what does this object *do*? A bell rings, a megaphone shouts, a loader runs, a teacher
explains. Build one small story: setup → action → hold → reset. One hero motion, one or two
supporting, the rest still or barely breathing. Duration 3–8 s. If the user asked you to
invent it, tell them the plot in a few lines and start building right away - don't wait for
approval; they'll redirect if they want. Pick patterns from `references/motion-recipes.md`
(read it the first time in a session).

### 4. Build with `scripts/lot.py`
Write a small build script per illustration (see `examples/bell_ring.py` for a pop-in/pendulum
scene and `examples/skeleton_run.py` for a parented rig). Run it with `node "${CLAUDE_SKILL_DIR}/../engine/bin/simple.js" run build.py` (the module's `scripts/` are on the Python path). Key rules - each one cost a broken
deliverable before:

- **Paint order.** `grp(P, idxs)` takes SVG indices and keeps SVG stacking. Never hand-build
  group lists in your own order: Lottie draws the first shape on top, and a white paper fill
  above its text lines makes the text vanish.
- **Layer order.** Add the front-most layer first; a `parent=` child is inserted right above
  its parent. Match the SVG's stacking between parts (hands that grip a pencil are drawn after
  the pencil, so the pencil layer goes below the body).
- **Pivots.** `layer(name, groups, pivot, …)` sets anchor = position = pivot in canvas
  coords, so at rest everything sits exactly where the SVG drew it. Choose real joints.
- **Seamless loops.** Every property ends at its frame-0 value at `op`; every `sine` period
  divides `op`; cyclic events that cross the loop point go through `wrap_keys`.
- **Occlusion.** If a moving part passes behind something drawn in front of it, hide it there —
  even if the front thing is an unfilled outline: `silhouette()` + `matte_layer()` +
  `set_matte(inverted=True)`, matte parented to the front object.
- **Bend, don't cut.** Limbs and soft parts deform with `deform_group` + `bend_warp`; rigid parts rotate.
- **No linear spatial motion.** Use the named eases in `EASE`; sampled sines are already smooth.
- **Things the loader skips:** unfilled shapes (strokes without fill), clip paths, gradients,
  images, text. If the art depends on them, say so and expand strokes / convert text to paths.
  Group transforms are baked in automatically.

### 5. Verify - yourself, every time
```bash
node "${CLAUDE_SKILL_DIR}/../engine/bin/simple.js" check name_loop.json --svg art.svg
```
The command takes frame 0 as the rest frame (frame 0 must be the drawing), runs the module's checks (seam, frame edge, still layers, a sheet of key frames and a GIF, in a `check/` folder beside the JSON or in `--out`) and the skill's own bans: a part that fades, a loop shorter than 24 frames, a scene where nothing moves. Exit code 2 and a list of issues: fix them first.
- **static layers** - every listed layer must be meant to stay still (on revisions: nothing that
  moved before may have stopped).
- **frame edge** must say OK - nothing may ever be cut by the comp edge.
- **seam** must say OK (the jump from last to first frame ≈ a normal frame step).
- **frame 0 vs source** must match the SVG (checked on black and white; the module reports < ~1.5). A mismatch almost always means wrong paint order or missing shapes.
- **Re-read `references/style-notes.md` and check the loop against each rule.**
- **Open `name_sheet.png` and look at it.** Check key beats: anticipation, impact, pop, hold,
  exit. Zoom (render a few frames larger with `render.js`) where things touch - hands on
  objects, dots inside bubbles, limbs at joints.
Fix and re-check before showing anything. Never hand over a loop you haven't looked at.

### 6. Deliver
For the MOV without background and the white MP4 as well as the JSON and GIF: `node "${CLAUDE_SKILL_DIR}/../engine/bin/simple.js" deliver name_loop.json --name <scene> --out <folder> [--preview <folder>]` (it lightens the JSON; `--no-optimize` keeps it as built).
Send the JSON and GIF for each illustration, then a few lines per file: the plot, duration,
anything non-obvious. Mention masks if used (not every player supports them equally). Offer
to change plot/timing; don't list every keyframe.

## Learning from feedback
When the user reviews a loop: fix it, then name the general principle behind each comment (a comment is about one picture; the principle must work for characters, devices, nature, icons and scenes alike) and show the user the wording. The files of this skill are never edited: an update replaces them. If the user wants the principle kept, write it into a notes file in their own project.

## Batches
When several SVGs arrive together, treat each as its own illustration with its own plot,
but keep a consistent house style (30 fps, similar energy, same easing family). Verify each.

## Reference
- `scripts/lot.py` - loader, groups, keyframe helpers (`anim`, `sine`, `bob`, `wrap_keys`,
  `wipe_mask`), occlusion (`silhouette`, `matte_layer`, `set_matte`), physics (`sample`, `pendulum`), splitting merged art (`ink_mask`, `mask_to_paths`, `mask_group`), reveals (`wipe_mask`, `axis_reveal`), path bending (`deform_group`, `bend_warp`, `motion_frames`), `Doc` builder.
- `scripts/inspect_svg.py`, `scripts/check.py`, `scripts/render.js` - inspection, verification, Skottie render.
- `references/style-notes.md` - the art director's rules (read every time).
- `references/motion-recipes.md` - timing/easing recipes for common illustration beats.
- `examples/` - complete build scripts (alarm clock, AI brain, Saturn constellation, microphone, DNA + cell, chemistry pour, coffee cup, zero balance, ghost, flashlight, GPS, handshake, new email, wallet; plus bell and skeleton rig demos).
