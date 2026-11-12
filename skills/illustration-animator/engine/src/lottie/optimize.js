// Weight of a Lottie file: a bone- or blend-driven part is baked into its path frame by frame (one key per frame, every vertex
// and tangent), so a scene can reach tens of MB. The pass works on the finished JSON, so it serves the engine
// and an external (After Effects) Lottie alike:
//  1. numbers shortened: path points and tangents to 1 decimal (px of the 1200 canvas), transforms, colours and easing to 3;
//  2. runs of linear keys (the per-frame bake) thinned: a key stays only when dropping it moves the interpolated value
//     by more than the property's tolerance (greedy, linear between the kept keys);
//  3. a property whose keys all hold one value becomes static.
// Keys with their own easing, hold keys and spatial tangents are never touched — those are the animator's choices.
const VALUE_DEC = 3;
// px on the 1200 canvas for paths and positions; degrees, percent and opacity for the rest. Unknown properties are not thinned.
const DEFAULTS = { shape: 0.6, p: 0.3, a: 0.3, r: 0.02, s: 0.03, o: 0.5, vertex: 0.25, dec: 1 };
let TOL = DEFAULTS;
const MIN_VERTS = 24; // smaller paths weigh nothing

const rnd = (n, d) => { const m = 10 ** d; const v = Math.round(n * m) / m; return v === 0 ? 0 : v; };
const isNum = (x) => typeof x === 'number';
const isShape = (v) => v && typeof v === 'object' && !Array.isArray(v) && Array.isArray(v.v);
const isLin = (kf) => {
  const o = kf.o, i = kf.i;
  if (!o || !i || kf.h === 1 || kf.to || kf.ti) return false;
  const f = (e, x, y) => [].concat(e.x).every((v) => v === x) && [].concat(e.y).every((v) => v === y);
  return f(o, 0, 0) && f(i, 1, 1);
};

function roundShape(p) {
  const r = (q) => q.map((c) => rnd(c, TOL.dec));
  return { ...p, v: p.v.map(r), i: p.i.map(r), o: p.o.map(r) };
}
const flat = (p) => [].concat(...p.v, ...p.i, ...p.o);
const same = (a, b) => a.length === b.length && a.every((x, n) => x === b[n]);

// the values of every key as flat number vectors; null when the keys cannot be compared (the path changes its point count or closure)
function vectors(keys, shape) {
  const out = keys.map((k) => {
    const s = k.s || [];
    if (shape) return isShape(s[0]) ? flat(s[0]) : null;
    return s.every(isNum) ? s : null;
  });
  if (out.some((v) => !v || v.length !== out[0].length)) return null;
  if (shape && keys.some((k) => k.s[0].c !== keys[0].s[0].c)) return null;
  return out;
}

// Greedy thinning of one run (indices a..b of linear keys): the farthest end the in-between keys still sit within `tol` of.
function thin(keys, vec, tol) {
  const keep = [0];
  let s = 0;
  const last = keys.length - 1;
  while (s < last) {
    let e = s + 1;
    for (let c = s + 2; c <= last; c++) {
      let ok = true;
      for (let m = s + 1; m < c && ok; m++) {
        const u = (keys[m].t - keys[s].t) / (keys[c].t - keys[s].t);
        const A = vec[s], B = vec[c], V = vec[m];
        for (let n = 0; n < A.length; n++) {
          if (Math.abs(A[n] + (B[n] - A[n]) * u - V[n]) > tol) { ok = false; break; }
        }
      }
      if (!ok) break;
      e = c;
    }
    keep.push(e);
    s = e;
  }
  return keep;
}

// ---- vertices: dense outlines (stroke caps, hand-drawn texture) carry runs of segments shorter than a pixel ----
// A run of segments s..e is replaced by one cubic from vertex s to vertex e (their own tangents) when every point of the run —
// the vertices and the middle of each segment — stays within `tol` of it in every key. The same vertices go in all keys.
const SAMPLES = 12;
function cubic(a, b, c, d, t) {
  const u = 1 - t, w0 = u * u * u, w1 = 3 * u * u * t, w2 = 3 * u * t * t, w3 = t * t * t;
  return [w0 * a[0] + w1 * b[0] + w2 * c[0] + w3 * d[0], w0 * a[1] + w1 * b[1] + w2 * c[1] + w3 * d[1]];
}
const segPts = (sh, j, n) => {
  const k = (j + 1) % n, a = sh.v[j], d = sh.v[k];
  const b = [a[0] + sh.o[j][0], a[1] + sh.o[j][1]], c = [d[0] + sh.i[k][0], d[1] + sh.i[k][1]];
  return [a, b, c, d];
};
function distToPoly(p, poly) {
  let best = Infinity;
  for (let q = 1; q < poly.length; q++) {
    const [x1, y1] = poly[q - 1], [x2, y2] = poly[q];
    const dx = x2 - x1, dy = y2 - y1, l2 = dx * dx + dy * dy;
    const u = l2 ? Math.max(0, Math.min(1, ((p[0] - x1) * dx + (p[1] - y1) * dy) / l2)) : 0;
    const d = Math.hypot(p[0] - x1 - u * dx, p[1] - y1 - u * dy);
    if (d < best) best = d;
  }
  return best;
}
// does the run s..e (e may wrap past the end of a closed path) fit one cubic in this shape
function runFits(sh, s, e, n, tol) {
  const a = sh.v[s % n], d = sh.v[e % n];
  const b = [a[0] + sh.o[s % n][0], a[1] + sh.o[s % n][1]], c = [d[0] + sh.i[e % n][0], d[1] + sh.i[e % n][1]];
  const poly = [];
  for (let q = 0; q <= SAMPLES; q++) poly.push(cubic(a, b, c, d, q / SAMPLES));
  for (let j = s; j < e; j++) {
    if (j > s && distToPoly(sh.v[j % n], poly) > tol) return false;
    const [p0, p1, p2, p3] = segPts(sh, j % n, n);
    if (distToPoly(cubic(p0, p1, p2, p3, 0.5), poly) > tol) return false;
  }
  return true;
}
// indices of the vertices to keep, the same for every shape of the property
function keepVertices(shapes, tol) {
  const n = shapes[0].v.length, closed = shapes[0].c;
  const last = closed ? n : n - 1; // the end of the last run: vertex 0 again when closed
  const keep = [0];
  let s = 0;
  while (s < last) {
    let e = s + 1;
    while (e < last && shapes.every((sh) => runFits(sh, s, e + 1, n, tol))) e++;
    if (e < n) keep.push(e);
    s = e;
  }
  return keep;
}
function simplifyShapes(shapes, tol) {
  const n = shapes[0].v.length;
  if (n < MIN_VERTS || shapes.some((sh) => sh.v.length !== n || sh.c !== shapes[0].c)) return shapes;
  const keep = keepVertices(shapes, tol);
  if (keep.length > n * 0.97) return shapes;
  const pick = (q) => keep.map((j) => q[j]);
  return shapes.map((sh) => ({ ...sh, v: pick(sh.v), i: pick(sh.i), o: pick(sh.o) }));
}

// keys of one animated property → thinned keys. A run is a stretch whose segments are all linear (the key before each segment
// carries no own easing, hold or spatial tangent); only the keys inside a run can go.
function optimizeKeys(keys, name, shape) {
  const tol = shape ? TOL.shape : TOL[name];
  const vec = tol === undefined ? null : vectors(keys, shape);
  if (!vec) return keys;
  const keep = new Set([keys.length - 1]);
  let i = 0;
  while (i < keys.length - 1) {
    keep.add(i);
    if (!isLin(keys[i])) { i++; continue; }
    let b = i + 1;
    while (b < keys.length - 1 && isLin(keys[b])) b++;
    thin(keys.slice(i, b + 1), vec.slice(i, b + 1), tol).forEach((n) => keep.add(i + n));
    i = b;
  }
  return [...keep].sort((x, y) => x - y).map((n) => keys[n]);
}

const r3 = (v) => (Array.isArray(v) ? v.map((c) => rnd(c, VALUE_DEC)) : rnd(v, VALUE_DEC));
const ease = (e) => ({ x: r3(e.x), y: r3(e.y) });

function optimizeProp(P, name) {
  if (P.a !== 1 || !Array.isArray(P.k)) {
    if (isShape(P.k)) return { ...P, k: simplifyShapes([roundShape(P.k)], TOL.vertex)[0] };
    if (isNum(P.k) || (Array.isArray(P.k) && P.k.every(isNum))) return { ...P, k: r3(P.k) };
    return P;
  }
  const shape = isShape(P.k[0] && P.k[0].s && P.k[0].s[0]);
  const rv = (v) => (shape ? roundShape(v) : isNum(v) ? rnd(v, VALUE_DEC) : v);
  const rounded = P.k.map((k) => {
    const o = { ...k };
    if (k.s) o.s = k.s.map(rv);
    if (k.e) o.e = k.e.map(rv);
    if (isNum(k.t)) o.t = rnd(k.t, 6);
    if (k.o) o.o = ease(k.o);
    if (k.i) o.i = ease(k.i);
    if (k.to) o.to = r3(k.to);
    if (k.ti) o.ti = r3(k.ti);
    return o;
  });
  let keys = optimizeKeys(rounded, name, shape);
  if (shape && vectors(keys, true)) {
    const sh = simplifyShapes(keys.map((k) => k.s[0]), TOL.vertex);
    keys = keys.map((k, n) => ({ ...k, s: [sh[n]] }));
  }
  // standing still: every key holds one value, nothing moves along a spatial tangent
  const vec = vectors(keys, shape);
  if (vec && vec.every((v) => same(v, vec[0])) && !keys.some((k) => k.to && k.to.some(Boolean))) {
    const s0 = keys[0].s;
    return { ...P, a: 0, k: shape ? s0[0] : s0.length === 1 ? s0[0] : s0 };
  }
  return { ...P, k: keys };
}

// ---- a baked part that only moves as a whole ----
// Bones and pins bake a part into its path frame by frame even when the part is carried rigidly (a limb turning at its joint, a prop
// sliding). When every key of every path of a group is the first key turned, scaled evenly and shifted, the paths become static and the
// group's own transform carries the motion: a few transform keys instead of every vertex of every frame.
const FIT = 0.35; // px: how far a key may sit from the similarity transform of the first key and still count as the same shape
const pointsOf = (sh) => {
  const pts = [];
  for (let j = 0; j < sh.v.length; j++) {
    const v = sh.v[j];
    pts.push(v, [v[0] + sh.o[j][0], v[1] + sh.o[j][1]], [v[0] + sh.i[j][0], v[1] + sh.i[j][1]]);
  }
  return pts;
};
// the similarity (turn, even scale, shift) that takes points A about their centroid onto B: B ≈ (c + id)(A - a) + b
function similarity(A, B, a) {
  let bx = 0, by = 0, sxx = 0, sxy = 0, sa = 0;
  for (const q of B) { bx += q[0]; by += q[1]; }
  bx /= B.length; by /= B.length;
  for (let n = 0; n < A.length; n++) {
    const x = A[n][0] - a[0], y = A[n][1] - a[1], u = B[n][0] - bx, v = B[n][1] - by;
    sxx += x * u + y * v; sxy += x * v - y * u; sa += x * x + y * y;
  }
  const c = sa ? sxx / sa : 1, d = sa ? sxy / sa : 0;
  return { c, d, bx, by, rot: Math.atan2(d, c), scale: Math.hypot(c, d) };
}
const place = (A, a, T) => A.map((q) => {
  const x = q[0] - a[0], y = q[1] - a[1];
  return [T.scale * (Math.cos(T.rot) * x - Math.sin(T.rot) * y) + T.bx, T.scale * (Math.sin(T.rot) * x + Math.cos(T.rot) * y) + T.by];
});
const IDENT = (tr) => tr && tr.p && tr.p.a === 0 && tr.p.k[0] === 0 && tr.p.k[1] === 0 && tr.a.a === 0 && tr.a.k[0] === 0 && tr.a.k[1] === 0
  && tr.s.a === 0 && tr.s.k[0] === 100 && tr.s.k[1] === 100 && tr.r.a === 0 && tr.r.k === 0;
const LINEAR = { o: { x: [0], y: [0] }, i: { x: [1], y: [1] } };
const prop = (times, vals, scalar) => {
  if (vals.every((v) => same(v, vals[0]))) return { a: 0, k: scalar ? rnd(vals[0][0], VALUE_DEC) : vals[0].map((c) => rnd(c, VALUE_DEC)) };
  return { a: 1, k: times.map((t, n) => ({ t, s: vals[n].map((c) => rnd(c, VALUE_DEC)), ...(n < times.length - 1 ? LINEAR : {}) })) };
};

// how a path of a group moves: its points per frame, or null when it is not a linear bake of one topology
function bakeOf(x) {
  const k = x.ks && x.ks.a === 1 && Array.isArray(x.ks.k) ? x.ks.k : null;
  if (!k || k.length < 3) return null;
  if (k.some((q, n) => !isShape(q.s && q.s[0]) || (n < k.length - 1 && !isLin(q))) || !vectors(k, true)) return null;
  return { times: k.map((q) => q.t), pts: k.map((q) => pointsOf(q.s[0])) };
}
// the transform of one frame as a function of the first frame: similarity of the points of key 0 about their centroid
function motion(P0, Pm, a, prev) {
  const t = similarity(P0, Pm, a);
  while (t.rot - prev > Math.PI) t.rot -= 2 * Math.PI;
  while (t.rot - prev < -Math.PI) t.rot += 2 * Math.PI;
  return t;
}
const gap = (A, B) => A.reduce((w, q, n) => Math.max(w, Math.hypot(q[0] - B[n][0], q[1] - B[n][1])), 0);

// the transform keys of one cluster, thinned: the sample points of the first key, carried by the interpolated transform, stay within tol of the baked ones
function clusterKeys(times, P, a, T) {
  const stride = Math.max(1, Math.ceil(P[0].length / 96));
  const S0 = P[0].filter((_, n) => n % stride === 0);
  const lerpT = (A, B, u) => ({ rot: A.rot + (B.rot - A.rot) * u, scale: A.scale + (B.scale - A.scale) * u, bx: A.bx + (B.bx - A.bx) * u, by: A.by + (B.by - A.by) * u });
  const fits = (s0, c) => {
    for (let m = s0 + 1; m < c; m++) {
      const q = place(S0, a, lerpT(T[s0], T[c], (times[m] - times[s0]) / (times[c] - times[s0])));
      for (let n = 0; n < q.length; n++) {
        const o = P[m][n * stride];
        if (Math.hypot(q[n][0] - o[0], q[n][1] - o[1]) > TOL.shape) return false;
      }
    }
    return true;
  };
  const keep = [0];
  for (let s0 = 0; s0 < T.length - 1;) {
    let e = s0 + 1;
    while (e + 1 < T.length && fits(s0, e + 1)) e++;
    keep.push(e);
    s0 = e;
  }
  const kt = keep.map((n) => times[n]);
  return {
    p: prop(kt, keep.map((n) => [T[n].bx, T[n].by])),
    a: { a: 0, k: a.map((c) => rnd(c, VALUE_DEC)) },
    s: prop(kt, keep.map((n) => [T[n].scale * 100, T[n].scale * 100])),
    r: prop(kt, keep.map((n) => [(T[n].rot * 180) / Math.PI]), true),
  };
}

const area = (sh) => sh.v.reduce((t, q, n) => { const r = sh.v[(n + 1) % sh.v.length]; return t + q[0] * r[1] - r[0] * q[1]; }, 0);
const box = (sh) => [0, 1].map((n) => [Math.min(...sh.v.map((q) => q[n])), Math.max(...sh.v.map((q) => q[n]))]);

// A group of baked paths → groups, one per set of paths that move together; each set's paths are static and its group transform moves
// them. Null when nothing is gained or the split could change the picture (see the guards below).
function splitRigid(gr) {
  const shs = gr.it.filter((x) => x.ty === 'sh');
  const fl = gr.it.filter((x) => x.ty === 'fl'), tr = gr.it.find((x) => x.ty === 'tr');
  // a transform of the group also moves its fill's gradient and scales a stroke: only a solid fill is carried that way
  if (!shs.length || fl.length !== 1 || gr.it.length !== shs.length + 2 || !IDENT(tr) || !(fl[0].c && fl[0].c.a === 0)) return null;
  const bakes = shs.map(bakeOf);
  const times = (bakes.find(Boolean) || {}).times;
  if (!times || bakes.some((b, n) => (b ? b.times.length !== times.length || b.times.some((t, m) => t !== times[m]) : shs[n].ks.a !== 0))) return null;
  const clusters = []; // { a, T, members: [index], baked: bool }
  const loose = []; // paths that stay baked (not rigid) or are static: static ones are a cluster of their own
  shs.forEach((x, n) => {
    const B = bakes[n];
    if (!B) { clusters.push({ still: true, members: [n] }); return; }
    const P0 = B.pts[0];
    const a = [0, 1].map((c) => P0.reduce((t, q) => t + q[c], 0) / P0.length);
    const T = [];
    let prev = 0, ok = true;
    for (let m = 0; m < B.pts.length && ok; m++) {
      const t = motion(P0, B.pts[m], a, prev);
      prev = t.rot;
      if (t.scale < 0.2 || gap(place(P0, a, t), B.pts[m]) > FIT) ok = false;
      T.push(t);
    }
    if (!ok) { loose.push(n); return; }
    // joins a cluster when that cluster's transform carries this path too
    const host = clusters.find((c) => !c.still && B.pts.every((Pm, m) => gap(place(P0, c.a, c.T[m]), Pm) <= FIT));
    if (host) host.members.push(n);
    else clusters.push({ a, T, members: [n] });
  });
  const parts = clusters.length + (loose.length ? 1 : 0);
  if (parts < 1 || (clusters.length === 1 && !loose.length && clusters[0].still)) return null;
  const moving = clusters.filter((c) => !c.still);
  if (!moving.length) return null;
  if (parts > 1) {
    // pieces drawn apart are filled apart: the picture is the same only where nothing overlaps with a hole or an even-odd rule
    if (fl[0].r === 2 || !(fl[0].o && fl[0].o.a === 0 && fl[0].o.k === 100)) return null;
    const first = (n) => (bakes[n] ? shs[n].ks.k[0].s[0] : shs[n].ks.k);
    const set = [...clusters.map((c) => c.members), ...(loose.length ? [loose] : [])];
    for (let i = 0; i < set.length; i++) for (let j = i + 1; j < set.length; j++) {
      for (const p of set[i]) for (const q of set[j]) {
        const A = first(p), B = first(q);
        if (Math.sign(area(A)) === Math.sign(area(B))) continue;
        const [bp, bq] = [box(A), box(B)];
        if (bp[0][0] <= bq[0][1] && bq[0][0] <= bp[0][1] && bp[1][0] <= bq[1][1] && bq[1][0] <= bp[1][1]) return null;
      }
    }
  }
  const wrap = (members, kind, tr2) => ({
    ...gr,
    it: [...members.map((n) => (kind === 'baked' ? shs[n] : { ...shs[n], ks: { ...shs[n].ks, a: 0, k: bakes[n] ? shs[n].ks.k[0].s[0] : shs[n].ks.k } })), fl[0], tr2],
  });
  const out = [];
  for (const c of clusters) {
    if (c.still) { out.push(wrap(c.members, 'static', tr)); continue; }
    // the motion once more over every point of the cluster, so that the transform is the best for the whole set
    const P = times.map((_, m) => [].concat(...c.members.map((n) => bakes[n].pts[m])));
    const a = [0, 1].map((n) => P[0].reduce((t, q) => t + q[n], 0) / P[0].length);
    const T = [];
    let prev = 0;
    for (let m = 0; m < P.length; m++) {
      const t = motion(P[0], P[m], a, prev);
      prev = t.rot;
      if (gap(place(P[0], a, t), P[m]) > FIT) return null;
      T.push(t);
    }
    const still = T.every((t) => Math.abs(t.rot) < 1e-6 && Math.abs(t.scale - 1) < 1e-6 && Math.hypot(t.bx - a[0], t.by - a[1]) < 0.01);
    out.push(wrap(c.members, 'static', still ? tr : { ...tr, ...clusterKeys(times, P, a, T) }));
  }
  if (loose.length) out.push(wrap(loose, 'baked', tr));
  return out;
}

// a property is an object { a: 0|1, k }; its name is the key it sits under (p, r, s, o, ks of a path, ...)
const isProp = (v) => v && typeof v === 'object' && !Array.isArray(v) && (v.a === 0 || v.a === 1) && 'k' in v;

function walk(node, name) {
  if (Array.isArray(node)) {
    // a baked group may turn into several: one per set of paths that move together
    return node.flatMap((x) => (x && x.ty === 'gr' && Array.isArray(x.it) && TOL.rigid !== false ? splitRigid(x) : null) || [x]).map((x) => walk(x, name));
  }
  if (!node || typeof node !== 'object') return node;
  if (isProp(node)) return optimizeProp(node, name);
  const out = {};
  for (const k of Object.keys(node)) out[k] = walk(node[k], k);
  return out;
}

// opts override the tolerances: { shape, vertex } px, { dec } decimals of path points (1), { p, a, r, s, o } transforms
function optimizeLottie(lottie, opts = {}) {
  TOL = { ...DEFAULTS, ...opts };
  try { return walk(lottie, ''); } finally { TOL = DEFAULTS; }
}

module.exports = { optimizeLottie, DEFAULTS };
