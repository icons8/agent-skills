---
name: illustration-animator
description: Bring static vector illustrations to life - turn a folder of SVG illustrations of one style into looped animations (Lottie JSON and MP4 without background). For each illustration it invents a short story, cuts the drawing into moving parts with joints and masks, builds the animation, checks it with scripts and a visual judge, and fixes it. Use when the user asks to animate SVG illustrations, make Lottie from SVG, or fix such an animation ("<scene> - bad"). For UI transitions and easing use motion.
---

# Illustration animator

Talk to the user in their language.

The motion rules, style rules and reference scenes in this skill were trained on Icons8 animations and illustrations ([icons8.com](https://icons8.com)).

## Paths

`${CLAUDE_SKILL_DIR}` is the folder that holds this SKILL.md. Clients that do not fill the variable in: replace it with that folder's absolute path. The engine runs from there: convert the user's style folder to an absolute path first, then `cd "${CLAUDE_SKILL_DIR}"` and run every `node engine/bin/…` command from it. The step documents are in `references/`; the paths they cite (`styles/…`, `scene-format.md`, `judge.md`) are relative to `references/`.

## Setup

Needs [Node.js](https://nodejs.org). Once per machine:

```
node "${CLAUDE_SKILL_DIR}/engine/bin/setup.js"
```

It installs the npm dependencies into `~/.animator/`, uses an installed Chrome, Chromium or Edge (or downloads Chrome for Testing there), installs ffmpeg with Homebrew on macOS or winget on Windows when it is missing, and prints "Environment ready". Safe to re-run.

## Input and output

A style folder in the user's project with the illustrations of one style in `svg/` (e.g. `styles/little/svg/*.svg`; the file name starts with the style name: `little-…`, `rough-sketch-…`). If the user points at a folder that directly holds SVGs, that is `svg/` and the style folder is one level up. The result goes to `<style folder>/out/`: Lottie JSON, GIF and MOV, looped, without background; on macOS also MP4 (HEVC with alpha). Scenes built on Windows get their MP4 later on a Mac (`references/create.md`).

## Steps

1. **Analyze** — read and follow `references/analyze.md`: a story per illustration, parts, bones, timeline; writes the scenes and `scenarios.md`, then goes straight on.
2. **Create** — `references/create.md`: builds every scene.
3. **Verify** — `references/verify.md`: script checks, a visual judge (`references/judge.md`), fixes, lessons into the style rules.

The rules every step obeys: `references/styles/common.md`, then the style's own file in `references/styles/` if there is one. Scene format: `references/scene-format.md`. Walking and masking references: `examples/rough-sketch/`; tight line masks: `examples/ballpoint-pen/`.

## Time limits - hard

Per illustration: scenario - 3 minutes, animation - 7 minutes, judge - 3 minutes, fixes after the judge - 4 minutes. Note the time at the start of a stage (`date +%s`) and check it before every new round. Time is up - stop and deliver the best build so far; no extensions and no extra attempts. The deadline goes into the prompt of every subagent (animator, judge, fixer).

## User feedback

"<scene> - bad" (and why) - the manual mode of `references/verify.md`: the failed technique becomes a ban in the style rules and similar scenes are redone. "<scene> - good" - the scene becomes a sample in `examples/`.
