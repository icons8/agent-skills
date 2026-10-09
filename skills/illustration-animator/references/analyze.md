# Analyze



## Root

Run every `node engine/bin/…` command from the skill folder (the folder with `SKILL.md`, one level above this document), with the style folder as an absolute path. Documents cited below are relative to this document's folder.

Input: a style folder, e.g. `styles/plain/`, with `svg/*.svg` inside. If the user gave a folder that directly contains SVGs, that is `svg/`, and the style folder is one level up.

`no-stop` mode: don't ask anything at the end, run the create step right away in the same mode.

## 1. Preparation

1. Style: the start of the file names (`notion-line-art-…`, `plain-…`, `comic-…`, `flexy-…`, `black-chalk-…`, `main-…`, `journal-…`, `organic-…`, `ballpoint-pen-…`, `bold-people-…`) or the folder name; the id is the file name in `styles/`. If there is no style file, work by the common rules and say so in the first line of `scenarios.md`.
2. Read `styles/common.md`, styles/<style>.md (including "Lessons" and "User bans" — they outrank everything else) and, if it exists, styles/<style>.lessons.md (new lessons not yet accepted into the main file) and `scene-format.md`.
3. Environment: if `node engine/bin/make.js` fails with "Environment not ready", run `node engine/bin/setup.js` once.
4. Don't redo scenes that are already done (`scenes/<name>.json` exists) unless the user asked.

## 2. Scenes — in batches via subagents

Split the illustrations into batches of 4. Each batch is done by a separate subagent (general-purpose). It is given: the SVG paths of the batch, the style folder, the style, this whole section (steps A–G) and the paths to the rules: `styles/common.md`, styles/<style>.md and `scene-format.md`. The first thing the subagent does is read all three (in the style file — including "Lessons" and "User bans"). The main agent doesn't spend its own context on analyzing illustrations.

For each illustration the subagent:

**A. Looks.** `node engine/bin/preview.js <svg> --labels --out <style folder>/previews/<name>-labels.png` — open the image. Numbers of elements that coincide in place are merged into one label ("4·5" — usually a fill and its outline). `node engine/bin/els.js <svg>` — the list of elements with color and bbox.

**A½. Decides what to cut.** Per `common.md` "Fused parts": if what must move is fused into one outline with something else (an arm with the torso, a character with a counter), that is a cut and a pinned seam, not a refusal. The story fits a bend and a tilt (up to ~15–20° at a joint), without drawing what is hidden. "Not animatable: <why>" — only if every story would need to reveal something the drawing doesn't have.

**B. Object affordance.** Before the story — for each object, by its shape and role in the scene: what motion it asks for by itself. Round things roll or spin, a wheel and a gear turn, a loader ring rotates around its center, a clock hand goes round, a pendulum and a sign swing, a door and a lid open on a hinge, a lever and a button are pressed, a spring compresses, a flag and cloth ripple, liquid pours, a lamp lights up. Write down for yourself a list "object — motion"; the story (step C) is built from these motions. Pulse, swelling and floating are not a substitute for the motion the object asks for (a round loader is rotation, not a wave of swelling).

**B½. Answers for itself what the viewer should feel.** One phrase ("light pleasure of a press", "familiar night tiredness"). This question is not asked to the human.

**C. Comes up with the story** from the affordance motions (step B) by the rules: action and reaction, one action at a time, a symbol-attribute as the carrier of meaning, the style's scheme and durations. Floating and swaying — only on top of the story.

**D. Marks up the parts.** Groups elements into meaningful parts (cursor, icon, hand, forearm, palm). Checks each part: `node engine/bin/preview.js <svg> --els <indices> --out <style folder>/previews/<name>-<PART>.png` — all pieces of the part must be one object, with no foreign pieces. If different objects are fused in one element (`node engine/bin/els.js <svg> --sub <number>` shows the outlines) — list in the part only the outlines it needs (`"17.0"`, `"17.1"`). If they are fused into one outline — a cut (`cuts`, `scene-format.md` "Cut and pinned seam"): the drawing with a grid `node engine/bin/poses.js <svg> --grid --out <style folder>/previews/<name>-grid.png`, check the cut with `poses.js <scene> --cuts --grid`, the cut-off part gets `pin`. Bendable parts get `bones.joints` along the joints. Attachment points go in `joints`.

**E. Lays it out on the timeline.** The scenario limit is hard, 3 minutes: time is up — the scenario is fixed as is. If the story rests on the peak of the action, the output loop starts before it (`start`), and the first frame doesn't have to match the SVG. Tracks with roles and beats; templates with the style's starting parameters fitted to the scene (amplitude, timing, curve, pivot), or custom keys. `fr` and `op` — per style. The key pose is the author's frame 0; `start` — where the output loop starts (per style). Writes `scenes/<name>.json`.

**F. Checks the build.** `node engine/bin/make.js <style folder>/scenes/<name>.json --lottie-only --out <style folder>/.analyze-check`. Reads `<style folder>/.analyze-check/<name>.status.json`: `done` — ready; `failed`/`error` — fixes the scene by `issues`/`error` and repeats (up to 3 times). If the scene has a cut — also looks at the seams in the strongest poses: `node engine/bin/poses.js <scene> --frames <peak frames> --box <seam> --cell 400 --out <style folder>/previews/<name>-seam.png`. If it doesn't work out — leaves the scene and writes the reason as the last line of `<name>.story.md`: "Build failed: …". If it built — checks the rhythm: `node engine/bin/rhythm.js <style folder>/scenes/<name>.json --style <style>`; fixes the hold and duration misses (`misses`) right away if that doesn't break the story.

**G. Writes** scenes/<name>.story.md: 2–4 lines in plain language — what happens and in what order. No frames, parameters or part names.

The subagent returns only a list: name — built / not built / not animatable: <why>.

## 3. scenarios.md

1. For each illustration: `node engine/bin/preview.js <svg> --out <style folder>/previews/<name>.png`.
2. Assemble `<style folder>/scenarios.md`. If the last line of `<name>.story.md` is "Build failed: …", it goes into `scenarios.md` in plain words ("Couldn't build: …"):

```
# Scenarios: <style>

## <name>
![](previews/<name>.png)
<2–4 lines from <name>.story.md>
```

3. Delete `<style folder>/.analyze-check/` and `previews/*-labels.png`, `previews/*-<PART>.png`, `previews/*-grid.png`, `previews/*-seam.png`.

## 4. Then without stopping

The user doesn't read the scenarios — the agent decides them (owner, 2026-10-08). Don't ask; run the create step on this style folder right away. Name the non-animatable scenes (with the reason) in the create/verify summary.
