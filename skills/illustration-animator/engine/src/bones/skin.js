// Bone skinning for outlined parts: bend a part along a joint chain and bake it as animated paths.
const { valueAt } = require('../lottie/keys');

const rot = (deg, [x, y]) => {
  const r = (deg * Math.PI) / 180, c = Math.cos(r), s = Math.sin(r);
  return [c * x - s * y, s * x + c * y];
};

function segDist(p, a, b) {
  const dx = b[0] - a[0], dy = b[1] - a[1];
  const L = dx * dx + dy * dy;
  const t = L ? Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / L)) : 0;
  return Math.hypot(p[0] - a[0] - t * dx, p[1] - a[1] - t * dy);
}

function weights(p, joints, power = 4) {
  const d = [];
  for (let b = 0; b < joints.length - 1; b++) d.push(segDist(p, joints[b], joints[b + 1]));
  const hit = d.findIndex((x) => x < 1e-6);
  if (hit >= 0) return d.map((_, b) => (b === hit ? 1 : 0));
  const w = d.map((x) => 1 / Math.pow(x, power));
  const sum = w.reduce((a, b) => a + b, 0);
  return w.map((x) => x / sum);
}

function pose(joints, angles) {
  const starts = [joints[0]], phi = [];
  let acc = 0;
  for (let b = 0; b < joints.length - 1; b++) {
    acc += angles[b] || 0;
    phi.push(acc);
    const d = rot(acc, [joints[b + 1][0] - joints[b][0], joints[b + 1][1] - joints[b][1]]);
    starts.push([starts[b][0] + d[0], starts[b][1] + d[1]]);
  }
  return { starts, phi };
}

function deformPoint(p, w, joints, posed) {
  let x = 0, y = 0;
  for (let b = 0; b < w.length; b++) {
    if (!w[b]) continue;
    const q = rot(posed.phi[b], [p[0] - joints[b][0], p[1] - joints[b][1]]);
    x += w[b] * (posed.starts[b][0] + q[0]);
    y += w[b] * (posed.starts[b][1] + q[1]);
  }
  return [x, y];
}

function deformPaths(paths, joints, angles, power = 4) {
  const posed = pose(joints, angles);
  return paths.map((sp) => {
    const v = [], i = [], o = [];
    sp.v.forEach((pt, k) => {
      const w = weights(pt, joints, power);
      const nv = deformPoint(pt, w, joints, posed);
      const ni = deformPoint([pt[0] + sp.i[k][0], pt[1] + sp.i[k][1]], w, joints, posed);
      const no = deformPoint([pt[0] + sp.o[k][0], pt[1] + sp.o[k][1]], w, joints, posed);
      v.push(nv);
      i.push([ni[0] - nv[0], ni[1] - nv[1]]);
      o.push([no[0] - nv[0], no[1] - nv[1]]);
    });
    return { c: sp.c, v, i, o };
  });
}

const pointOnBone = (joints, angles, b, p) =>
  deformPoint(p, joints.slice(1).map((_, k) => (k === b ? 1 : 0)), joints, pose(joints, angles));

const boneAngle = (angles, b) => angles.slice(0, b + 1).reduce((a, x) => a + x, 0);

// Exact signed area (Green's theorem) of cubic segments, handles included. The integrand x*y' - y*x'
// is a degree-5 polynomial, so 3-point Gauss-Legendre is exact.
const GL = [[0.5 - Math.sqrt(0.6) / 2, 5 / 18], [0.5, 8 / 18], [0.5 + Math.sqrt(0.6) / 2, 5 / 18]];

function cubicSignedArea(p0, p1, p2, p3) {
  let s = 0;
  for (const [t, w] of GL) {
    const u = 1 - t;
    const b0 = u * u * u, b1 = 3 * u * u * t, b2 = 3 * u * t * t, b3 = t * t * t;
    const d0 = -3 * u * u, d1 = 3 * u * u - 6 * u * t, d2 = 6 * u * t - 3 * t * t, d3 = 3 * t * t;
    const x = b0 * p0[0] + b1 * p1[0] + b2 * p2[0] + b3 * p3[0], y = b0 * p0[1] + b1 * p1[1] + b2 * p2[1] + b3 * p3[1];
    const dx = d0 * p0[0] + d1 * p1[0] + d2 * p2[0] + d3 * p3[0], dy = d0 * p0[1] + d1 * p1[1] + d2 * p2[1] + d3 * p3[1];
    s += w * (x * dy - y * dx);
  }
  return s / 2;
}

// Control points of every segment of a subpath; an open path is filled as if closed by a straight line.
function segments(sp) {
  const n = sp.v.length, out = [];
  for (let k = 0; k < n; k++) {
    if (k === n - 1 && !sp.c) { out.push([sp.v[k], sp.v[k], sp.v[0], sp.v[0]]); continue; }
    const m = (k + 1) % n, q = sp.v[m];
    out.push([sp.v[k], [sp.v[k][0] + sp.o[k][0], sp.v[k][1] + sp.o[k][1]], [q[0] + sp.i[m][0], q[1] + sp.i[m][1]], q]);
  }
  return out;
}

const outline = (sp, steps = 16) => segments(sp).flatMap(([p0, p1, p2, p3]) =>
  Array.from({ length: steps }, (_, j) => {
    const t = j / steps, u = 1 - t;
    return [0, 1].map((c) => u * u * u * p0[c] + 3 * u * u * t * p1[c] + 3 * u * t * t * p2[c] + t * t * t * p3[c]);
  }));

function inside(pt, poly) {
  let c = false;
  for (let a = 0, b = poly.length - 1; a < poly.length; b = a++) {
    const [xa, ya] = poly[a], [xb, yb] = poly[b];
    if ((ya > pt[1]) !== (yb > pt[1]) && pt[0] < ((xb - xa) * (pt[1] - ya)) / (yb - ya) + xa) c = !c;
  }
  return c;
}

// Holes are decided by nesting depth, not by winding: a subpath inside an odd number of other
// subpaths is a hole (subtracted), otherwise it adds. Disjoint islands add whatever their winding.
function area(paths) {
  const polys = paths.map((sp) => outline(sp));
  const total = paths.reduce((sum, sp, k) => {
    const a = Math.abs(segments(sp).reduce((s, c) => s + cubicSignedArea(...c), 0));
    const depth = polys.reduce((d, poly, j) => d + (j !== k && inside(sp.v[0], poly) ? 1 : 0), 0);
    return sum + (depth % 2 ? -a : a);
  }, 0);
  return Math.abs(total);
}

function bakeBend(paths, joints, bendProp, op, power = 4) {
  const frames = [];
  for (let t = 0; t <= op; t++) frames.push({ t, a: valueAt(bendProp, t) });
  const same = (x, y) => x.every((v, k) => Math.abs(v - y[k]) < 1e-3);
  return frames
    .filter((f, n) => n === 0 || n === frames.length - 1 || !same(f.a, frames[n - 1].a) || !same(f.a, frames[n + 1].a))
    .map((f) => ({ t: f.t, paths: deformPaths(paths, joints, f.a, power) }));
}

// --- Pinned seam: a cut part (an arm cut at the shoulder, a body cut from its counter) moves only away from the cut.
// pin: { line: [[x, y], …] (a polyline: the cut), zone: [[x, y], …] (a polygon that stands: feet on the ground),
// feather: px }. Weight 0 on the line and inside the zone, rising smoothly to 1 at `feather` px from them.
function polyDist(p, pts, closed) {
  let d = Infinity;
  const n = closed ? pts.length : pts.length - 1;
  for (let k = 0; k < n; k++) d = Math.min(d, segDist(p, pts[k], pts[(k + 1) % pts.length]));
  if (pts.length === 1) d = Math.hypot(p[0] - pts[0][0], p[1] - pts[0][1]);
  return d;
}

function pinWeight(pin) {
  const f = pin.feather;
  return (p) => {
    let d = Infinity;
    if (pin.line) d = Math.min(d, polyDist(p, pin.line, false));
    if (pin.zone) d = Math.min(d, inside(p, pin.zone) ? 0 : polyDist(p, pin.zone, true));
    const t = Math.min(1, d / f);
    return t * t * (3 - 2 * t);
  };
}

// Every anchor and handle end through a point map (handles follow their ends, as in deformPaths).
function mapPaths(paths, fn) {
  return paths.map((sp) => {
    const v = sp.v.map(fn);
    const end = (h, k) => { const a = fn([sp.v[k][0] + h[0], sp.v[k][1] + h[1]]); return [a[0] - v[k][0], a[1] - v[k][1]]; };
    return { c: sp.c, v, i: sp.i.map(end), o: sp.o.map(end) };
  });
}

// Blend a map with identity by a weight: p + w(p)·(fn(p) − p).
const pinned = (fn, w) => (p) => {
  const k = w(p);
  if (k <= 0) return p;
  const q = fn(p);
  return k >= 1 ? q : [p[0] + (q[0] - p[0]) * k, p[1] + (q[1] - p[1]) * k];
};

// Frames 0…op of paths under mapAt(t), keeping only frames where the shape changes (plus both ends).
function bakeMap(paths, mapAt, op) {
  const frames = [];
  for (let t = 0; t <= op; t++) frames.push({ t, paths: mapPaths(paths, mapAt(t)) });
  const flat = (f) => f.paths.flatMap((sp) => [...sp.v, ...sp.i, ...sp.o].flat());
  const xs = frames.map(flat);
  const same = (a, b) => a.every((v, k) => Math.abs(v - b[k]) < 1e-3);
  return frames.filter((f, n) => n === 0 || n === frames.length - 1 || !same(xs[n], xs[n - 1]) || !same(xs[n], xs[n + 1]));
}

module.exports = {
  weights, pose, deformPoint, deformPaths, pointOnBone, boneAngle, area, bakeBend, outline, inside,
  pinWeight, pinned, mapPaths, bakeMap,
};
