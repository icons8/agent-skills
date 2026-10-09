// Motion templates. Keys are relative to rest: p [dx,dy], s [sx,sy] %, r deg, o %, bend [deg per bone].
// Defaults come from the Notes UX reference at 30 fps; the agent tunes every param per scene.
// From rest every template starts flat (zero speed); overshoot and settle come from a damped spring, a key per frame.
const { EASE, cubicBezier } = require('../lottie/keys');
const R = Math.round;

// Ambient cycles (part of the plot, never the whole animation): whole periods only, so the loop stays seamless.
function cycles(at, dur, period, half) {
  if (!(Number.isInteger(dur) && dur > 0 && Number.isInteger(period) && period > 0)) {
    throw new Error('ambient motion: dur and period must be whole frame counts above 0');
  }
  if (dur % period) throw new Error(`ambient motion: ${dur} frames do not fit a whole number of periods of ${period}`);
  const keys = [];
  for (let t = 0; t < dur; t += period) keys.push([at + t, half(0), 'sine'], [at + t + R(period / 2), half(1), 'sine']);
  keys.push([at + dur, half(0)]);
  return keys;
}

// --- vector helpers: values are numbers or [x, y]
const vec = (v) => (Array.isArray(v) ? v : [v]);
const shape = (like, a) => (Array.isArray(like) ? a : a[0]);
const r3 = (x) => Math.round(x * 1000) / 1000 + 0; // + 0: no −0 in the keys

// Cubic Hermite from p0 to p1 over T frames with start/end speeds v0, v1 (per frame, scalar along the way).
const hermite = (T, v0, v1) => (t) => {
  const u = t / T, u2 = u * u, u3 = u2 * u;
  return (3 * u2 - 2 * u3) + (u3 - 2 * u2 + u) * (v0 * T) + (u3 - u2) * (v1 * T);
};

// Damped spring around 0: displacement x0, speed v0, half-period `half` frames, damping zeta.
// Each swing is exp(−ζπ/√(1−ζ²)) of the previous one: 0.35 at ζ 0.32 (Plain: 0.3–0.4).
function spring(x0, v0, half, zeta) {
  const wd = Math.PI / half, w0 = wd / Math.sqrt(1 - zeta * zeta), k = zeta * w0;
  return (t) => Math.exp(-k * t) * (x0 * Math.cos(wd * t) + ((v0 + k * x0) / wd) * Math.sin(wd * t));
}

// First peak of a spring that starts at 0 with unit speed: how far a speed of 1 per frame carries past the target.
function reach(half, zeta) {
  const f = spring(0, 1, half, zeta);
  let peak = 0;
  for (let t = 0; t <= half; t += 0.05) peak = Math.max(peak, f(t));
  return peak;
}

// The spring is cut at n frames: the last third fades to exactly 0, so the key after it meets it at rest.
function tail(f, n) {
  const from = Math.max(1, Math.floor(n * 0.66));
  return (t) => {
    if (t >= n) return 0;
    if (t <= from) return f(t);
    const u = (t - from) / (n - from);
    return f(t) * (1 - u * u * (3 - 2 * u));
  };
}

const zetaOf = (ratio) => { const l = Math.log(ratio); return -l / Math.sqrt(Math.PI * Math.PI + l * l); };
const halfFor = (n, half) => half ?? Math.min(8, Math.max(2, R(n / 2.5)));

// Frames at, at+1 … at+dur from f(t) (t from 0): a key per frame, the spring's own curve, no easing between.
function dense(at, dur, f) {
  const keys = [];
  for (let t = 0; t <= dur; t++) keys.push([at + t, f(t), 'lin']);
  delete keys[keys.length - 1][2];
  return keys;
}

// Bulge of a path from a to b: offset perpendicular to the travel, `arc` × length at the middle (> 0 — up for a move right).
function bulge(a, b, arc) {
  const d = [b[0] - a[0], b[1] - a[1]], L = Math.hypot(d[0], d[1]);
  if (!arc || !L) return null;
  return { n: [d[1] / L, -d[0] / L], h: arc * L };
}

const RAW = {
  // state change: cursor path segment, object travel; arc bends the path (10–20 % of its length)
  move: (at, { from = [0, 0], to, dur = 16, ease = 'soft', arc = 0 }) => {
    const b = bulge(from, to, arc);
    if (!b) return { p: [[at, from, ease], [at + dur, to]] };
    const off = (b.h * 4) / 3, d = [to[0] - from[0], to[1] - from[1]];
    const tan = { to: [d[0] / 3 + b.n[0] * off, d[1] / 3 + b.n[1] * off], ti: [-d[0] / 3 + b.n[0] * off, -d[1] / 3 + b.n[1] * off] };
    return { p: [[at, from, ease, tan], [at + dur, to]] };
  },

  // cursor press
  click: (at, { depth = 84, down = 3, up = 5 } = {}) => ({
    s: [[at, [100, 100], 'soft'], [at + down, [depth, depth], 'soft'], [at + down + up, [100, 100]]],
  }),

  // reaction to a click: swell from rest, then the spring settles it (under — the first dip, sets the damping;
  // under: null — damping from zeta)
  pop: (at, { peak = 118, under = 96, dur = 12, half, zeta = 0.32 } = {}) => {
    if (!(dur >= 4)) throw new Error(`pop: dur ${dur} is too short for the swell and settle, need 4 frames or more`);
    const rise = Math.max(2, R(dur * 0.3)), n = dur - rise, A = peak - 100;
    const z = under !== null && A ? zetaOf(Math.min(0.9, Math.max(0.05, (100 - under) / A))) : zeta;
    const up = hermite(rise, 0, 0), settle = tail(spring(A, 0, halfFor(n, half), z), n);
    const f = (t) => { const v = r3(100 + (t <= rise ? A * up(t) : settle(t - rise))); return [v, v]; };
    return { s: dense(at, dur, f) };
  },

  // toggle knob, drawer: travel from rest, fly past by `overshoot` of the way and spring back
  slide: (at, { from = [0, 0], to, dur = 15, overshoot = 0.03, arc = 0, half, zeta = 0.32 }) => {
    const L = Math.hypot(to[0] - from[0], to[1] - from[1]);
    const T = Math.max(2, R(dur * 0.6)), n = dur - T, hf = halfFor(n, half);
    const v1 = n > 0 && L ? Math.min(2.5 / T, overshoot / reach(hf, zeta)) : 0; // share of the way per frame
    const go = hermite(T, 0, v1), settle = tail(spring(0, v1, hf, zeta), n);
    const b = bulge(from, to, arc);
    const f = (t) => {
      const q = t <= T ? go(t) : 1 + settle(t - T);
      const pt = [from[0] + (to[0] - from[0]) * q, from[1] + (to[1] - from[1]) * q];
      if (b) { const h = b.h * 4 * q * (1 - q); pt[0] += b.n[0] * h; pt[1] += b.n[1] * h; }
      return pt.map(r3);
    };
    return { p: dense(at, dur, f) };
  },

  // happy hop: up from rest, fall, land with a dip of ~0.2 height and a spring
  bounce: (at, { height = 20, dur = 15, half, zeta = 0.32 } = {}) => {
    const T1 = Math.max(2, R(dur * 0.35)), T2 = Math.max(2, R(dur * 0.3)), n = dur - T1 - T2, hf = halfFor(n, half);
    const vLand = n > 0 ? Math.min(2.5 / T2, 0.2 / reach(hf, zeta)) : 0; // share of height per frame
    const up = hermite(T1, 0, 0), down = hermite(T2, 0, vLand), settle = tail(spring(0, vLand, hf, zeta), n);
    const f = (t) => {
      const y = t <= T1 ? -up(t) : t <= T1 + T2 ? -1 + down(t - T1) : settle(t - T1 - T2);
      return [0, r3(height * y)];
    };
    return { p: dense(at, dur, f) };
  },

  // pendulum reaction (medal, sign) after a hit: pushed to −angle, then swings out with light damping
  swing: (at, { angle = 9, dur = 50, zeta = 0.16 } = {}) => {
    const T = Math.max(2, R(dur * 0.16)), n = dur - T;
    const push = hermite(T, 0, 0), settle = tail(spring(-angle, 0, Math.max(2, R(dur * 0.28)), zeta), n);
    return { r: dense(at, dur, (t) => r3(t <= T ? -angle * push(t) : settle(t - T))) };
  },

  // settle into `to` from `from` (relative to rest) with a damped spring; v0 — speed of the motion coming in, per frame.
  // prop: p (default for [x, y]), s, r (default for a number) or bend; `to` defaults to rest.
  spring: (at, { prop, from, to, v0 = 0, half = 6, zeta = 0.32, dur }) => {
    prop = prop ?? (Array.isArray(from) ? 'p' : 'r');
    if (!['p', 's', 'r', 'bend'].includes(prop)) throw new Error(`spring: prop must be p, s, r or bend (got ${prop})`);
    const goal = to ?? (prop === 's' ? [100, 100] : Array.isArray(from) ? from.map(() => 0) : 0);
    const n = dur ?? Math.min(60, Math.ceil(Math.log(50) / ((zeta * Math.PI) / half / Math.sqrt(1 - zeta * zeta))));
    const fs = vec(from).map((x, i) => tail(spring(x - vec(goal)[i], vec(v0)[i] ?? vec(v0)[0], half, zeta), n));
    return { [prop]: dense(at, n, (t) => shape(from, vec(goal).map((g, i) => r3(g + fs[i](t))))) };
  },

  // whole turns around the pivot at constant speed (loader ring, wheel, clock hand); turns may be a fraction
  // (1/12 — one tick), the loop closes when the turns add up to whole ones
  spin: (at, { dur, turns = 1, from = 0, ease = 'lin' }) => ({ r: [[at, from, ease], [at + dur, from + 360 * turns]] }),

  // rotation from one angle to another (head tilt, star turn)
  turn: (at, { from = 0, to, dur = 20, ease = 'soft' }) => ({ r: [[at, from, ease], [at + dur, to]] }),

  // hide and show (the element is visible at frame 0, so appear always follows disappear)
  disappear: (at, { dur = 8 } = {}) => ({ s: [[at, [100, 100], 'in'], [at + dur, [0, 0]]], o: [[at, 100, 'in'], [at + dur, 0]] }),
  appear: (at, { dur = 10 } = {}) => ({ s: [[at, [0, 0], 'back'], [at + dur, [100, 100]]], o: [[at, 0, 'out'], [at + R(dur / 2), 100]] }),

  // bend a rigged part from one pose to another
  // lag > 0: bone b starts b·lag frames after bone 0 (lag along the chain; 1 by default for 2+ bones). Every frame is
  // a key, so each bone keeps the template's own curve; with lag 0 two keys and one ease for all bones.
  bend: (at, { from, to, dur = 10, ease = 'soft', lag }) => {
    lag = lag ?? (from.length > 1 ? 1 : 0);
    if (!(Number.isInteger(lag) && lag >= 0)) throw new Error('bend: lag must be a whole number of frames, 0 or more');
    if (!lag) return { bend: [[at, from, ease], [at + dur, to]] };
    const curve = cubicBezier(...(Array.isArray(ease) ? ease : EASE[ease] || EASE.soft));
    const end = at + (from.length - 1) * lag + dur;
    const keys = [];
    for (let t = at; t <= end; t++) {
      keys.push([t, from.map((v, b) => v + (to[b] - v) * curve(Math.min(1, Math.max(0, (t - at - b * lag) / dur)))), 'lin']);
    }
    delete keys[keys.length - 1][2];
    return { bend: keys };
  },

  // ambient: drift up and back (panels, symbols), sway around the pivot (sign, lamp)
  float: (at, { dur, period, amp = 8 }) => ({ p: cycles(at, dur, period, (k) => (k ? [0, -amp] : [0, 0])) }),
  sway: (at, { dur, period, angle = 4 }) => ({ r: cycles(at, dur, period, (k) => (k ? angle : 0)) }),
};

// Params without a default: a missing one gives a Russian error instead of NaN/TypeError.
const REQUIRED = { move: ['to'], slide: ['to'], turn: ['to'], bend: ['from', 'to'], float: ['dur', 'period'], sway: ['dur', 'period'], spring: ['from'], spin: ['dur'] };

const bad = (v) => v === null || v === undefined || (typeof v === 'number' && !Number.isFinite(v)) || (Array.isArray(v) && v.some(bad));

// Keys must be integer, strictly increasing frames with no empty values. Used for templates and custom track keys.
function checkKeys(name, out, hint = '') {
  for (const keys of Object.values(out)) {
    const frames = keys.map(([t]) => t);
    if (frames.some((t) => !Number.isInteger(t))) throw new Error(`${name}: key frames must be integers (${frames.join(', ')})`);
    if (frames.some((t, i) => i && t <= frames[i - 1])) {
      throw new Error(`${name}: key frames must be strictly increasing (${frames.join(', ')})${hint}`);
    }
    if (keys.some(([, v]) => bad(v))) throw new Error(`${name}: keys contain an empty or non-numeric value — check the parameters`);
  }
  return out;
}

// Every template validates its own output.
function guard(name, fn) {
  return (at, params) => {
    const prm = params || {};
    for (const key of REQUIRED[name] || []) if (prm[key] === undefined) throw new Error(`${name}: ${key} is not set`);
    if (prm.zeta !== undefined && !(prm.zeta > 0 && prm.zeta < 1)) throw new Error(`${name}: zeta must be between 0 and 1 (usually 0.28–0.36)`);
    if (prm.half !== undefined && !(prm.half >= 1)) throw new Error(`${name}: half is the half-period in frames, 1 or more (usually 4–8)`);
    return checkKeys(name, fn(at, prm), ' — increase dur');
  };
}

// Parameter names of every template (compile rejects anything else as a typo).
const PARAMS = {
  move: ['from', 'to', 'dur', 'ease', 'arc'],
  click: ['depth', 'down', 'up'],
  pop: ['peak', 'under', 'dur', 'half', 'zeta'],
  slide: ['from', 'to', 'dur', 'overshoot', 'arc', 'half', 'zeta'],
  bounce: ['height', 'dur', 'half', 'zeta'],
  swing: ['angle', 'dur', 'zeta'],
  spring: ['prop', 'from', 'to', 'v0', 'half', 'zeta', 'dur'],
  turn: ['from', 'to', 'dur', 'ease'],
  spin: ['dur', 'turns', 'from', 'ease'],
  disappear: ['dur'],
  appear: ['dur'],
  bend: ['from', 'to', 'dur', 'ease', 'lag'],
  float: ['dur', 'period', 'amp'],
  sway: ['dur', 'period', 'angle'],
};

const TEMPLATES = Object.fromEntries(Object.entries(RAW).map(([name, fn]) => [name, guard(name, fn)]));

module.exports = { TEMPLATES, PARAMS, checkKeys, hermite, spring, reach };
