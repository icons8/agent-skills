// usage: node engine/bin/make.js <scene.json> [--out <dir>] [--lottie-only] [--lottie <file>] [--timeout <s>] [--no-fallback] [--tol <px>] [--no-optimize]   (default limit 600 s)
// The Lottie is lightened before it is written (src/lottie/optimize.js: shorter numbers, thinned bake keys, rigid parts moved by transforms);
// --tol sets how far a thinned key or a dropped vertex may stray, px of the 1200 canvas (default 0.6), --no-optimize keeps the raw bake.
// The same check failing twice on one scene (counted in the status, `attempts`) ends the rebuilds: a fused part whose cut keeps
// failing (tear, cut) moves whole — the scene is rewritten without that cut (the old one is kept in <style>/.attempts/) and built once
// more; the scene is listed in manual-review.md of the style folder. --no-fallback: no rewrite (the second build is the last).
// --lottie: the animation comes from this Lottie instead of the engine's; the scene still
// gives the frame-0 reference, the checks and the loop phase
// scene → Lottie → frame-0 check → script checks → frames → GIF/MP4/MOV, plus <name>.status.json
const fs = require('fs');
const path = require('path');
const { loadTools } = require('../src/setup');
const { compileScene, rotateLoop } = require('../src/scene/compile');
const { compareFrame0, renderFrames, killBrowsers } = require('../src/render/frames');
const { encodeAll, formatsFor, hevcHasAlpha } = require('../src/render/encode');
const { lint, lintWarnings } = require('../src/check/lint');
const { sourceHash } = require('../src/scene/source-hash');
const { seamHits } = require('../src/scene/cut');
const { checkHair, linePlaces } = require('../src/check/lines');
const A = require('../src/scene/attempts');
const { dropCuts } = require('../src/scene/whole');
const { optimizeLottie } = require('../src/lottie/optimize');
const { addTiming } = require('../src/scene/timing');
const { spawnSync } = require('child_process');

const SEAM_PX = 12;
const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
const sceneFile = path.resolve(args[0]);
const name = path.basename(sceneFile, '.json');
const outDir = path.resolve(opt('--out', path.join(path.dirname(sceneFile), '..', 'out')));
fs.mkdirSync(outDir, { recursive: true });
// source: hash of the scene and SVG texts, so batch can tell an edited scene from a finished one
const hash = sourceHash(sceneFile);
const styleDir = path.dirname(path.dirname(sceneFile));
const statusFile = path.join(outDir, `${name}.status.json`);
const readJson = (file) => { try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch (e) { return null; } };
// the earlier run's status: the attempt counts and a fallback already taken ride on into this one
const prevStatus = readJson(statusFile);
const startedAt = Date.now();
let attempts = { ...((prevStatus && prevStatus.attempts) || {}) };
const carried = prevStatus && prevStatus.fallback ? { fallback: prevStatus.fallback } : {};
const status = (s) => {
  fs.writeFileSync(statusFile, JSON.stringify({ name, at: new Date().toISOString(), ...(hash ? { source: hash } : {}), ...s, ...(Object.keys(attempts).length && s.state !== 'done' ? { attempts } : {}), ...carried, ...(s.fallback ? { fallback: s.fallback } : {}) }, null, 2));
  if (s.state !== 'running') addTiming(path.join(outDir, `${name}.timing.json`), (Date.now() - startedAt) / 60000, s.stopReason);
};

// results of an earlier run must never sit next to a new status; a locked file ends as an error status
try {
  for (const ext of ['json', 'gif', 'mov', 'mp4', 'frame0-diff.png']) {
    const old = path.join(outDir, `${name}.${ext}`);
    try {
      fs.rmSync(old, { force: true });
    } catch (e) {
      throw new Error(`could not delete old file ${path.basename(old)} — close it in the viewer (${e.code || e.message})`);
    }
  }
  status({ state: 'running' });
} catch (e) {
  status({ state: 'error', error: e.message });
  console.error(e.message);
  process.exit(1);
}

// a run that hangs (Chrome, ffmpeg) ends as an error status instead of waiting forever; same limit as batch.js
const TIMEOUT = (Number(opt('--timeout')) || 600) * 1000;
setTimeout(() => {
  status({ state: 'error', error: `did not finish within ${TIMEOUT / 1000} s` });
  console.error('timeout', name);
  killBrowsers();
  process.exit(1);
}, TIMEOUT).unref();

(async () => {
  const tools = loadTools();
  const built0 = compileScene(sceneFile);
  const { model } = built0;
  let { lottie, inner } = built0;
  const external = opt('--lottie');
  if (external) {
    inner = JSON.parse(fs.readFileSync(path.resolve(external), 'utf8'));
    for (const k of ['w', 'h', 'fr', 'op']) {
      if (inner[k] !== model[k]) throw new Error(`${path.basename(external)}: ${k} is ${inner[k]}, the scene has ${model[k]} — export the comp as built from the scene`);
    }
    lottie = rotateLoop(inner, (model.op - model.keyFrame) % model.op);
  }
  // parser warnings (stroke, mask, ...) ride along in every status once the model exists
  const warnings = [...model.warnings, ...lintWarnings(inner, model)];
  let warn = warnings.length ? { warnings } : {};
  if (!args.includes('--no-optimize')) lottie = optimizeLottie(lottie, opt('--tol') ? { shape: Number(opt('--tol')), vertex: Number(opt('--tol')) / 2 } : {});
  fs.writeFileSync(path.join(outDir, `${name}.json`), JSON.stringify(lottie));

  const issues = lint(inner, model);
  const f0 = await compareFrame0(model.svgFile, lottie, tools, model.src, { frame: model.keyFrame, diffOut: path.join(outDir, `${name}.frame0-diff.png`) });
  if (!f0.ok) issues.unshift({ check: 'frame0', frame: 0, outputFrame: model.keyFrame, detail: `key pose differs from SVG by ${f0.badPixelsPct}%` });
  else fs.rmSync(path.join(outDir, `${name}.frame0-diff.png`), { force: true });
  // a cut must not show at rest: the full-size compare along every cut line (the one above is 4× smaller)
  if (model.seams.length) {
    const full = await compareFrame0(model.svgFile, lottie, tools, model.src, { frame: model.keyFrame, down: 1 });
    for (const s of seamHits(full.leakPts, model.seams)) {
      if (s.hits > SEAM_PX) issues.push({ check: 'cut', part: s.name, frame: 0, detail: `cut seam ${s.name} is visible at rest: ${s.hits} px along the cut line are lighter than the SVG — gap between pieces (hairline)` });
    }
    // ... nor in motion: a thin dark line along the cut that the drawing does not have at rest (the raster check, src/check/lines.js)
    issues.push(...(await checkHair(inner, model)));
  }
  if (issues.length) {
    attempts = A.bump({ attempts }, issues);
    const spent = A.over(attempts);
    if (!spent.length) {
      status({ state: 'failed', issues, ...warn });
      console.log('failed', name, issues.length);
      process.exit(2);
    }
    // the limit: the same check has failed twice — no third rebuild of the same cut
    const scene = JSON.parse(fs.readFileSync(sceneFile, 'utf8'));
    const seams = external || args.includes('--no-fallback') ? [] : A.cutsOf(scene, issues, spent.filter((c) => c === 'tear' || c === 'cut' || c === 'hair'));
    const wrong = issues.filter((i) => spent.includes(i.check)).map((i) => `${i.check} ${i.part || ''}@${i.frame}: ${i.detail}`).join(' · ');
    if (seams.length) {
      const whole = dropCuts(scene, seams);
      fs.mkdirSync(path.join(styleDir, '.attempts'), { recursive: true });
      fs.copyFileSync(sceneFile, path.join(styleDir, '.attempts', `${name}.cut.json`));
      fs.writeFileSync(sceneFile, JSON.stringify(whole.scene, null, 1));
      A.writeManual(styleDir, name, { wrong: `the cut ${seams.join(', ')} kept failing (${spent.join(', ')}): ${wrong}`, tried: `${A.LIMIT} builds with the cut, then the part moves whole without the cut (parts ${whole.removed.join(', ') || 'none'} removed, their motion given to the whole part); the cut scene is in .attempts/${name}.cut.json — needs a hand-made cut` });
      status({ state: 'failed', issues, stopReason: 'engine', ...warn, fallback: { whole: seams, removed: whole.removed } });
      console.log('attempt limit', name, 'cut', seams.join(','), '— rebuilding whole');
      const r = spawnSync(process.execPath, [__filename, ...process.argv.slice(2), '--no-fallback'], { stdio: 'inherit' });
      process.exit(r.status === null ? 1 : r.status);
    }
    A.writeManual(styleDir, name, { wrong: `${spent.join(', ')} failed ${A.LIMIT} times: ${wrong}`, tried: `${A.LIMIT} builds; no cut to remove — the rebuilds stop here` });
    status({ state: 'failed', issues, stopReason: 'engine', ...warn });
    console.log('attempt limit', name, spent.join(','), '— stop, see manual-review.md');
    process.exit(2);
  }

  const lottieOnly = args.includes('--lottie-only');
  if (!lottieOnly) {
    const dir = await renderFrames(lottie, tools);
    try {
      const built = encodeAll(dir, path.join(outDir, name), { fr: lottie.fr, tools });
      const mp4 = built.find((f) => f.endsWith('.mp4'));
      if (mp4 && !hevcHasAlpha(tools, mp4)) {
        fs.rmSync(mp4, { force: true });
        throw new Error('MP4 has no alpha layer — check the encoder hevc_videotoolbox (-alpha_quality)');
      }
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  }
  // places to look at (a line end that came off the lines it stopped at, lines that meet anew): a warning for the eye, never a fault.
  // Skottie renders the frames, so the check goes with the full build only
  let places = [];
  if (!lottieOnly) {
    try {
      places = (await linePlaces(inner, model)).places;
    } catch (e) {
      warnings.push(`places: line check skipped — ${String(e.message).split(/\r?\n/)[0]}`);
    }
    for (const p of places) warnings.push(`${p.kind}: ${p.part}, frame ${p.frame} — ${p.kind === 'lineend' ? `the end of a line is ${Math.round(p.size)} px further from ${p.other} than at rest` : `lines meet ${p.other} that did not touch at rest`}, around (${p.at.join(', ')})`);
    warn = warnings.length ? { warnings } : {};
  }
  // done = checks passed; pending lists the formats that were not built here
  const pending = [...(lottieOnly ? ['gif', 'mov'] : []), ...(!lottieOnly && formatsFor(tools).includes('mp4') ? [] : ['mp4'])];
  status({ state: 'done', ...(external ? { via: 'after-effects' } : {}), ...(lottieOnly ? { lottieOnly: true } : {}), ...(pending.length ? { pending } : {}), ...(places.length ? { places } : {}), ...warn });
  console.log('ok', name);
})().catch((e) => {
  status({ state: 'error', error: e.message });
  console.error(e.message);
  process.exit(1);
});
