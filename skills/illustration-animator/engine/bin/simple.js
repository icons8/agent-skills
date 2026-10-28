// usage: node engine/bin/simple.js <command> ...   - the simple-animation path: the adapter over the module that animates one illustration by a short build script
//   tools [--python <exe>] [--node-modules <dir>]       what is installed; installs nothing, prints the commands for the user (exit 2 if something is missing)
//   run <build.py> [args...]                            run a build script of the scene (the module's lot.py on the path, the cairosvg stand-in if needed)
//   check <scene.json> --svg <file.svg> [--out <dir>]   our bans + frame 0 against the SVG + the module's seam check and sheet
//   deliver <scene.json> --name <scene> --out <dir> [--preview <dir>] [--no-optimize]   JSON (lightened by src/lottie/optimize.js), GIF, MOV (ours) and the white MP4
const fs = require('fs');
const path = require('path');
const A = require('../src/simple');
const { optimizeLottie } = require('../src/lottie/optimize');

const [cmd, ...args] = process.argv.slice(2);
const opt = (k, d = null) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
const fail = (m, code = 1) => { console.error(m); process.exit(code); };
// the module has the entry points the adapter calls (else exit 2 with the reason); a changed folder is a warning
function guard() {
  const g = A.guard();
  if (!g.ok) fail(g.error, 2);
  if (g.warn) console.error(`warning: ${g.warn}`);
}

function tools() {
  const d = A.detect({ python: opt('--python'), nodeModules: opt('--node-modules') });
  console.log(JSON.stringify(d, null, 1));
  if (d.missing.length) { console.error(`Missing: ${d.missing.join(', ')}. Show the user the commands above (install) and run them only after they agree.`); process.exit(2); }
  A.saveConfig({ python: d.python, nodeModules: d.nodeModules });
}

function run() {
  guard();
  const d = A.detect();
  if (d.missing.length) fail(`Setup not done: node engine/bin/simple.js tools (${d.missing.join(', ')})`, 2);
  if (!args[0]) fail('Usage: simple.js run <build.py> [args...]');
  const r = A.launch(d, path.resolve(args[0]), args.slice(1), { cwd: process.cwd(), stdio: 'inherit', encoding: undefined });
  process.exit(r.status === null ? 1 : r.status);
}

async function check() {
  guard();
  const file = args[0] && path.resolve(args[0]);
  const svg = opt('--svg');
  if (!file || !svg) fail('Usage: simple.js check <scene.json> --svg <file.svg> [--out <dir>]');
  const d = A.detect();
  if (d.missing.length) fail(`Setup not done: node engine/bin/simple.js tools (${d.missing.join(', ')})`, 2);
  const lottie = JSON.parse(fs.readFileSync(file, 'utf8'));
  const issues = A.bans(lottie);
  // frame 0 is the rest: it must be the SVG (our compare: black and white background, white fills too)
  const { loadTools } = require('../src/setup');
  const { compareFrame0, killBrowsers } = require('../src/render/frames');
  const f0 = await compareFrame0(path.resolve(svg), lottie, loadTools(), [lottie.w, lottie.h], { frame: 0 });
  killBrowsers();
  if (!f0.ok) issues.push({ check: 'frame0', detail: `frame 0 differs from the SVG by ${f0.badPixelsPct}% (paint order or a lost shape; the rest frame is frame 0)` });
  // the module's checks: seam, sheet, gif, in the output folder (it writes beside the cwd)
  const out = path.resolve(opt('--out') || path.join(path.dirname(file), 'check'));
  fs.mkdirSync(out, { recursive: true });
  const r = A.launch(d, path.join(A.SCRIPTS, 'check.py'), [file, '--svg', path.resolve(svg), '--rest', '0'], { cwd: out });
  process.stdout.write(r.stdout || '');
  if (r.status !== 0) process.stderr.write(r.stderr || '');
  if (r.status === 0 && !A.CHECK_OUT.test(r.stdout || '')) issues.push({ check: 'module-check', detail: 'the output of the module check.py has no "frames N | seam" line: its output changed (CHECK_OUT in engine/src/simple/index.js)' });
  if (/JUMP at loop point/.test(r.stdout || '')) issues.push({ check: 'seam', detail: 'jump at the loop point (the module check)' });
  if (r.status !== 0) issues.push({ check: 'module-check', detail: `check.py exited ${r.status}` });
  console.log(JSON.stringify({ ok: !issues.length, frame0: f0.badPixelsPct, issues }));
  process.exit(issues.length ? 2 : 0);
}

async function deliver() {
  const file = args[0] && path.resolve(args[0]);
  const name = opt('--name'), outDir = opt('--out');
  if (!file || !name || !outDir) fail('Usage: simple.js deliver <scene.json> --name <scene> --out <dir> [--preview <dir>]');
  const { loadTools } = require('../src/setup');
  const { renderFrames, killBrowsers } = require('../src/render/frames');
  const { encodeAll, whitePreview } = require('../src/render/encode');
  const tools = loadTools();
  let lottie = JSON.parse(fs.readFileSync(file, 'utf8'));
  if (!args.includes('--no-optimize')) lottie = optimizeLottie(lottie);
  fs.mkdirSync(path.resolve(outDir), { recursive: true });
  const base = path.join(path.resolve(outDir), name);
  fs.writeFileSync(`${base}.json`, JSON.stringify(lottie));
  const dir = await renderFrames(lottie, tools);
  killBrowsers();
  try { encodeAll(dir, base, { fr: lottie.fr, tools, formats: ['gif', 'mov'] }); } finally { fs.rmSync(dir, { recursive: true, force: true }); }
  const pv = opt('--preview');
  const files = [`${base}.json`, `${base}.gif`, `${base}.mov`];
  if (pv) {
    fs.mkdirSync(path.resolve(pv), { recursive: true });
    files.push(whitePreview(tools, `${base}.mov`, { fr: lottie.fr, op: lottie.op - lottie.ip }, path.join(path.resolve(pv), `${name}.mp4`)));
  }
  console.log(files.join('\n'));
}

const table = { tools, run, check, deliver };
if (!table[cmd]) fail('Usage: node engine/bin/simple.js tools|run|check|deliver');
Promise.resolve(table[cmd]()).catch((e) => fail(e.message));
