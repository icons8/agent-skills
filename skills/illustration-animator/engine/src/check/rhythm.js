const { valueAt } = require('../lottie/keys');
const { TEMPLATES } = require('../templates');
const { runStats: speedRuns } = require('./motion');

// Rhythm of a compiled scene vs a style profile: loop, move and hold lengths, amplitudes, overshoot, lag, easing.
const asArr = (v) => (Array.isArray(v) ? v : [v]);
const same = (a, b) => asArr(a).every((v, i) => Math.abs(v - asArr(b)[i]) < 0.01);
const first = (v) => asArr(v)[0];
const round2 = (x) => Math.round(x * 100) / 100;

function median(xs) {
  if (!xs.length) return null;
  const s = [...xs].sort((a, b) => a - b), m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

const isLinear = (k) => Math.abs(first(k.o.x) - first(k.o.y)) < 1e-3 && Math.abs(first(k.i.x) - first(k.i.y)) < 1e-3;

// Maximal stretches where the prop keeps changing; a hold key or an unchanged segment ends a run.
function runs(prop) {
  if (!prop || prop.a !== 1) return [];
  const k = prop.k, out = [];
  let cur = null;
  for (let j = 0; j < k.length - 1; j++) {
    const a = k[j], b = k[j + 1];
    if (!a.h && !same(a.s, b.s)) {
      if (!cur) cur = { t0: a.t, t1: b.t, keys: [a], segs: 0, linear: 0, obj: prop };
      cur.t1 = b.t;
      cur.keys.push(b);
      cur.segs++;
      if (isLinear(a) && b.t - a.t > 1) cur.linear++; // one-frame keys are a sampled curve
    } else if (cur) {
      out.push(cur);
      cur = null;
    }
  }
  if (cur) out.push(cur);
  return out;
}

// p and s compare x,y; r and bend compare angles
const comps = (prop, s) => (prop === 'p' || prop === 's' ? asArr(s).slice(0, 2) : asArr(s));

function overshootOf(vals) {
  const a = vals[0], z = vals[vals.length - 1];
  const d = z.map((v, i) => v - a[i]);
  const L2 = d.reduce((s, v) => s + v * v, 0);
  if (L2 > 1e-6) {
    const prog = vals.map((v) => v.reduce((s, x, i) => s + (x - a[i]) * d[i], 0) / L2);
    return Math.max(0, Math.max(...prog) - 1) * 100;
  }
  const dev = vals.map((v) => v.map((x, i) => x - a[i]));
  let peak = 0, at = 0;
  dev.forEach((v, j) => { const m = Math.hypot(...v); if (m > peak) { peak = m; at = j; } });
  if (peak < 1e-6) return 0;
  const dir = dev[at].map((x) => x / peak);
  const back = Math.max(0, ...dev.slice(at).map((v) => -v.reduce((s, x, i) => s + x * dir[i], 0)));
  return (back / peak) * 100;
}

// Amplitude and overshoot come from the value at every frame, so easing overshoot (back, out) is seen too.
function runStats(run, prop) {
  const vals = [];
  for (let t = run.t0; t <= run.t1; t++) vals.push(comps(prop, valueAt(run.obj, t)));
  const a = vals[0];
  const dev = vals.map((v) => v.map((x, i) => x - a[i]));
  const amp = prop === 'p' || prop === 's'
    ? Math.max(...dev.map((v) => Math.hypot(...v)))
    : Math.max(...dev.map((v) => Math.max(...v.map(Math.abs))));
  return { len: run.t1 - run.t0, amp, overshoot: overshootOf(vals) };
}

// one bone angle as its own scalar prop
const boneProp = (prop, i) => ({ a: 1, k: prop.k.map((kf) => ({ ...kf, s: [asArr(kf.s)[i]] })) });

// Time spans of ambient tracks (drift, sway): their runs are background and stay out of the rhythm.
function ambientSpans(model) {
  const out = [];
  for (const tr of (model.scene && model.scene.tracks) || []) {
    if (tr.role !== 'ambient') continue;
    let keys;
    try {
      const { part, t, at, role, beat, jump, constant, keys: own, ...params } = tr;
      keys = own || TEMPLATES[t](at, params);
    } catch (e) { continue; }
    for (const [prop, ks] of Object.entries(keys)) out.push({ part: tr.part, prop, t0: ks[0][0], t1: ks[ks.length - 1][0] });
  }
  return out;
}

function partRuns(lottie, model) {
  const out = {};
  const ambient = ambientSpans(model);
  // A run that overlaps an ambient span keeps only the parts outside it (a joined float + move is one run in the keys).
  const trim = (name, prop, r) => {
    let pieces = [[r.t0, r.t1]];
    for (const a of ambient.filter((x) => x.part === name && x.prop === prop)) {
      pieces = pieces.flatMap(([u0, u1]) => [[u0, Math.min(u1, a.t0)], [Math.max(u0, a.t1), u1]]).filter(([u0, u1]) => u1 > u0);
    }
    return pieces.map(([u0, u1]) => {
      const segs = [];
      for (let j = 0; j < r.keys.length - 1; j++) if (r.keys[j].t < u1 && r.keys[j + 1].t > u0) segs.push(r.keys[j]);
      return { ...r, t0: u0, t1: u1, segs: segs.length, linear: segs.filter((k, j) => isLinear(k) && r.keys[r.keys.indexOf(k) + 1].t - k.t > 1).length };
    }).filter((x) => x.segs > 0);
  };
  for (const L of lottie.layers) {
    const list = [];
    for (const prop of ['p', 's', 'r']) {
      if (model.linearOk.has(`${L.nm}.${prop}`)) continue;
      for (const r of runs(L.ks && L.ks[prop])) for (const piece of trim(L.nm, prop, r)) list.push({ ...piece, prop });
    }
    const part = model.parts[L.nm];
    if (part && part.bendProp) {
      const n = asArr(part.bendProp.k[0].s).length;
      for (let bone = 0; bone < n; bone++) {
        for (const r of runs(boneProp(part.bendProp, bone))) for (const piece of trim(L.nm, 'bend', r)) list.push({ ...piece, prop: 'bend', bone });
      }
    }
    if (list.length) out[L.nm] = list;
  }
  return out;
}

function metrics(lottie, model) {
  const byPart = partRuns(lottie, model);
  const all = Object.values(byPart).flat();
  const stats = all.map((r) => ({ ...runStats(r, r.prop), prop: r.prop }));

  const holds = [];
  for (const list of Object.values(byPart)) {
    const iv = list.map((r) => [r.t0, r.t1]).sort((a, b) => a[0] - b[0]);
    const merged = [];
    for (const x of iv) {
      const last = merged[merged.length - 1];
      if (last && x[0] <= last[1]) last[1] = Math.max(last[1], x[1]);
      else merged.push([...x]);
    }
    for (let n = 1; n < merged.length; n++) holds.push(merged[n][0] - merged[n - 1][1]);
  }

  const lags = [];
  for (const [name, list] of Object.entries(byPart)) {
    const part = model.parts[name];
    const parentName = part && (part.parent || (part.attach && part.attach.part));
    const lag = (r, starts) => {
      const d = starts.map((s) => r.t0 - s).filter((x) => x >= 0 && x <= 8);
      if (d.length) lags.push(Math.min(...d));
    };
    if (parentName && byPart[parentName]) {
      const starts = byPart[parentName].map((r) => r.t0);
      for (const r of list) lag(r, starts);
    }
    // neighbouring bones of one part: the child bone follows its parent bone
    for (const r of list) {
      if (r.bone > 0) lag(r, list.filter((q) => q.bone === r.bone - 1).map((q) => q.t0));
    }
  }

  // median over the runs that actually overshoot (a run that just arrives does not dilute it)
  const overshoots = stats.map((s) => s.overshoot).filter((v) => v > 0.5);
  // bend easing is the template's own curve (a key per frame), so bend runs stay out of the linear share
  const easy = all.filter((r) => r.prop !== 'bend');
  const segs = easy.reduce((s, r) => s + r.segs, 0);
  const pick = (props) => stats.filter((s) => props.includes(s.prop)).map((s) => s.amp);
  const med = (xs) => (xs.length ? round2(median(xs)) : null);
  // duration grows slower than distance: 20 frames for 100 px at 30 fps, ×1.3 for 200 px, ×1.6 for 400 px
  // (Plain: 230 → 460 px in 27 → 34 frames); only moves of 60 px and more
  const fit = stats.filter((s) => s.prop === 'p' && s.amp >= 60)
    .map((s) => s.len / ((20 * (1 + 0.3 * Math.log2(s.amp / 100)) * lottie.fr) / 30));
  // speed profile of every run, px per frame: how fast it starts (first frame vs mean) and how smooth it is
  const sr = speedRuns(lottie, model);
  // clicks and pops of 2–5 frames are quick by design and stay out of the start
  const starts = sr.filter((r) => r.len >= 6).map((r) => r.start).filter((x) => x !== null);
  return {
    fps: lottie.fr,
    loopSec: round2((lottie.op - lottie.ip) / lottie.fr),
    moveFrames: med(stats.map((s) => s.len)),
    holdFrames: med(holds),
    rotAmpDeg: med(pick(['r', 'bend'])),
    posAmpPx: med(pick(['p'])),
    overshootPct: stats.length ? med(overshoots.length ? overshoots : [0]) : null,
    lagFrames: med(lags),
    linearShare: segs ? round2(easy.reduce((s, r) => s + r.linear, 0) / segs) : null,
    moveDistFit: med(fit),
    startMax: starts.length ? round2(Math.max(...starts)) : null,
    ldlj: med(sr.map((r) => r.ldlj).filter((x) => x !== null)),
  };
}

const LABELS = {
  loopSec: 'loop length, s',
  moveFrames: 'motion, frames (median)',
  holdFrames: 'hold, frames (median)',
  rotAmpDeg: 'rotation, ° (median)',
  posAmpPx: 'shift, px (median)',
  overshootPct: 'overshoot, % (median)',
  lagFrames: 'lag, frames (median)',
  linearShare: 'share of linear easing',
  moveDistFit: 'move duration to distance (1 = like Plain)',
  startMax: 'sharpest start, × average speed',
  ldlj: 'speed smoothness, LDLJ (median)',
};

function score(m, profile) {
  const misses = [];
  let sum = 0, n = 0;
  n++;
  if (m.fps === profile.fps) sum++;
  else misses.push(`fps: ${m.fps}, style has ${profile.fps}`);
  for (const [key, [lo, hi]] of Object.entries(profile.ranges)) {
    const v = m[key];
    if (v === null || v === undefined) continue;
    n++;
    const pts = v >= lo && v <= hi ? 1 : v >= lo - 0.25 * Math.abs(lo) && v <= hi + 0.25 * Math.abs(hi) ? 0.5 : 0;
    sum += pts;
    if (pts < 1) misses.push(`${LABELS[key]}: ${v}, style has ${lo}–${hi}`);
  }
  return { score: round2(sum / n), misses };
}

function rhythm(lottie, model, profile) {
  const m = metrics(lottie, model);
  return { metrics: m, ...score(m, profile) };
}

module.exports = { runs, runStats, metrics, score, rhythm };
