// usage: node engine/bin/make.js <scene.json> [--out <dir>] [--lottie-only]
// scene → Lottie → frame-0 check → script checks → frames → GIF/MP4/MOV, plus <name>.status.json
const fs = require('fs');
const path = require('path');
const { loadEnv } = require('../src/env');
const { compileScene } = require('../src/scene/compile');
const { compareFrame0, renderFrames } = require('../src/render/frames');
const { exportAll, formatsFor, hevcHasAlpha } = require('../src/render/export');
const { lint } = require('../src/check/lint');
const { sourceHash } = require('../src/scene/source-hash');
const { seamHits } = require('../src/scene/cut');

const SEAM_PX = 12;
const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
const sceneFile = path.resolve(args[0]);
const name = path.basename(sceneFile, '.json');
const outDir = path.resolve(opt('--out', path.join(path.dirname(sceneFile), '..', 'out')));
fs.mkdirSync(outDir, { recursive: true });
// source: hash of the scene and SVG texts, so batch can tell an edited scene from a finished one
const hash = sourceHash(sceneFile);
const status = (s) => fs.writeFileSync(path.join(outDir, `${name}.status.json`), JSON.stringify({ name, at: new Date().toISOString(), ...(hash ? { source: hash } : {}), ...s }, null, 2));

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

(async () => {
  const env = loadEnv();
  const { lottie, inner, model } = compileScene(sceneFile);
  // parser warnings (stroke, mask, ...) ride along in every status once the model exists
  const warn = model.warnings.length ? { warnings: model.warnings } : {};
  fs.writeFileSync(path.join(outDir, `${name}.json`), JSON.stringify(lottie));

  const issues = lint(inner, model);
  const f0 = await compareFrame0(model.svgFile, lottie, env, model.src, { frame: model.keyFrame, diffOut: path.join(outDir, `${name}.frame0-diff.png`) });
  if (!f0.pass) issues.unshift({ check: 'frame0', frame: 0, outputFrame: model.keyFrame, detail: `key pose differs from SVG by ${f0.badPixelsPct}%` });
  else fs.rmSync(path.join(outDir, `${name}.frame0-diff.png`), { force: true });
  // a cut must not show at rest: the full-size compare along every cut line (the one above is 4× smaller)
  if (model.seams.length) {
    const full = await compareFrame0(model.svgFile, lottie, env, model.src, { frame: model.keyFrame, down: 1 });
    for (const s of seamHits(full.leakPts, model.seams)) {
      if (s.hits > SEAM_PX) issues.push({ check: 'cut', part: s.name, frame: 0, detail: `cut seam ${s.name} is visible at rest: ${s.hits} px along the cut line are lighter than the SVG — gap between pieces (hairline)` });
    }
  }
  if (issues.length) {
    status({ state: 'failed', issues, ...warn });
    console.log('failed', name, issues.length);
    process.exit(2);
  }

  const lottieOnly = args.includes('--lottie-only');
  if (!lottieOnly) {
    const dir = await renderFrames(lottie, env);
    try {
      const built = exportAll(dir, path.join(outDir, name), { fr: lottie.fr, env });
      const mp4 = built.find((f) => f.endsWith('.mp4'));
      if (mp4 && !hevcHasAlpha(env, mp4)) {
        fs.rmSync(mp4, { force: true });
        throw new Error('MP4 has no alpha layer — check the encoder hevc_videotoolbox (-alpha_quality)');
      }
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  }
  // done = checks passed; pending lists the formats that were not built here
  const pending = [...(lottieOnly ? ['gif', 'mov'] : []), ...(!lottieOnly && formatsFor(env).includes('mp4') ? [] : ['mp4'])];
  status({ state: 'done', ...(lottieOnly ? { lottieOnly: true } : {}), ...(pending.length ? { pending } : {}), ...warn });
  console.log('ok', name);
})().catch((e) => {
  status({ state: 'error', error: e.message });
  console.error(e.message);
  process.exit(1);
});
