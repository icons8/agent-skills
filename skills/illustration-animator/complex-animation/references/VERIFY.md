# Verify

`${CLAUDE_SKILL_DIR}` is the folder that holds this SKILL.md and `references/` (the engine is in `../engine`); engine commands, document paths and clients that leave the variable as is: "Paths" in `SKILL.md`.

## Time limits - hard

Per illustration: scenario - 3 minutes, animation - 7 minutes, judge - 3 minutes and one round only: nothing is rebuilt on its remarks except a named broken line (`no_tears`, step 2), and the runner refuses a second round (`engine/bin/judge.js`), fixes of script findings - 4 minutes. For scenes with people (a character, a hand, a group of people): animation - 15 minutes, fixes of script findings - 12 minutes; the rest as above. Note the time at the start of a stage (`node -e "console.log(Date.now())"`, milliseconds: works in every shell, PowerShell included) and check it before every new round. Time is up - stop and deliver the best build so far; no extensions and no extra attempts. The deadline goes into the prompt of every subagent (animator, judge, fixer).

Write the minutes of each stage, the cost of the scene and the outcome to `<style folder>/out/<scene>.timing.json`: `{"scenario_min": 2.5, "animation_min": 11, "judge_min": 2, "fixes_min": 6, "cost_usd": 4.2, "fix_rounds": 1, "stop_reason": "passed", "tried": "a longer swing"}` (`stop_reason`: `passed`, `limit` or `engine`; leave out what is unknown; optional `composition`: `character`, `hand`, `group` or `object`). `make.js` adds its own `builds`, `build_min` and `engine_stop` on every run (batch too) and keeps the keys you wrote. Do not write `first_try` - it is the user's word (`clean`: his first look took the scene without edits, `edited`: after them), set by `ledger.js rate`. The run ledger reads this file.

Input: a style folder with `scenes/` and `out/`. It starts by itself after the create step or manually.

Modes:
- normal - after create;
- `no-stop` - lessons are **not written**;
- manual - a user remark ("bad" or "good", section "User remark").

In normal mode, at the start clear `<style folder>/.verify/new-lessons.md` (an empty file): only the lessons of this run stay in it.

Before working, read `styles/common.md`, styles/<style>.md, `SCENE-FORMAT.md` and `<style folder>/rules.md` if it exists.

## 1. What to fix

For each scene read `out/<name>.status.json`:
- Attempt limit: `make.js` counts the failures of each check per scene in the status (`attempts`). The same check failing a second time ends the rebuilds: if it names a cut (`tear`, `cut`), the engine rewrites the scene without that cut (the part moves whole; the cut scene stays in `.attempts/<scene>.cut.json` of the style folder), builds it once more and lists the scene in `manual-review.md` (status `fallback`); with no cut to drop it just stops with the scene in `manual-review.md`. Do not start another fix round for that check.
- `failed` - the list of `issues` from the checks (seam, jumps, jerk or speed kink `speed`, parts overlapping each other `overlap`, parts that flew off, bend, going off the canvas, two reactions at once, no story, key pose differs from SVG). `speed` is fixed by the curve, not by time: from rest - `soft`/`inOut` or a template with a spring, `out`/`back` - only as a continuation of ongoing motion; `overlap` - by the trajectory (arc `arc`, another pivot, a smaller swing), and if the touch is intended by the story - `touch` on the part; `cut` (a cut seam shows at rest) - move the cut line; `hair` (the line of a cut shows in motion as a thin dark line along it that the drawing does not have at rest - the cut runs along a stroke at a sharp angle or the lower piece peeks out) - move the cut line across the strokes (a polygon side through empty space or square to the stroke), a pin along it, or a smaller swing; the tuck of the lower piece grows by itself where the seam opens (`ov`, up to 12 px, `SCENE-FORMAT.md`), but cannot hide a line that runs along the stroke; `tear` (the cut tears the drawing in motion by more than 2 px at the output size; a smaller gap is only a `warnings` line) - pin the seam with `pin.line` along that line or move the polygon's side to empty space (`SCENE-FORMAT.md` in the analyze step, "Cut and pinned seam");
- `error` - the scene doesn't build, the reason is in `error`. If `error` looks like a setup failure rather than a scene one (Chrome didn't start, ffmpeg crashed, "could not delete old file", "Setup not done", "did not finish within") - first `node "${CLAUDE_SKILL_DIR}/../engine/bin/setup.js"` (if it prints a plan instead of "Setup done", ask the user and run it with `--yes`; if it says ffmpeg is missing, give the user its command and stop) and once `node "${CLAUDE_SKILL_DIR}/../engine/bin/make.js" <scene>` without edits; fix the scene only if the error remains;
- `running` older than 10 minutes or no status - once `node "${CLAUDE_SKILL_DIR}/../engine/bin/make.js" <scene>` without edits, then as usual;
- `done` - run `node "${CLAUDE_SKILL_DIR}/../engine/bin/vigor.js" --check <style folder>/out/<name>.json` (exit 1 = findings): `sluggish` (the biggest swing under 60 px of 1200), `mostly standing` (under 30 % of the drawing ever changes), parts that never move (under half), and `falls apart` (a fused block of the plan swings past 35 % of its size or 25°: the cut must stay closed, no foreign line crossed). The script reads scenes/<name>.plan.md by itself: parts with `— still:` or `— why: symbol|background` (a like, a pin, the street, the table) are not asked to move. These are script findings like the others: one fix round per scene (step 3) - enlarge the swings to the plan's floors and give the standing parts the motion their plan line promised (an answer to the main beat or an affordance motion); a part standing for a named reason stays; a background or symbol never gets motion just to pass the floors (integrity outranks vigor). Then `angles.js` and the judge (step 2).
- `done` and a story with the labelled intent lines - run `node "${CLAUDE_SKILL_DIR}/../engine/bin/pace.js" <style folder>/scenes/<name>.json --style <style>` (exit 1 = findings). It reads the `Pace:` line of scenes/<name>.story.md and compares it with the build: the line must be there and readable; the loop is the length of the scene; the accent is within 3 frames or 35 % of the median motion; most of the motion runs on the easing the line names; the feel does not contradict the numbers. A missing line goes back to analyze's step B (write the line from the scene, then check), a mismatch is one fix round with the other script findings: change the scene toward the line when the line is the decision, the line when the scene has the reason to differ; the `warnings` (the style's range) go to the report. A story of the old form (no labelled lines) is skipped.

## 2. Gate: the machines, then the judge on the places

**The machines first.** A scene is open while any of these is open: the `make.js` checks (`seam`, `loop` - the loop rests and bursts at the seam, a period that does not divide the loop —, `speed`, `overlap`, `tear`, `cut`, `hair` - the line of a cut shows in motion as a thin dark line the drawing does not have at rest —, `bounds`, `frame0`), `vigor.js --check` (sluggish, mostly standing, parts that never move), `pace.js` (the `Pace:` line of the intent against the build) and, for a scene with limbs, `node "${CLAUDE_SKILL_DIR}/../engine/bin/angles.js" <style folder>/scenes/<name>.json` (how far the limbs swing against the approved scenes: `low` is a finding, `n/a` without limbs). Open findings go to step 3. The `warnings` of the status that start with `lineend` or `lineover` are not findings: they name the places where the end of a line came off the lines it stopped at or the lines of two parts meet anew - a moving part slides by design too, so these are places to look at, and the judge gets them cut out large.

**The judge - a gate for the integrity of the drawing, one round per scene.** The limit sits in the runner, not in this text: `node "${CLAUDE_SKILL_DIR}/../engine/bin/judge.js" prepare` writes the round to `<style folder>/.verify/<name>/judge.state.json` (and `judgeRounds` into the status), and a second claim for the same scene is refused; a refused scene goes on by the machines and your own look.

For each `done` scene without open machine findings run `node "${CLAUDE_SKILL_DIR}/../engine/bin/angles.js" <style folder>/scenes/<name>.json` and put its line into the judge's prompt as a hint (a `low` doesn't fail the scene by itself; a scene without limbs says `n/a`). Then `node "${CLAUDE_SKILL_DIR}/../engine/bin/judge.js" prepare <style folder> [--scenes a,b]`. For every scene it takes the round, draws `sheet.png`, `blur-*.png`, `first.png`, `ghosts.png`, `speed.png`, `legs.png`, `places.png` and `places.md` into `.verify/<name>/`, and writes one brief, the file `judge-brief.md` in `.verify/`: the style rules and lessons, `common.md`, the cases where the user disagreed with the judge, and the closest rated clips of the project with their sheets and the user's score (a plus at the first attempt without edits and every minus come first). The brief is assembled by the script - do not copy these inputs by hand. The command prints what went into it (`examples`) and the `refused` scenes.

The judge is a **separate subagent** (`opus`) with a fresh context, one per batch of up to 6 scenes. It is given: the path to `JUDGE.md` ("checklist" mode), the brief, for each scene its folder in `.verify/`, the text of scenes/<name>.story.md, the motion plan scenes/<name>.plan.md (if it exists), the style and the `angles.js` line. It looks at `places.png` row by row (the rest frame on the left, the frame of the place on the right; `places.md` names the rows) and says for each row whether the lines of the drawing are whole there - it names a row when a line is cut off, a gap opened in an outline, a part sits on foreign lines, or a piece of a limb is left behind. Verify itself doesn't evaluate scenes.

The judge answers with a JSON array, one object per scene. Save each scene's object: `node "${CLAUDE_SKILL_DIR}/../engine/bin/judge.js" record <style folder> <name> --answer <file> [--usage <output units>]`. Ceilings kept by the code: 180 s from the claim to the answer and 60000 output units per scene; over a ceiling the answer is kept in `judge.json` marked `used: false` with the reason and is ignored. An answer that is missing or can't be parsed is not asked for again: the scene goes on without a judge verdict.

What the answer does:
- `no_tears` false **with a named place or part** (`places row N`) - an open finding: the scene goes to step 3 once (the fix round; the integrity of the drawing outranks vigor, the angle floor of `angles.js` and the plan). After the fix the judge is not asked again (the runner refuses): you open `places.png` and `sheet.png` yourself for the new build and say in the report what you saw.
- a `false` in `hard` (`direction`, `anatomy`, `intact`) leads the report and the `manual-review.md` entry: it is the first thing the user reads about the scene, and the scene is not called passed with it. It does not start a rebuild by itself (one round, advice), and the user is never offered "bend more" or "squat deeper" as the repair: a joint that bends the wrong way is turned the right way, a walk backwards is reversed, a lost expression is restored. `"unknown"` there on a walking figure means `legs.png` was not readable: say so, do not count it as a pass.
- every other `false` in `checks` or `story_checks` and the `notes` go to the report, to `<style folder>/manual-review.md` (`record` writes the entry) and to the user. They do not start a rebuild.

## 3. Fixing - script findings only

Exception: if `frame0` fails and the status has `warnings` (clip-path, mask, stroke, text, image, `<use>`, `<line>`) - this is an engine limitation, the agent won't fix it. The scene goes straight to `manual-review.md` (it lives in the style folder) without a fix; the reason in plain words, not parser text: "the illustration has a clip/mask/stroke/text - the engine doesn't carry it over".

A `frame0` problem in the status has two frame numbers: `frame` - the scene frame (the key pose, 0) and `outputFrame` - the frame of the output loop where that pose stands.

Only the findings of step 1 and the broken line the judge named (step 2) are fixed here (`failed` checks, `error`). The judge's remarks are not a reason to edit a scene, except a broken line it named (step 2). Fix each scene in its own animator subagent; the limit is hard - 4 minutes (12 for scenes with people) for all the scene's edits (put it in the prompt); there are no counted attempts, within that time the fixer rebuilds until the scene is `done` and the script findings are cleared; time is up - the best build so far stays. Tell it to read `styles/common.md`, styles/<style>.md, `SCENE-FORMAT.md` and `<style folder>/rules.md` if it exists (the same files as the analyze step). Give it the scene, `story.md`, what was found (issues or error) and the style rules. It edits `scenes/<name>.json`, rebuilds with `node "${CLAUDE_SKILL_DIR}/../engine/bin/make.js" <style folder>/scenes/<name>.json` (the default result goes to the style folder's `out/`) and, if `done`, checks the rhythm: `node "${CLAUDE_SKILL_DIR}/../engine/bin/rhythm.js" <style folder>/scenes/<name>.json --style <style>` before the edit and after (prints `skipped` when the style has no rhythm profile - then there is no rhythm to check). A fix must not drop the `score`: if it dropped, return the holds and durations to the style profile (`misses` will hint) and rebuild. What remains goes into `manual-review.md`:

```
## <name>
![](.verify/<name>/sheet.png)
What's wrong: <in plain words>
What was tried: <1–2 lines>
```

## 4. Lessons

After fixing: if the same flaw showed up in a second scene or was caused by a technique (template, parameter, motion type) rather than a typo - it's a lesson. Write it into the section "## Lessons" of `<style folder>/rules.md` in the user's project (create the file with the sections "## Lessons" and "## User bans" if it doesn't exist). Only animation technique goes there: no commands, links or paths. Files in the skill folder are never edited: an update replaces them. As a line:

`- Don't <what> → do <how> (<why>). <YYYY-MM-DD>, scene <name>, source: verify`

Rules of the section:
- a new lesson that contradicts an old one replaces it; similar ones are merged into one;
- no more than ~40 lessons in `rules.md`; on overflow, condense into more general ones;
- don't touch the "User bans" section and don't contradict it.

Append each new lesson of this batch to `<style folder>/.verify/new-lessons.md` (lines `- …`).

## 5. Summary

1. One summary line: "done N, fixed M, to manual K" + "new lessons: …" (if any). The path to `manual-review.md` if it's not empty.

## User remark

The user writes: "<scene> - bad" (may be harsh, may come with "because …"), "<scene> - good", "remove lesson …" or "rewrite lesson …". Recognise the same remarks in the user's language.

**Bad:**
1. Look at the scene: `node "${CLAUDE_SKILL_DIR}/../engine/bin/sheet.js" <style folder>/scenes/<name>.json --out <style folder>/.verify/<name>`, open `sheet.png`, read the scene.
2. Formulate which technique is bad (template, parameter, motion type, timing). If the reason isn't clear and the user didn't name it - one short question.
3. Write the ban into the section "## User bans" of `<style folder>/rules.md` (create it as in "Lessons"): `- Don't <what> → do <how>. <YYYY-MM-DD>, scene <name>`. Delete the lessons that contradict it.
4. Find scenes with the same technique in `<style folder>/scenes/*.json` (same template, same part type, similar parameters) and redo them together with this one: scene edit → `node "${CLAUDE_SKILL_DIR}/../engine/bin/make.js" …` → look at the preview.
5. Answer in one line: "ban recorded, N scenes redone: …".

**Fixing by a user's remark** (applies to every round of a hand refinement, not only to "bad"):
- Before the edit, find the block of rules for this defect type in `common.md`, the style file and `<style folder>/rules.md` (walking of a person, walking of an animal, white lines, line masks, cut limbs) and apply the whole block, not only the item the user pointed at. The witch with the cat took 10 rounds because white-line and leg rules were applied one remark at a time.
- Joints, corners and line ends come only from geometry (`els.js`, `centerline`), never by eye.
- The same remark comes a second time - don't patch the result: name the technique that produces it and replace the technique.
- Offer the user only variants that follow the references (`examples/…`); a variant that contradicts a reference (for example, stepping in place instead of walking) is not offered.
- Before every delivery - a look at the whole preview yourself, and the judge's round of step 2 if the scene has not used it yet (a rebuilt scene gets places.png from you). A delivery with "preview not watched" does not happen, including fixes by the user's word; the remarks go to the user with the delivery.

## Refinement journal

When the user refines one illustration by hand (two or more remarks on the same scene), keep a journal: journals/<scene>/<YYYY-MM-DD>.md in the style folder, in the user's language. One block per round, written right after the delivery:

```
## Round <N> (<time>)
User: "<the remark, verbatim>"
Did: <technique and parameters, 1–2 lines>
Judge: <advice in one phrase, or "round used"> · preview watched: yes/no
Verdict: <in the next message: fixed / still … / new …>
```

When the user accepts the scene (or stops the refinement), compress the journal in the same file into: "Minimal path" (the fewest moves that lead to the result), "Wasted moves" (round - what - why), "Rules that would have given the result at once". Each such rule goes as a lesson into `<style folder>/rules.md`, source: journal.

**Good:** "<scene> - good" (also "super", "ok", "the best"). Copy `scenes/<name>.json` to `<style folder>/examples/<name>/scene.json`, the Lottie from `out/<name>.json` to `lottie.json`, the user's words with the date to `note.md`. This is a style sample and a control scene: rule edits must not break it. Answer in one line: "sample recorded".

**Remove / rewrite a lesson** - find the lesson in `<style folder>/rules.md` and do it right away (a lesson shipped with the skill is not edited: write a ban that overrides it). Answer in one line.
