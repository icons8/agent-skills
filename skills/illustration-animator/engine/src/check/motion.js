// Speed of every animated property in px per frame: jumps of speed at keys (lint) and smoothness of runs (rhythm).
// Calibrated on refs/Plain (node engine/bin/motion-ref.js): a motion starts at 0.4–0.8 of its mean speed,
// speed changes over 2× between frames only where a symbol appears.
// Checked against eval/approved (node engine/bin/regress.js): a snap of up to `snap` frames after a key — a pop from rest,
// a rebound after an impact, a squash released, a wobble — may start at any speed: the owner approved such accents
// in Main, Organic, Black Chalk and Ballpoint Pen. A part arriving off the canvas (a car driving out) may arrive at speed.
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');
const { valueAt } = require('../lottie/keys');

const LIMITS = { start: 1.5, stop: 2.5, kink: 2, snap: 8 };
const EPS = 0.02;
const asArr = (v) => (Array.isArray(v) ? v : [v]);
const len = (v) => Math.hypot(...v);

// px per unit of a property: p is px already; r and s move the far edge of the part; bend — bone b moves the chain after it
function scaler(part, prop) {
  const [x0, y0, x1, y1] = part.bbox;
  const R = Math.hypot(x1 - x0, y1 - y0) / 2;
  if (prop === 'p') return (v) => asArr(v).slice(0, 2);
  if (prop === 's') return (v) => asArr(v).slice(0, 2).map((x) => (x / 100) * R);
  if (prop === 'r') return (v) => [(asArr(v)[0] * Math.PI * R) / 180];
  const J = part.bones.joints;
  const reachOf = J.slice(0, -1).map((j) => Math.max(...J.map((q) => Math.hypot(q[0] - j[0], q[1] - j[1]))));
  return (v) => asArr(v).map((a, b) => (a * Math.PI * reachOf[b]) / 180);
}

// every animated transform (and bend) of every part, with its px scaler
function props(lottie, model) {
  const out = [];
  for (const L of lottie.layers) {
    const part = model.parts[L.nm];
    if (!part || !part.bbox) continue;
    for (const prop of ['p', 's', 'r']) {
      const P = L.ks && L.ks[prop];
      if (P && P.a === 1 && !model.linearOk.has(`${L.nm}.${prop}`)) out.push({ L, part, prop, P, px: scaler(part, prop) });
    }
    if (part.bendProp && part.bendProp.a === 1) out.push({ L, part, prop: 'bend', P: part.bendProp, px: scaler(part, 'bend') });
  }
  return out;
}

const at = (x, t) => x.px(valueAt(x.P, t));
const diff = (a, b) => a.map((v, n) => v - b[n]);
// mean speed over [t0, t1], px per frame, from 4 samples a frame (sees an overshoot inside one segment)
function meanSpeed(x, t0, t1) {
  if (t1 <= t0) return 0;
  const n = Math.max(4, Math.round((t1 - t0) * 4));
  let path = 0, prev = at(x, t0);
  for (let k = 1; k <= n; k++) { const cur = at(x, t0 + ((t1 - t0) * k) / n); path += len(diff(cur, prev)); prev = cur; }
  return path / (t1 - t0);
}

// the part has left the canvas by position (a car driving out): it may arrive there at full speed
function offCanvas(x, lottie, t) {
  if (x.prop !== 'p') return false;
  const d = diff(valueAt(x.P, t), valueAt(x.P, 0));
  const [x0, y0, x1, y1] = x.part.bbox;
  return x1 + d[0] < 0 || y1 + d[1] < 0 || x0 + d[0] > lottie.w || y0 + d[1] > lottie.h;
}

function hidden(L, t) {
  const o = L.ks.o && L.ks.o.a === 1 ? valueAt(L.ks.o, t)[0] : 100;
  const s = L.ks.s && L.ks.s.a === 1 ? valueAt(L.ks.s, t) : [100, 100];
  return o < 5 || Math.min(Math.abs(s[0]), Math.abs(s[1])) < 5;
}

// Speed right before and after every key (analytic, not per frame) against the mean speed around it.
// Keys inside a run of one-frame keys (spring, bend with lag) are the template's own curve and are skipped.
function checkSpeed(lottie, model) {
  const out = [];
  const op = model.op;
  const allowed = new Set((model.jumps || []).filter((j) => j.allowed).map((j) => `${j.part}.${j.prop}.${j.frame}`));
  for (const x of props(lottie, model)) {
    const k = x.P.k;
    const moving = (j) => j >= 0 && j < k.length - 1 && k[j].h !== 1;
    const span = (j) => k[j + 1].t - k[j].t;
    // mean speed of a segment; a one-frame key spreads over the run it belongs to (up to 6 frames)
    const segMean = (j, dir) => {
      if (span(j) > 1) return meanSpeed(x, k[j].t, k[j + 1].t);
      let a = j, b = j;
      while (dir > 0 && moving(b + 1) && span(b + 1) === 1 && k[b + 1].t - k[a].t < 6) b++;
      while (dir < 0 && moving(a - 1) && span(a - 1) === 1 && k[b + 1].t - k[a - 1].t <= 6) a--;
      return meanSpeed(x, k[a].t, k[b + 1].t);
    };
    // frames the motion after key j lasts: a run of one-frame keys counts whole
    const runLen = (j) => { let b = j; while (span(b) === 1 && moving(b + 1) && span(b + 1) === 1) b++; return k[b + 1].t - k[j].t; };
    for (let j = 0; j < k.length - 1; j++) {
      const t = k[j].t;
      if (allowed.has(`${x.L.nm}.${x.prop}.${t}`)) continue;
      // frame 0 meets the end of the loop: the segment before it is the last one
      const jb = j === 0 ? k.length - 2 : j - 1;
      const tb = j === 0 ? op : t;
      const before = moving(jb), after = moving(j);
      if (before && after && span(jb) === 1 && span(j) === 1) continue;
      if (hidden(x.L, tb === op ? 0 : t)) continue;
      const snap = after && runLen(j) <= LIMITS.snap;
      const vb = before ? diff(at(x, tb), at(x, tb - EPS)).map((v) => v / EPS) : [0];
      const va = after ? diff(at(x, t + EPS), at(x, t)).map((v) => v / EPS) : [0];
      const mb = before ? segMean(jb, -1) : 0, ma = after ? segMean(j, 1) : 0;
      const M = Math.max(mb, ma);
      if (M < 0.2) continue;
      const a = len(vb), b = len(va);
      let detail = null;
      if (a < 0.05 * M && ma && b > LIMITS.start * ma && !snap) {
        detail = `${x.prop}: jerk from rest — starts ${(b / ma).toFixed(1)}× faster than average (from rest use a curve with a flat start: soft, inOut or spring; out and back only continue a motion)`;
      } else if (b < 0.05 * M && mb && a > LIMITS.stop * mb && !offCanvas(x, lottie, t)) {
        detail = `${x.prop}: hit at the key — arrives ${(a / mb).toFixed(1)}× faster than average (brake into the key or continue the motion with a spring)`;
      } else if (a >= 0.05 * M && b >= 0.05 * M && !snap) {
        const dot = vb.reduce((s, v, n) => s + v * (va[n] || 0), 0);
        if (dot < 0 && Math.min(a, b) > 0.5 * M) detail = `${x.prop}: reversal without braking at the key`;
        else if (Math.max(a, b) / Math.min(a, b) > LIMITS.kink && Math.max(a, b) > M) {
          detail = `${x.prop}: speed kink at the key — ${(Math.max(a, b) / Math.min(a, b)).toFixed(1)}× (speeds on both sides of the key must match)`;
        }
      }
      if (detail) { out.push({ check: 'speed', part: x.L.nm, frame: t, detail }); break; }
    }
  }
  return out;
}

// Frame-to-frame speed of every property over the loop, px per frame: s[t] = |X(t+1) − X(t)|.
// A step that starts or ends hidden is not seen: a symbol moved to its start while invisible has speed 0.
function speedSeries(lottie, model) {
  return props(lottie, model).map((x) => {
    const s = [];
    let prev = at(x, 0), was = hidden(x.L, 0);
    for (let t = 1; t <= (model.op ?? lottie.op); t++) {
      const cur = at(x, t), now = hidden(x.L, t);
      s.push(was || now ? 0 : len(diff(cur, prev)));
      prev = cur; was = now;
    }
    return { part: x.L.nm, prop: x.prop, s, L: x.L };
  });
}

// Runs of motion (speed above `floor`) in a cyclic series: [{t0, s: [...]}], longest first not guaranteed
function bursts(s, floor = 0.05) {
  const n = s.length, still = s.findIndex((v) => v <= floor);
  if (still < 0) return [{ t0: 0, s: [...s], closed: false }];
  const out = [];
  let cur = null;
  for (let k = 1; k <= n; k++) {
    const t = (still + k) % n;
    if (s[t] > floor) (cur ??= { t0: t, s: [], closed: true }).s.push(s[t]);
    else if (cur) { out.push(cur); cur = null; }
  }
  if (cur) out.push(cur);
  return out;
}

// Log dimensionless jerk of a speed profile (higher = smoother; a min-jerk bell is about −1.6, a jerky one far below).
// The profile is padded with rest on both sides, so a start at speed counts as a jerk.
function ldlj(s) {
  if (s.length < 4) return null;
  const v = [0, ...s, 0], T = s.length + 1, peak = Math.max(...s);
  if (!(peak > 0)) return null;
  let J = 0;
  for (let t = 1; t < v.length - 1; t++) J += (v[t + 1] - 2 * v[t] + v[t - 1]) ** 2;
  return -Math.log((T ** 3 / peak ** 2) * J);
}

// How fast a run starts: its first frame against the mean of its first 8 frames (a long decaying tail does not count).
const startRatio = (s) => { const h = s.slice(0, 8); return s[0] / (h.reduce((a, v) => a + v, 0) / h.length); };

// Start ratio (first frame vs mean) and the smoothness of each closed run of every property, px per frame.
function runStats(lottie, model) {
  const out = [];
  const allowed = new Set((model.jumps || []).filter((j) => j.allowed).map((j) => `${j.part}.${j.prop}.${j.frame}`));
  for (const sr of speedSeries(lottie, model)) {
    for (const b of bursts(sr.s)) {
      if (b.s.length < 4) continue;
      const mean = b.s.reduce((a, v) => a + v, 0) / b.s.length;
      if (mean < 0.3) continue;
      // a symbol that pops out of nothing or after an allowed jump starts at speed by design
      const quiet = b.closed && !hidden(sr.L, b.t0) && !allowed.has(`${sr.part}.${sr.prop}.${b.t0}`);
      out.push({ part: sr.part, prop: sr.prop, len: b.s.length, start: quiet ? startRatio(b.s) : null, ldlj: ldlj(b.s) });
    }
  }
  return out;
}

// Motion energy of a video, one value a frame: mean luma difference of neighbouring frames, transparent = black.
function videoEnergy(env, video) {
  const codec = execFileSync(env.ffprobe, ['-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=codec_name', '-of', 'csv=p=0', video]).toString().trim();
  const dec = { vp9: ['-c:v', 'libvpx-vp9'], vp8: ['-c:v', 'libvpx'] }[codec] || [];
  // metadata=print writes to a file; a relative name in a temp cwd avoids the drive colon in the filter string
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'animator-energy-'));
  try {
    execFileSync(env.ffmpeg, ['-loglevel', 'error', ...dec, '-i', video, '-filter_complex',
      '[0:v]format=rgba,split[a][b];[a]alphaextract[al];[b]format=gray[g];[g][al]blend=all_mode=multiply,tblend=all_mode=difference,signalstats,metadata=print:key=lavfi.signalstats.YAVG:file=e.txt',
      '-f', 'null', '-'], { cwd: dir });
    return [...fs.readFileSync(path.join(dir, 'e.txt'), 'utf8').matchAll(/YAVG=([\d.]+)/g)].map((m) => Number(m[1]));
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

module.exports = { LIMITS, checkSpeed, speedSeries, bursts, ldlj, startRatio, runStats, videoEnergy };
