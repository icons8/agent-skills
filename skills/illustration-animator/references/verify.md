# Verify



## Root

Run every `node engine/bin/…` command from the skill folder (the folder with `SKILL.md`, one level above this document), with the style folder as an absolute path. Documents cited below are relative to this document's folder.

Input: a style folder with `scenes/` and `out/`. It starts by itself after the create step or manually.

Modes:
- normal — after create;
- `no-stop` — lessons are **not written**;
- manual — a user remark ("bad" or "good", section "User remark").

In normal mode, at the start clear `<style folder>/.verify/new-lessons.md` (an empty file): only the lessons of this run stay in it.

Before working, read `styles/common.md`, styles/<style>.md and `scene-format.md`.

## 1. What to fix

For each scene read `out/<name>.status.json`:
- `failed` — the list of `issues` from the checks (seam, jumps, jerk or speed kink `speed`, parts overlapping each other `overlap`, parts that flew off, bend, going off the canvas, two reactions at once, no story, key pose differs from SVG). `speed` is fixed by the curve, not by time: from rest — `soft`/`inOut` or a template with a spring, `out`/`back` — only as a continuation of ongoing motion; `overlap` — by the trajectory (arc `arc`, another pivot, a smaller swing), and if the touch is intended by the story — `touch` on the part; `cut` (a cut seam shows at rest) — move the cut line; `tear` (the cut tears the drawing in motion) — pin the seam with `pin.line` along that line or move the polygon's side to empty space (`scene-format.md` in the analyze step, "Cut and pinned seam");
- `error` — the scene doesn't build, the reason is in `error`. If `error` looks like an environment failure rather than a scene one (Chrome didn't start, ffmpeg crashed, "could not delete old file", "Environment not ready", "did not finish within") — first `node engine/bin/setup.js` and once `node engine/bin/make.js <scene>` without edits; fix the scene only if the error remains;
- `running` older than 10 minutes or no status — once `node engine/bin/make.js <scene>` without edits, then as usual;
- `done` — goes to the judge (step 2).

## 2. Judge

For each `done` scene: `node engine/bin/sheet.js <style folder>/scenes/<name>.json --out <style folder>/.verify/<name>`.

The judge is a **separate subagent** (general-purpose) with a fresh context, one per batch of up to 6 scenes. The limit is hard — 3 minutes per scene (put it in the prompt); if it doesn't make it — the scene goes on by the script checks, without a judge verdict. It is given: the path to `judge.md` ("checklist" mode), for each scene — the folder with `sheet.png`, `blur-*.png`, `first.png`, `ghosts.png` and `speed.png`, the text of scenes/<name>.story.md and the style. Verify itself doesn't evaluate scenes.

The judge answers with a JSON array, one object per scene. Verify matches the objects to scenes by the `scene` field; if there is no answer for a scene or it can't be parsed — ask the judge once more only about that scene.

Any `false` in `checks` or `story_checks` — the scene goes to fixing with that description. `notes` lead to fixing only when they name a real defect (a part that flew off, a jerk, a dead pause, two reactions at once); cosmetic remarks don't use up an attempt.

## 3. Fixing (up to 3 attempts per scene)

Exception: if `frame0` fails and the status has `warnings` (clip-path, mask, stroke, text, image, `<use>`) — this is an engine limitation, the agent won't fix it. The scene goes straight to `manual-review.md` (it lives in the style folder) without attempts; the reason in plain words, not parser text: "the illustration has a clip/mask/stroke/text — the engine doesn't carry it over".

A `frame0` problem in the status has two frame numbers: `frame` — the scene frame (the key pose, 0) and `outputFrame` — the frame of the output loop where that pose stands.

Each scene is fixed by a separate animator subagent; the limit is hard — 4 minutes for all the scene's edits after the judge (put it in the prompt); time is up — the best build so far stays. The first thing it does is read `styles/common.md`, styles/<style>.md and `scene-format.md` (the same three files as the analyze step). It receives the scene, `story.md`, what was found (issues, error or the judge's answer) and the style rules, edits `scenes/<name>.json`, rebuilds with `node engine/bin/make.js <style folder>/scenes/<name>.json` (the default result goes to the style folder's `out/`) and, if `done`, checks the rhythm: `node engine/bin/rhythm.js <style folder>/scenes/<name>.json --style <style>` before the edit and after. A fix must not drop the `score`: if it dropped, return the holds and durations to the style profile (`misses` will hint) and rebuild — that is the same attempt. Then the judge again (step 2). No more than 3 attempts. What remains goes into `manual-review.md`:

```
## <name>
![](.verify/<name>/sheet.png)
What's wrong: <in plain words>
What was tried: <1–2 lines>
```

## 4. Lessons

After fixing: if the same flaw showed up in a second scene or was caused by a technique (template, parameter, motion type) rather than a typo — it's a lesson. Write it to styles/<style>.lessons.md (create the file if it doesn't exist; don't touch the main `<style>.md` — the owner moves lessons there via PR), as a line:

`- Don't <what> → do <how> (<why>). <YYYY-MM-DD>, scene <name>, source: verify`

Rules of the section:
- a new lesson that contradicts an old one replaces it; similar ones are merged into one;
- no more than ~40 lessons in `<style>.lessons.md`; on overflow, condense into more general ones;
- don't touch the "User bans" section and don't contradict it.

Append each new lesson of this batch to `<style folder>/.verify/new-lessons.md` (lines `- …`).

## 5. Summary

1. One summary line: "done N, fixed M, to manual K" + "new lessons: …" (if any). The path to `manual-review.md` if it's not empty.

## User remark

The user writes: "<scene> — bad" (or «<сцена> — плохо»; may be harsh, may come with "because …" or «потому что …»), or "remove lesson …" (or «убери урок …»), "rewrite lesson …" (or «перепиши урок …»).

**Bad:**
1. Look at the scene: `node engine/bin/sheet.js <style folder>/scenes/<name>.json --out <style folder>/.verify/<name>`, open `sheet.png`, read the scene.
2. Formulate which technique is bad (template, parameter, motion type, timing). If the reason isn't clear and the user didn't name it — one short question.
3. Write the ban into the section "## User bans" of the style file: `- Don't <what> → do <how>. <YYYY-MM-DD>, scene <name>`. Delete the lessons that contradict it.
4. Find scenes with the same technique in `<style folder>/scenes/*.json` (same template, same part type, similar parameters) and redo them together with this one: scene edit → `node engine/bin/make.js …` → judge.
5. Answer in one line: "ban recorded, N scenes redone: …".

**Good:** the user writes "<scene> — good" (or «<сцена> — хорошо»; also "super", "ok", "the best" — «супер», «ок», «лучшее»). Copy `scenes/<name>.json` to `examples/<style>/<name>/scene.json`, the Lottie from `out/<name>.json` to `lottie.json`, the user's words with the date to `note.md`. This is a style sample and a control scene: rule edits must not break it. Answer in one line: "sample recorded".

**Remove / rewrite a lesson** (or «убери / перепиши урок») — find the lesson in the "Lessons" section and do it right away. Answer in one line.
