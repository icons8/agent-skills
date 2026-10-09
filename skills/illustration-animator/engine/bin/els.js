// usage: node engine/bin/els.js file.svg [--sub N | --pts N.j] — elements in paint order (or subpaths of element N,
// or the vertices of contour j of element N with their numbers, for a cut), in 1200×1200 space.
const { parseSvg, pathsBBox } = require('../src/svg/parse');

const args = process.argv.slice(2);
if (!args[0]) {
  console.error('Usage: node engine/bin/els.js <file.svg> [--sub N]');
  process.exit(1);
}
const { els, warnings } = parseSvg(args[0]);
const sub = args.indexOf('--sub');
const pts = args.indexOf('--pts');
if (pts >= 0) {
  const [n, j = 0] = String(args[pts + 1]).split('.').map(Number);
  const sp = els[n] && els[n].paths[j];
  if (!sp) { console.error(`SVG has no path ${args[pts + 1]}`); process.exit(1); }
  sp.v.forEach(([x, y], k) => console.log(k, Math.round(x * 10) / 10, Math.round(y * 10) / 10));
} else if (sub >= 0) {
  const n = Number(args[sub + 1]);
  if (!els[n]) { console.error(`SVG has no element ${args[sub + 1]}`); process.exit(1); }
  els[n].paths.forEach((p, j) => console.log(`${n}.${j}`, pathsBBox([p]).map(Math.round).join(' '), `${p.v.length} points`));
} else {
  for (const e of els) {
    const c = (e.grad ? 'grad ' : '') + e.color.map((v) => Math.round(v * 255)).join(',');
    console.log(e.i, e.tag, c, e.bbox.map(Math.round).join(' '), e.groups.join('/'), e.id || '', e.paths.length > 1 ? `paths: ${e.paths.length}` : '');
  }
  for (const w of warnings) console.log('!', w);
}
