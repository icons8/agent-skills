---
name: illustration-animator
description: Turn static SVG illustrations into looped animations - Lottie JSON, GIF and MOV without background, and on macOS an MP4 with alpha. Picks the path per illustration - simple-animation for whole objects whose parts swing, turn or pop, complex-animation for people, animals and fused outlines that need cutting, joints and masks. Use when the user asks to animate SVG illustrations, make Lottie from SVG, or fix such an animation ("<scene> - bad"). For a ready animated illustration from the Icons8 catalogue use ouch; for UI transitions and easing use motion.
---

# Illustration animator

Talk to the user in their language.

## Paths

`${CLAUDE_SKILL_DIR}` is the folder that holds this SKILL.md. Clients that do not fill the variable in: replace it with that folder's absolute path, here and in every document of the skill. The folder holds two skills, `simple-animation/` and `complex-animation/`, each with its own SKILL.md, and the engine they share in `engine/`. Every engine command names the script by that path, `node "${CLAUDE_SKILL_DIR}/engine/bin/<tool>.js" …`, so it works from any working folder; give it the user's files as absolute paths. A subagent gets the absolute path of this folder in its prompt.

## Setup

Once per machine, `engine/bin/setup.js` as described in `complex-animation/SKILL.md` ("Setup": it installs nothing until the user agrees to its plan). The simple path also needs Python 3 with a few packages: `node "${CLAUDE_SKILL_DIR}/engine/bin/simple.js" tools` lists what is missing and prints the install commands for the user to run; it installs nothing itself. The build script of each simple scene is written by the model and runs as Python with the user's permissions, like any other command the agent runs.

## Choosing the path

Look at each illustration (open the SVG as a picture and list its parts) and choose the path for it. The user may force one path for the whole folder: then do not choose.

| The illustration | Path |
|---|---|
| A whole object or a few of them: a bell, a clock, a phone, a ghost, a robot, a bust, a plant, a device with a hand-free action | `simple-animation/SKILL.md` |
| A person or an animal with limbs that must bend or walk; a hand; a group of people | `complex-animation/SKILL.md` |
| Any picture where a part has to be cut out of a fused outline and the hidden part redrawn | `complex-animation/SKILL.md` |
| A set of illustrations of one style in a folder, to be analyzed and built as a batch | `complex-animation/SKILL.md` |
| Unsure | Look at the picture again; still unsure - `complex-animation/SKILL.md` |

A scene of the simple path that fails its checks twice goes to the complex path. Read the SKILL.md of the chosen path and follow it; the two paths are never mixed within one scene.

## Hard rules

1. **The motion comes from the object.** A loader ring rotates, a wheel turns, a door opens on its hinge; a pulse or floating never stands in for it. Tested: a round loader animated as a wave of swelling segments instead of one turn of the whole ring was sent back on review.
2. **Nothing is delivered unseen.** Before every delivery look at the whole preview yourself; a loop that was not looked at is not handed over.
3. **Faster, not slower.** Take the short end of every timing range. Tested: reviewers asked to speed animations up six times and never to slow one down.

## When not to apply

- A ready animation from the Icons8 catalogue: `ouch` finds and ships it.
- UI motion - transitions, easing, durations, hover and press feedback: `motion`.
- Raster images (PNG, JPG) and video as input: both paths read SVG only.
- A figure fused into one outline whose story would have to show what the drawing hides (a hand behind the back): say "not animatable" and why, do not draw new parts.

## Never ship

| Never | Instead |
|---|---|
| A scene built half on one path and half on the other | One path per scene; if the first fails twice, restart on the other |
| A pulse, float or fade in place of the motion the object asks for | The object's own motion: a turn, a hinge, a press, a roll |
| A loop that was not looked at from the first frame to the last | Look at the whole preview, then hand it over |
| A scene that failed its checks, handed over without saying so | Name the failed check next to the scene |

## What to hand back

The files of each path (see its SKILL.md), then one line per scene with the path used and anything the user should know. A scene that is not animatable is named with its reason. If setup stopped (no ffmpeg, no Python, the user declined the plan), say which and stop.

## Credits

Built by Icons8. The motion rules, style rules and reference scenes were trained on Icons8 animations and illustrations.
