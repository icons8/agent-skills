// Adapter between the engine and the simple-animation module (lot.py, check.py, render.js, inspect_svg.py). It calls
// the module through four entry points and never edits its files; what sits here: the python and node paths, the
// cairosvg stand-in, the bans, the delivery. The module's files are replaced as a whole, never patched.
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');
const { DEPS } = require('../setup/deps');

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

// what the python needs: the module's packages and resvg-py, which renders the SVGs. The module calls cairosvg;
// the stand-in in shim/ answers that call over resvg, so cairosvg (LGPL) and its cairo library are never needed.
const PROBE = "import importlib.util as u,json\nm=[\"svgpathtools\",\"svgelements\",\"numpy\",\"PIL\",\"scipy\",\"cv2\",\"resvg_py\",\"vtracer\"]\nprint(json.dumps({x:u.find_spec(x) is not None for x in m}))";

// pip names at fixed versions: the packages are MIT, BSD, Apache or similar, none is copyleft (see the package notes).
const PIP = { svgpathtools: 'svgpathtools==1.8.0', svgelements: 'svgelements==1.9.6', numpy: 'numpy==2.4.4', PIL: 'pillow==12.2.0', scipy: 'scipy==1.17.1', cv2: 'opencv-python-headless==4.13.0.92', resvg_py: 'resvg-py==0.5.0', vtracer: 'vtracer==0.6.15' };

// The pinned wheels (numpy 2.4.4, scipy 1.17.1, resvg-py 0.5.0, pillow 12.2.0) exist for Python 3.11 to 3.14 only: older ones fail
// on the pins' requires-python, 3.15 has no numpy or scipy wheel and pip falls back to a source build that fails. `tools` picks a
// python in this range (python3.14 ... python3.11 are tried after the default) and says so when the machine has none.
const PY_RANGE = { min: [3, 11], max: [3, 14] };
const pyVersion = (cmd) => {
  const r = run(cmd, ['-c', 'import sys;print("%d.%d" % sys.version_info[:2])']);
  if (r.error || r.status !== 0) return null;
  const v = (r.stdout || '').trim().split('.').map(Number);
  return v.length === 2 && v.every(Number.isInteger) ? v : null;
};
const inRange = (v) => v[0] === 3 && v[1] >= PY_RANGE.min[1] && v[1] <= PY_RANGE.max[1];

// Detect only: installs nothing. Returns what is there and the commands the user may run.
function detect({ python, nodeModules } = {}) {
  // canvaskit-wasm is one of the engine's pinned npm packages: setup.js installs it into ~/.animator/deps
  const own = path.join(DEPS, 'node_modules');
  const cfg = { ...loadConfig(), ...(python ? { python } : {}), ...(nodeModules ? { nodeModules } : {}) };
  if (!cfg.nodeModules && fs.existsSync(path.join(own, 'canvaskit-wasm', 'package.json'))) cfg.nodeModules = own;
  const found = [];
  const py = [...new Set([cfg.python, 'python3', 'python3.14', 'python3.13', 'python3.12', 'python3.11', 'python'].filter(Boolean))]
    .find((p) => { const v = pyVersion(p); if (v) found.push(`${p} ${v.join('.')}`); return v && inRange(v); });
  const out = { python: py || null, nodeModules: cfg.nodeModules || null, missing: [], install: [], shim: true };
  // oxipng is optional: only scripts/optimize_lottie.py (textured loops) uses it. Reported, never counted as missing, never installed.
  const ox = run('oxipng', ['--version']);
  out.oxipng = !ox.error && ox.status === 0 ? ((ox.stdout || '').trim().split('\n')[0] || 'found') : null;
  if (!out.oxipng) out.optional = ['oxipng: not found. Only scripts/optimize_lottie.py needs it (textured loops); without it skip that step. The user installs it from its releases or a package manager.'];
  if (!py) {
    out.missing.push(`python ${PY_RANGE.min.join('.')} to ${PY_RANGE.max.join('.')}` + (found.length ? ` (found: ${found.join(', ')})` : ''));
    out.pythonRange = `${PY_RANGE.min.join('.')}-${PY_RANGE.max.join('.')}`;
    out.install.push(`install Python ${PY_RANGE.min.join('.')} to ${PY_RANGE.max.join('.')} (for example python3.13 from your package manager), then run tools again`);
    return out;
  }
  const has = JSON.parse(run(py, ['-c', PROBE], { cwd: os.tmpdir() }).stdout || '{}');
  for (const m of ['svgpathtools', 'svgelements', 'numpy', 'PIL', 'scipy', 'cv2', 'resvg_py']) if (!has[m]) out.missing.push(m);
  // vtracer is optional like oxipng: only scripts/trace_png.py (a PNG to an SVG) uses it, so the rest of the simple path runs without it.
  if (!has.vtracer) (out.optional = out.optional || []).push(`vtracer: not found. Only scripts/trace_png.py (tracing a PNG) needs it; install it with ${py} -m pip install ${PIP.vtracer} when that step is wanted.`);
  const pip = out.missing.filter((m) => !m.startsWith('python')).map((m) => PIP[m] || m);
  if (pip.length) out.install.push(`${py} -m pip install ${pip.join(' ')}`);
  const nm = cfg.nodeModules && fs.existsSync(path.join(cfg.nodeModules, 'canvaskit-wasm', 'package.json'));
  if (!nm) { out.missing.push('canvaskit-wasm 0.41.1 (Skottie)'); out.install.push('node engine/bin/setup.js   (installs the engine\'s pinned npm packages, canvaskit-wasm included, into ~/.animator/deps)'); out.nodeModules = null; }
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

// The module must have the four entry points the adapter calls.
function guard(dir = MODULE) {
  const e = entryPoints(dir);
  return e.ok ? { ok: true, warn: null, state: 'ok' } : { ok: false, error: `The module in ${dir} lacks ${e.missing.join(', ')}` };
}

module.exports = { guard, MODULE, ROOT, SCRIPTS, SHIM, LAUNCH, CONFIG, ENTRY, CHECK_OUT, version, entryPoints, loadConfig, saveConfig, detect, launch, bans, run };
