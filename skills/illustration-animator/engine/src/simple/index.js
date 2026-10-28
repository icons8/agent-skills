// Adapter between the engine and the simple-animation module (lot.py, check.py, render.js, inspect_svg.py). It calls
// the module through four entry points and never edits its files; what sits here: the python and node paths, the
// cairosvg stand-in, the bans, the delivery. The module's files are replaced as a whole, never patched.
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = path.join(__dirname, '..', '..', '..');
// the module's folder: `vendor/simple-animation` in the source tree, `simple-animation` in the packaged skill
const MODULE = [path.join(ROOT, 'vendor', 'simple-animation'), path.join(ROOT, 'simple-animation')].find((d) => fs.existsSync(path.join(d, 'scripts', 'lot.py'))) || path.join(ROOT, 'simple-animation');
const SCRIPTS = path.join(MODULE, 'scripts');
const SHIM = path.join(__dirname, 'shim');
const LAUNCH = path.join(__dirname, 'launch.py');
const CONFIG = path.join(os.homedir(), '.animator', 'simple.json');
// the four files of the module the adapter depends on; a new version that lacks one is not taken
const ENTRY = ['lot.py', 'check.py', 'render.js', 'inspect_svg.py'];
// what the adapter looks for in the output of check.py to know it ran
const CHECK_OUT = /frames \d+ \| seam/;

function version() {
  const f = path.join(MODULE, 'VERSION');
  return fs.existsSync(f) ? fs.readFileSync(f, 'utf8') : null;
}

// entry points present in a folder with the module (the current one or an unpacked new one)
function entryPoints(dir = MODULE) {
  const miss = ENTRY.filter((f) => !fs.existsSync(path.join(dir, 'scripts', f)));
  return { ok: !miss.length, missing: miss };
}

const loadConfig = () => (fs.existsSync(CONFIG) ? JSON.parse(fs.readFileSync(CONFIG, 'utf8')) : {});
const saveConfig = (c) => { fs.mkdirSync(path.dirname(CONFIG), { recursive: true }); fs.writeFileSync(CONFIG, JSON.stringify(c, null, 2)); };

const run = (cmd, args, opt = {}) => spawnSync(cmd, args, { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, ...opt });

// what the python needs: the module's packages, and a cairosvg or the stand-in over PyMuPDF
// cairosvg is tried, not only found: on Windows the package may be there without the cairo library
const PROBE = "import importlib.util as u,json\nm=[\"svgpathtools\",\"svgelements\",\"numpy\",\"PIL\",\"scipy\",\"cv2\",\"fitz\"]\nr={x:u.find_spec(x) is not None for x in m}\ntry:\n import cairosvg;r[\"cairosvg\"]=True\nexcept Exception:\n r[\"cairosvg\"]=False\nprint(json.dumps(r))";

// Detect only: installs nothing. Returns what is there and the commands the user may run.
function detect({ python, nodeModules } = {}) {
  const cfg = { ...loadConfig(), ...(python ? { python } : {}), ...(nodeModules ? { nodeModules } : {}) };
  const py = [cfg.python, 'python', 'python3'].filter(Boolean).find((p) => { const r = run(p, ['-c', 'print(1)']); return !r.error && r.status === 0; });
  const out = { python: py || null, nodeModules: cfg.nodeModules || null, missing: [], install: [], shim: false };
  if (!py) { out.missing.push('python 3'); return out; }
  const has = JSON.parse(run(py, ['-c', PROBE], { cwd: os.tmpdir() }).stdout || '{}');
  for (const m of ['svgpathtools', 'svgelements', 'numpy', 'PIL', 'scipy', 'cv2']) if (!has[m]) out.missing.push(m);
  if (!has.cairosvg) {
    if (has.fitz) out.shim = true;
    else out.missing.push('cairosvg (or pymupdf for the stand-in)');
  }
  const pip = out.missing.map((m) => ({ PIL: 'pillow', cv2: 'opencv-python-headless' }[m] || (m.startsWith('cairosvg') ? 'cairosvg' : m))).filter((m) => !m.startsWith('python'));
  if (pip.length) out.install.push(`${py} -m pip install ${pip.join(' ')}`);
  const nm = cfg.nodeModules && fs.existsSync(path.join(cfg.nodeModules, 'canvaskit-wasm', 'package.json'));
  if (!nm) { out.missing.push('canvaskit-wasm 0.41.1 (Skottie)'); out.install.push('npm i --prefix <folder> canvaskit-wasm@0.41.1   then: node engine/bin/simple.js tools --node-modules <folder>/node_modules'); out.nodeModules = null; }
  return out;
}

// Run a script of the module through launch.py: the module's folder on the path, the stand-in after the real packages.
function launch(d, script, args = [], opt = {}) {
  const a = [LAUNCH, '--scripts', SCRIPTS, ...(d.shim ? ['--shim', SHIM] : []), ...(d.nodeModules ? ['--node-modules', d.nodeModules] : []), '--', script, ...args];
  return run(d.python, a, opt);
}

// Our bans on a finished Lottie (the module has none): a part fading in or out; no loop at all; a stray frame rate.
// Opacity is allowed only on a layer that is a mask or a tint, and a whole-layer fade is the ban of the style
// (`common.md`: opacity is almost never an appearance).
function bans(lottie) {
  const issues = [];
  const anim = (p) => p && p.a === 1 && Array.isArray(p.k) && p.k.length > 1;
  for (const l of lottie.layers || []) {
    if (anim(l.ks && l.ks.o)) {
      const v = l.ks.o.k.map((k) => (Array.isArray(k.s) ? k.s[0] : k.s)).filter((x) => typeof x === 'number');
      if (Math.max(...v) - Math.min(...v) > 30) issues.push({ check: 'fade', layer: l.nm, detail: `layer "${l.nm}" fades (opacity ${Math.min(...v)}–${Math.max(...v)}): opacity is not an appearance, use scale, position or a mask` });
    }
  }
  if (!(lottie.op >= 24)) issues.push({ check: 'length', detail: `loop is ${lottie.op} frames: too short` });
  if (![24, 25, 30, 60].includes(lottie.fr)) issues.push({ check: 'fps', detail: `frame rate ${lottie.fr}` });
  const moving = (lottie.layers || []).filter((l) => l.ks && ['p', 'r', 's', 'o'].some((k) => anim(l.ks[k]))).length;
  if (!moving) issues.push({ check: 'static', detail: 'no layer moves' });
  return issues;
}

// A stricter check of the module can sit beside this file (./socket); without it only the entry points are checked.
function guard(dir = MODULE) {
  let S = null;
  try { S = require('./socket'); } catch (e) { if (e.code !== 'MODULE_NOT_FOUND') throw e; }
  if (S) return S.guard(dir, { version });
  const e = entryPoints(dir);
  return e.ok ? { ok: true, warn: null, state: 'ok' } : { ok: false, error: `The module in ${dir} lacks ${e.missing.join(', ')}` };
}

module.exports = { guard, MODULE, ROOT, SCRIPTS, SHIM, LAUNCH, CONFIG, ENTRY, CHECK_OUT, version, entryPoints, loadConfig, saveConfig, detect, launch, bans, run };
