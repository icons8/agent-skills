// usage: node engine/bin/poses.js <scene.json | file.svg> --out file.png [--frames 0,12,24] [--box x,y,w,h] [--cell 500]
//   [--grid] [--cuts] [--pts 7.0,6.0]
// Authored frames of a scene side by side (zoom into a seam with --box); --cuts tints every part its own colour;
// --grid draws canvas coordinates, --pts numbers the vertices of contours N.j of the source SVG (for a cut).
const path = require('path');
const { loadEnv } = require('../src/env');
const { parseSvg } = require('../src/svg/parse');
const { buildLottie } = require('../src/lottie/build');
const { compileScene } = require('../src/scene/compile');
const { poses, tint } = require('../src/render/poses');

const args = process.argv.slice(2);
const opt = (k) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : undefined; };
const nums = (k) => (opt(k) ? opt(k).split(',').map(Number) : undefined);
if (!args[0] || !opt('--out')) {
  console.error('Usage: node engine/bin/poses.js <scene.json | file.svg> --out file.png [--frames 0,12,24] [--box x,y,w,h] [--cell 500] [--grid] [--cuts] [--pts 7.0]');
  process.exit(1);
}
const src = path.resolve(args[0]);
let lottie, svgFile, legend = [];
if (src.endsWith('.json')) {
  const c = compileScene(src);
  lottie = c.inner;
  svgFile = c.model.svgFile;
  if (args.includes('--cuts')) ({ lottie, legend } = tint(lottie));
} else {
  svgFile = src;
  const { w, h, els } = parseSvg(src);
  lottie = buildLottie({ w, h, fr: 30, op: 1, els, layers: [{ name: 'STATIC_0', els: els.map((e) => e.i), pivot: [w / 2, h / 2] }] });
}
const pts = (opt('--pts') || '').split(',').filter(Boolean).map((r) => {
  const [n, j] = r.split('.').map(Number);
  const el = parseSvg(svgFile).els[n];
  if (!el || !el.paths[j || 0]) throw new Error(`--pts: no path ${r}`);
  return { label: r, v: el.paths[j || 0].v };
});
const box = nums('--box');
if (box && box.length !== 4) throw new Error('--box x,y,w,h');
poses(lottie, loadEnv(), path.resolve(opt('--out')), { frames: nums('--frames') || [0], box, cell: Number(opt('--cell') || 600), grid: args.includes('--grid'), pts, legend })
  .then((f) => console.log(f))
  .catch((e) => { console.error(e.message); process.exit(1); });
