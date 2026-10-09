// From rest only curves with a flat start (y1 = 0): soft (Plain), inOut, sine. out/back start at 4.5× the mean
// speed, so they continue a motion that is already going. in arrives at 2× the mean speed (not 45× as with x2 = 1).
const EASE = {
  soft: [0.3, 0, 0.15, 1],
  inOut: [0.65, 0, 0.35, 1],
  out: [0.22, 1, 0.36, 1],
  in: [0.5, 0, 0.75, 0.5],
  back: [0.34, 1.5, 0.64, 1],
  sine: [0.37, 0, 0.63, 1],
  lin: [0, 0, 1, 1],
};

const ez = (e) => {
  const v = Array.isArray(e) ? e : EASE[e || 'inOut'];
  if (!v) throw new Error(`Unknown easing: ${e}`);
  if (Array.isArray(e)) {
    if (v.length !== 4 || !v.every(Number.isFinite)) throw new Error(`Easing curve [${v}]: need 4 numbers [x1, y1, x2, y2]`);
    if (v[0] < 0 || v[0] > 1 || v[2] < 0 || v[2] > 1) throw new Error(`Easing curve [${v}]: x1 and x2 must be between 0 and 1`);
  }
  return v;
};

// keys: [[frame, value, easeToNext?, arc?], ...]; scalarEase for spatial props (position).
// arc: { to, ti } — spatial tangents of the path to the next key (to from this value, ti from the next one).
function anim(keys, scalarEase = false) {
  keys = [...keys].sort((a, b) => a[0] - b[0]).filter((k, i, arr) => i === 0 || k[0] !== arr[i - 1][0]);
  const k = keys.map(([t, v, e, arc], idx) => {
    const s = Array.isArray(v) ? v : [v];
    const kf = { t, s };
    if (idx < keys.length - 1) {
      if (arc && scalarEase && e !== 'hold') {
        const pad = (q) => s.map((_, n) => q[n] || 0);
        kf.to = pad(arc.to);
        kf.ti = pad(arc.ti);
      }
      if (e === 'hold') kf.h = 1;
      else {
        const [x1, y1, x2, y2] = ez(e);
        const n = s.length;
        kf.o = scalarEase ? { x: x1, y: y1 } : { x: Array(n).fill(x1), y: Array(n).fill(y1) };
        kf.i = scalarEase ? { x: x2, y: y2 } : { x: Array(n).fill(x2), y: Array(n).fill(y2) };
      }
    }
    return kf;
  });
  return { a: 1, k };
}

function cubicBezier(x1, y1, x2, y2) {
  const cx = 3 * x1, bx = 3 * (x2 - x1) - cx, ax = 1 - cx - bx;
  const cy = 3 * y1, by = 3 * (y2 - y1) - cy, ay = 1 - cy - by;
  const X = (t) => ((ax * t + bx) * t + cx) * t;
  const Y = (t) => ((ay * t + by) * t + cy) * t;
  const dX = (t) => (3 * ax * t + 2 * bx) * t + cx;
  return (x) => {
    if (x <= 0) return 0;
    if (x >= 1) return 1;
    let t = x;
    for (let n = 0; n < 8; n++) {
      const e = X(t) - x, d = dX(t);
      if (Math.abs(e) < 1e-6 || Math.abs(d) < 1e-6) break;
      t -= e / d;
    }
    if (Math.abs(X(t) - x) > 1e-4) {
      let lo = 0, hi = 1;
      t = x;
      for (let n = 0; n < 40; n++) { if (X(t) < x) lo = t; else hi = t; t = (lo + hi) / 2; }
    }
    return Y(t);
  };
}

const first = (v) => (Array.isArray(v) ? v[0] : v);
const asArr = (v) => (Array.isArray(v) ? v : [v]);

// A position segment with spatial tangents runs along a cubic; the eased progress is a share of its length
// (as lottie-web and AE do it). The arc-length table is cached per keyframe.
const ARCS = new WeakMap();
function onArc(a, b, y) {
  let tab = ARCS.get(a);
  if (!tab) {
    const P0 = asArr(a.s), P3 = asArr(b.s);
    const P1 = P0.map((v, n) => v + a.to[n]), P2 = P3.map((v, n) => v + a.ti[n]);
    const at = (u) => P0.map((_, n) => {
      const w = 1 - u;
      return w * w * w * P0[n] + 3 * w * w * u * P1[n] + 3 * w * u * u * P2[n] + u * u * u * P3[n];
    });
    const pts = [], len = [0];
    for (let j = 0; j <= 64; j++) pts.push(at(j / 64));
    for (let j = 1; j <= 64; j++) len.push(len[j - 1] + Math.hypot(...pts[j].map((v, n) => v - pts[j - 1][n])));
    tab = { pts, len };
    ARCS.set(a, tab);
  }
  const { pts, len } = tab;
  const total = len[64];
  if (!(total > 0)) return pts[0];
  const want = y * total;
  // eased progress may leave 0..1 (back): continue along the end tangent
  if (want <= 0) return pts[0].map((v, n) => v + (pts[1][n] - v) * (want / (len[1] || 1)));
  if (want >= total) return pts[64].map((v, n) => v + (v - pts[63][n]) * ((want - total) / ((total - len[63]) || 1)));
  let j = 1;
  while (len[j] < want) j++;
  const f = (want - len[j - 1]) / (len[j] - len[j - 1]);
  return pts[j - 1].map((v, n) => v + (pts[j][n] - v) * f);
}
const curved = (a) => a.to && a.ti && (a.to.some((v) => v) || a.ti.some((v) => v));

function valueAt(prop, t) {
  if (!prop) return undefined;
  if (prop.a !== 1) return asArr(prop.k);
  const k = prop.k;
  if (t <= k[0].t) return asArr(k[0].s);
  for (let j = 0; j < k.length - 1; j++) {
    const a = k[j], b = k[j + 1];
    if (t < b.t) {
      if (a.h === 1) return asArr(a.s);
      const y = cubicBezier(first(a.o.x), first(a.o.y), first(a.i.x), first(a.i.y))((t - a.t) / (b.t - a.t));
      if (curved(a)) return onArc(a, b, y);
      return asArr(a.s).map((v, n) => v + (asArr(b.s)[n] - v) * y);
    }
  }
  return asArr(k[k.length - 1].s);
}

module.exports = { EASE, anim, cubicBezier, valueAt };
