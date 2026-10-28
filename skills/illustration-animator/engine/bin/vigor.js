// How lively a finished Lottie is, from the file alone (ours, a hand-made one, a competitor's — the same numbers):
//   layers   — share of layers that move by more than a threshold (corner shift ≥ 4 px on a 1200 canvas, turn ≥ 2°, scale ≥ 3%,
//              path change ≥ 3 px), their mean and maximum swing (px on 1200, degrees, scale %), speed in px per second;
//   pixels   — share of the drawn pixels that ever change, mean frame-to-frame change per second, longest still run in seconds.
// node engine/bin/vigor.js <lottie.json>… [--json out.json] [--no-pixels] [--check] [--plan <name>.plan.md]
// With a plan (found by itself at ../scenes/<name>.plan.md, or --plan) the parts that stand by a reason (`— still:`, `— why: symbol|background`) are not asked to move and not
// counted in the share of moving parts; a symbol or a background that stands also lifts the floor of the drawing share. Fused blocks (`— whole: fused…`, `cut`) get a CEILING:
// a swing past it pulls the drawing apart (a reviewer's remark: "too active, falls apart").
// --check prints the findings (exit 1 when there are any): the floors are calibrated on the 28 approved scenes (lowest values there:
// swing 75 px, share of the drawing that moves 0.31, moving layers 0.5) and flag the sluggish builds of the Black Chalk split test.
const fs = require('fs');
const path = require('path');
const { req, resolve } = require('../src/setup/deps');
const { loadTools } = require('../src/setup');
const { valueAt } = require('../src/lottie/keys');
const { localMatrix, mul } = require('../src/lottie/evaluate');

const TH = { px: 4, deg: 2, scale: 0.03, path: 3 };
// floors of the check: below them the scene reads as sluggish or mostly standing
const FLOOR = { swing: 60, pxShare: 0.3, moving: 0.5 };
// ceiling of a fused block: swing in the block's own sizes, turn in degrees (calibrated on the approved scenes, see common.md "Vigor")
const CEIL = { rel: 0.35, rot: 25 };

// a plan line is `<parts> — <motion> — why: … — whole|hinge|cut`; `<parts>` names layers (SPARK_A (el 20), SPARK_B …)
function readPlan(file) {
  const exempt = new Set(), fused = new Set();
  let relief = false;
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    if (!/^\s*-\s/.test(line)) continue;
    const [head] = line.replace(/^\s*-\s*/, '').split(/\s+—\s+/);
    const names = (head.replace(/\([^)]*\)/g, ' ').match(/[A-Za-z][A-Za-z0-9_]*/g) || []).map((n) => n.toLowerCase());
    const still = /—\s*still:/i.test(line), sym = /why:\s*(symbol|background|support|ground)/i.test(line);
    if (still || sym) { for (const n of names) exempt.add(n); if (sym) relief = true; }
    else if (/—\s*whole:[^—]*fused|—\s*cut\b|\bcut\s*$/i.test(line)) for (const n of names) fused.add(n);
  }
  return { exempt, fused, relief };
}
const baseName = (nm) => String(nm).replace(/·\d+$/, '').toLowerCase();
function findPlan(file, plan) {
  if (plan) return plan;
  const name = path.basename(file, '.json');
  for (const d of [path.join(path.dirname(file), '..', 'scenes'), path.join(path.dirname(file), 'scenes')]) { const p = path.join(d, name + '.plan.md'); if (fs.existsSync(p)) return p; }
  return null;
}

function contentBox(shapes) {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  const add = (x, y) => { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); };
  const walk = (items, m) => {
    const tr = (items || []).find((i) => i.ty === 'tr');
    const mm = tr ? mul(m, localMatrix(tr, 0)) : m;
    for (const it of items || []) {
      if (it.ty === 'gr') walk(it.it, mm);
      else if (it.ty === 'sh' && it.ks) {
        const v = it.ks.a === 1 ? it.ks.k[0].s[0].v : it.ks.k.v;
        for (const [x, y] of v) add(mm[0] * x + mm[2] * y + mm[4], mm[1] * x + mm[3] * y + mm[5]);
      } else if ((it.ty === 'el' || it.ty === 'rc') && it.p && it.s) {
        const p = valueAt(it.p, 0), s = valueAt(it.s, 0);
        for (const [dx, dy] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) { const x = p[0] + dx * s[0] / 2, y = p[1] + dy * s[1] / 2; add(mm[0] * x + mm[2] * y + mm[4], mm[1] * x + mm[3] * y + mm[5]); }
      }
    }
  };
  walk(shapes, [1, 0, 0, 1, 0, 0]);
  return Number.isFinite(x0) ? [x0, y0, x1, y1] : null;
}

// largest vertex shift of an animated path, and the largest turn / shift / scale of an animated group transform (px of the file)
function innerMotion(shapes, R) {
  let pathShift = 0, grp = 0;
  const walk = (items) => {
    for (const it of items || []) {
      if (it.ty === 'gr') walk(it.it);
      else if (it.ty === 'sh' && it.ks && it.ks.a === 1) {
        const k = it.ks.k.filter((q) => q.s && q.s[0] && q.s[0].v), v0 = k[0].s[0].v;
        for (const q of k) q.s[0].v.forEach(([x, y], n) => { pathShift = Math.max(pathShift, Math.hypot(x - v0[n][0], y - v0[n][1])); });
      } else if (it.ty === 'tr') {
        for (const prop of ['p', 'r', 's']) {
          const P = it[prop];
          if (!P || P.a !== 1) continue;
          const ks = P.k.filter((q) => q.s), v0 = ks[0].s;
          for (const q of ks) {
            const d = q.s.map((x, n) => x - v0[n]);
            grp = Math.max(grp, prop === 'p' ? Math.hypot(d[0], d[1] || 0) : prop === 'r' ? Math.abs(d[0]) * Math.PI / 180 * R : Math.max(...d.map(Math.abs)) / 100 * R);
          }
        }
      }
    }
  };
  walk(shapes);
  return Math.max(pathShift, grp);
}

// a file that plays one precomp twice (the approved Lottie of the early scenes): measure the precomp's own layers over one pass
function flatten(lottie) {
  const pre = lottie.layers.filter((l) => l.ty === 0 && l.refId);
  if (!pre.length) return lottie;
  const a = (lottie.assets || []).find((x) => x.id === pre[0].refId);
  return a && a.layers ? { ...lottie, layers: a.layers, op: Math.min(lottie.op, Math.max(...a.layers.map((l) => l.op || 0)) || lottie.op) } : lottie;
}

function layerStats(src) {
  const lottie = flatten(src);
  const k = 1200 / lottie.w, n = Math.round(lottie.op - lottie.ip), by = new Map(lottie.layers.map((l) => [l.ind, l]));
  const world = (L, t) => { let m = localMatrix(L.ks, t); for (let p = L.parent; p; p = by.get(p).parent) m = mul(localMatrix(by.get(p).ks, t), m); return m; };
  const out = [];
  for (const L of lottie.layers) {
    const box = L.shapes && contentBox(L.shapes);
    if (!box) continue;
    const [x0, y0, x1, y1] = box, R = Math.hypot(x1 - x0, y1 - y0) / 2;
    const pts = [[x0, y0], [x1, y0], [x1, y1], [x0, y1], [(x0 + x1) / 2, (y0 + y1) / 2]];
    const at = (t) => { const m = world(L, t); return { pts: pts.map(([x, y]) => [m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5]]), ang: Math.atan2(m[1], m[0]), sc: Math.sqrt(Math.abs(m[0] * m[3] - m[1] * m[2])) }; };
    const base = at(0);
    let amp = 0, rot = 0, scl = 0, peak = 0, path = 0, prev = base, a0 = base.ang, lo = 0, hi = 0;
    for (let t = 1; t <= n; t++) {
      const cur = at(t);
      amp = Math.max(amp, ...cur.pts.map((p, i) => Math.hypot(p[0] - base.pts[i][0], p[1] - base.pts[i][1])));
      let da = cur.ang - prev.ang; da -= Math.round(da / (2 * Math.PI)) * 2 * Math.PI; a0 += da; lo = Math.min(lo, a0 - base.ang); hi = Math.max(hi, a0 - base.ang);
      scl = Math.max(scl, Math.abs(cur.sc / base.sc - 1));
      const step = cur.pts.reduce((s, p, i) => s + Math.hypot(p[0] - prev.pts[i][0], p[1] - prev.pts[i][1]), 0) / pts.length;
      peak = Math.max(peak, step); path += step;
      prev = cur;
    }
    rot = ((hi - lo) * 180) / Math.PI;
    const inner = innerMotion(L.shapes, R);
    const opacity = L.ks.o && L.ks.o.a === 1;
    const row = { name: L.nm, size: Math.hypot(x1 - x0, y1 - y0) * k, amp: Math.max(amp, inner) * k, rot: Math.min(rot, 720), scale: scl, speed: (path / n) * k * lottie.fr, peak: peak * k * lottie.fr, opacity };
    row.moves = row.amp >= TH.px || row.rot >= TH.deg || row.scale >= TH.scale || inner * k >= TH.path;
    row.opacityOnly = !row.moves && opacity;
    out.push(row);
  }
  return out;
}

async function pixels(lottie, tools, size = 256) {
  const puppeteer = req('puppeteer-core');
  const browser = await puppeteer.launch({ executablePath: tools.chrome, headless: true, args: ['--force-color-profile=srgb'] });
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: size, height: size, deviceScaleFactor: 1 });
    await page.setContent(`<html><body style="margin:0"><div id="a" style="width:${size}px;height:${size}px"></div></body></html>`);
    await page.addScriptTag({ path: resolve('lottie-web/build/player/lottie.min.js') });
    return await page.evaluate((d) => {
      const anim = lottie.loadAnimation({ container: document.getElementById('a'), renderer: 'canvas', loop: false, autoplay: false, animationData: d,
        rendererSettings: { clearCanvas: true, preserveAspectRatio: 'xMidYMid meet' } });
      const n = d.op - d.ip, frames = [], alpha = [];
      for (let f = 0; f < n; f++) {
        anim.goToAndStop(d.ip + f, true);
        const c = document.querySelector('#a canvas'), px = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
        const g = new Float32Array(px.length / 4 * 3), al = new Uint8Array(px.length / 4);
        for (let i = 0; i < al.length; i++) { const a = px[i * 4 + 3] / 255; al[i] = px[i * 4 + 3]; for (let q = 0; q < 3; q++) g[i * 3 + q] = px[i * 4 + q] * a + 128 * (1 - a); }
        frames.push(g); alpha.push(al);
      }
      const N = frames[0].length / 3, ink = new Uint8Array(N), mov = new Uint8Array(N), e = [];
      for (let f = 0; f < n; f++) {
        const A = frames[f], B = frames[(f + 1) % n];
        let s = 0;
        for (let i = 0; i < N; i++) {
          if (alpha[f][i] > 8) ink[i] = 1;
          const dd = Math.abs(A[i * 3] - B[i * 3]) + Math.abs(A[i * 3 + 1] - B[i * 3 + 1]) + Math.abs(A[i * 3 + 2] - B[i * 3 + 2]);
          s += dd / 3;
          if (Math.abs(A[i * 3] - frames[0][i * 3]) + Math.abs(A[i * 3 + 1] - frames[0][i * 3 + 1]) + Math.abs(A[i * 3 + 2] - frames[0][i * 3 + 2]) > 60) mov[i] = 1;
        }
        e.push(s / N);
      }
      let inkN = 0, movN = 0; for (let i = 0; i < N; i++) { inkN += ink[i]; movN += mov[i] && ink[i]; }
      return { e, share: inkN ? movN / inkN : 0 };
    }, lottie);
  } finally { await browser.close(); }
}

const mean = (a) => (a.length ? a.reduce((s, v) => s + v, 0) / a.length : 0);

async function measure(file, tools, withPixels, planFile) {
  const lottie = JSON.parse(fs.readFileSync(file, 'utf8'));
  const pf = findPlan(file, planFile), plan = pf ? readPlan(pf) : { exempt: new Set(), fused: new Set(), relief: false };
  const L = layerStats(lottie), mv = L.filter((l) => l.moves), rot = mv.filter((l) => l.rot >= TH.deg);
  const live = L.filter((l) => !plan.exempt.has(baseName(l.name))), liveMoving = live.filter((l) => l.moves);
  const broken = L.filter((l) => plan.fused.has(baseName(l.name)) && (l.amp / (l.size || 1) > CEIL.rel || l.rot > CEIL.rot)).map((l) => `${l.name} ${Math.round(l.amp)} px / ${Math.round(l.rot)}°`);
  const fl = flatten(lottie), sec = (fl.op - fl.ip) / lottie.fr;
  const r = {
    file, sec: +sec.toFixed(2), layers: L.length, moving: mv.length, share: live.length ? +(liveMoving.length / live.length).toFixed(2) : 1, standing: L.length - live.length, relief: plan.relief, broken, opacityOnly: L.filter((l) => l.opacityOnly).length,
    ampMean: +mean(mv.map((l) => l.amp)).toFixed(1), ampMax: +Math.max(0, ...L.map((l) => l.amp)).toFixed(1),
    rotMean: +mean(rot.map((l) => l.rot)).toFixed(1), rotMax: +Math.max(0, ...L.map((l) => l.rot)).toFixed(1),
    scaleMax: +(Math.max(0, ...L.map((l) => l.scale)) * 100).toFixed(1),
    speedMean: +mean(mv.map((l) => l.speed)).toFixed(0), speedPeak: +Math.max(0, ...L.map((l) => l.peak)).toFixed(0),
    rows: L,
  };
  if (withPixels) {
    const { e, share } = await pixels(lottie, tools);
    const med = [...e].sort((a, b) => a - b)[Math.floor(e.length / 2)];
    let best = 0, run = 0; for (let k = 0; k < 2 * e.length; k++) { if (e[k % e.length] < 0.15 * med) { run++; best = Math.max(best, Math.min(run, e.length)); } else run = 0; }
    r.pxShare = +share.toFixed(2); r.pxEnergy = +(mean(e) * lottie.fr).toFixed(2); r.stillSec = +(best / lottie.fr).toFixed(2);
  }
  return r;
}

function findings(r) {
  const out = [];
  if (r.broken && r.broken.length) out.push(`falls apart: ${r.broken.join('; ')} — a fused block swings past ${CEIL.rel * 100} % of its size or ${CEIL.rot}°; cut the swing so the cut stays closed and no foreign line is crossed`);
  if (r.ampMax < FLOOR.swing) out.push(`sluggish: the biggest swing is ${r.ampMax} px of 1200, the floor is ${FLOOR.swing} px — the acting part and what answers it must travel further`);
  if (r.pxShare !== undefined && !r.relief && r.pxShare < FLOOR.pxShare) out.push(`mostly standing: only ${Math.round(r.pxShare * 100)}% of the drawing ever changes, the floor is ${Math.round(FLOOR.pxShare * 100)}% — give the parts that stand a motion by their affordance or an answer to the main beat`);
  if (r.share < FLOOR.moving) out.push(`${r.layers - r.standing - Math.round(r.share * (r.layers - r.standing))} of ${r.layers - r.standing} parts that are not standing by a reason never move — the floor is half of the parts`);
  return out;
}

module.exports = { layerStats, measure, findings, readPlan, TH, FLOOR, CEIL };

if (require.main === module) (async () => {
  const argv = process.argv.slice(2);
  const ji = argv.indexOf('--json'), jsonOut = ji >= 0 ? argv.splice(ji, 2)[1] : '';
  const ni = argv.indexOf('--no-pixels'), withPixels = ni < 0; if (ni >= 0) argv.splice(ni, 1);
  const pi = argv.indexOf('--plan'), planFile = pi >= 0 ? argv.splice(pi, 2)[1] : '';
  const ci = argv.indexOf('--check'), check = ci >= 0; if (check) argv.splice(ci, 1);
  const tools = withPixels ? loadTools() : null, all = []; let bad = 0;
  for (const f of argv) {
    try {
      const r = await measure(f, tools, withPixels, planFile);
      all.push(r);
      const { rows, ...short } = r;
      console.log(JSON.stringify(short));
      if (check) { const f = findings(r); bad += f.length; for (const x of f) console.log('  vigor: ' + x); }
    } catch (e) { console.log(JSON.stringify({ file: f, error: String(e.message || e) })); }
  }
  if (jsonOut) fs.writeFileSync(jsonOut, JSON.stringify(all, null, 1));
  if (check && bad) process.exitCode = 1;
})();
