// Hidden edge revealed (a seam coming apart between parts that are not cut from one element).
// At rest a part's edge may lie under a thin cover of another part drawn above it: a stroke over its fill, a cuff over a
// sleeve, a waistband over trousers, a wrist over a hand. When the two parts move differently (scale about another pivot,
// a swing around a far pivot) that edge comes out from under the cover and the drawing shows a gap or a break.
// Every outline point of an element is a probe. It counts when at rest it is under a THIN cover (a stroke over its fill:
// free on two opposite sides within 10 px) drawn above it by a part that is not its ancestor or descendant, and nothing of
// its own part covers it too. It is exposed at frame t when no element drawn above comes within 1.5 px. Wide occlusion
// (an object behind a big shape), skeleton joints (parent and child) and short bits (under 60 px of edge) are skipped.
const { valueAt } = require('../lottie/keys');
const { worldMatrix, apply } = require('../lottie/evaluate');
const { outline, inside } = require('../bones/skin');

const GAP = 1.5; // px an edge must be from any cover to count as exposed
const WIDE = 10; // px: a cover that reaches this far around the probe is occlusion, not a seam
const MIN_LEN = 60; // px of edge exposed at one frame for an issue (shorter is a corner, not a seam)
const MIN_POINTS = 4;
const STEP = 3; // frames
const ring = (r) => [0, 1, 2, 3, 4, 5, 6, 7].map((k) => [r * Math.cos((k * Math.PI) / 4), r * Math.sin((k * Math.PI) / 4)]);
const RING_WIDE = ring(WIDE);
const DEPTHS = [3, 5, 8, 12, 20];

function checkExposed(lottie, model) {
  const parts = model.parts;
  const owner = new Map();
  for (const p of Object.values(parts)) for (const i of p.els) owner.set(i, p.name);
  const layerOf = new Map(lottie.layers.map((l) => [l.nm, l]));
  const matrices = new Map();
  const matrix = (name, t) => { const k = `${name}@${t}`; if (!matrices.has(k)) matrices.set(k, worldMatrix(lottie, name, t)); return matrices.get(k); };
  const visible = (name, t) => {
    const L = layerOf.get(name);
    if (!L || !L.ks || !L.ks.o) return true;
    const o = valueAt(L.ks.o, t)[0], s = valueAt(L.ks.s, t);
    return o >= 50 && Math.min(Math.abs(s[0]), Math.abs(s[1])) >= 30;
  };
  const localCache = new WeakMap();
  const localOf = (paths) => { if (!localCache.has(paths)) localCache.set(paths, paths.map((sp) => outline(sp, 3))); return localCache.get(paths); };
  const polyCache = new Map();
  // an element's outline polygons in canvas space at frame t, with their boxes
  const polys = (i, t) => {
    const k = `${i}@${t}`;
    if (polyCache.has(k)) return polyCache.get(k);
    const name = owner.get(i);
    let paths = model.els[i].paths;
    const keys = name && parts[name].shapeKeys && parts[name].shapeKeys[i];
    if (keys) for (const kf of keys) { if (kf.t > t) break; paths = kf.paths; }
    const m = name ? matrix(name, t) : null;
    const out = localOf(paths).map((poly) => {
      const w = m ? poly.map((q) => apply(m, q)) : poly;
      const b = [Infinity, Infinity, -Infinity, -Infinity];
      for (const [x, y] of w) { if (x < b[0]) b[0] = x; if (y < b[1]) b[1] = y; if (x > b[2]) b[2] = x; if (y > b[3]) b[3] = y; }
      return { w, box: b };
    });
    polyCache.set(k, out);
    return out;
  };
  const filledBy = (i, t, q) => polys(i, t).reduce((c, poly) => (q[0] < poly.box[0] || q[0] > poly.box[2] || q[1] < poly.box[1] || q[1] > poly.box[3] ? c : c !== inside(q, poly.w)), false);
  const live = (i, t) => { const n = owner.get(i); return !n || visible(n, t); };
  // a parent and its descendants are a skeleton joint (a limb under a sleeve): their overlap is drawn on purpose and
  // checked by joints / pin; the seams of one drawn object split between siblings or unrelated parts are what is left
  const up = (name) => { const q = parts[name]; return q && (q.parent || (q.attach && q.attach.part)); };
  const ancestors = (name) => { const s = new Set(); for (let q = up(name); q && !s.has(q); q = up(q)) s.add(q); return s; };
  const related = (a, b) => ancestors(a).has(b) || ancestors(b).has(a);
  const n = model.els.length;
  const covers = (above, t, q) => above.some((j) => live(j, t) && filledBy(j, t, q));
  const aboveOf = (i) => { const a = []; for (let j = i + 1; j < n; j++) a.push(j); return a; };

  // probes at rest: element, polygon, vertex
  const probes = [];
  for (let i = 0; i < n; i++) {
    const name = owner.get(i);
    if (!name || !live(i, 0)) continue;
    if (parts[name].maskBy || parts[name].clipBy) continue;
    const above = aboveOf(i);
    const rest = polys(i, 0);
    rest.forEach((poly, pj) => {
      const step = Math.max(1, Math.floor(poly.w.length / 80));
      for (let v = 0; v < poly.w.length; v += step) {
        const q = poly.w[v];
        const nx = poly.w[(v + step) % poly.w.length], len = Math.hypot(nx[0] - q[0], nx[1] - q[1]);
        const cover = above.find((j) => owner.get(j) !== name && !(owner.get(j) && related(name, owner.get(j))) && live(j, 0) && filledBy(j, 0, q));
        if (cover === undefined) continue;
        if (above.some((j) => owner.get(j) === name && filledBy(j, 0, q))) continue; // the part covers its own edge
        // a thin cover (a stroke over its fill): free on both opposite sides within WIDE px; a wide cover is occlusion
        const free = RING_WIDE.map(([dx, dy]) => !covers(above, 0, [q[0] + dx, q[1] + dy]));
        if (!free.some((f, k) => f && free[(k + 4) % 8])) continue;
        probes.push({ i, pj, v, len, above, by: owner.get(cover) || 'static', name });
      }
    });
  }
  const worst = new Map();
  for (let t = STEP; t <= model.op; t += STEP) {
    const hits = new Map();
    for (const pr of probes) {
      if (!visible(pr.name, t)) continue;
      const poly = polys(pr.i, t)[pr.pj];
      const q = poly && poly.w[pr.v];
      if (!q) continue;
      if (covers(pr.above, t, q)) continue;
      // depth: the smallest radius at which a cover is found (the gap between the edge and what hides it)
      let depth = Infinity;
      for (const r of DEPTHS) if (ring(r).some(([dx, dy]) => covers(pr.above, t, [q[0] + dx, q[1] + dy]))) { depth = r; break; }
      if (depth <= GAP) continue;
      const pair = `${pr.name}/${pr.by}`;
      const h = hits.get(pair) || { c: 0, len: 0, depth: 0 };
      h.c++; h.len += pr.len; h.depth = Math.max(h.depth, depth);
      hits.set(pair, h);
    }
    for (const [pair, h] of hits) if (h.c >= MIN_POINTS && h.len >= MIN_LEN && (!worst.has(pair) || h.len > worst.get(pair).len)) worst.set(pair, { ...h, t });
  }
  return [...worst].map(([pair, w]) => ({
    check: 'exposed', part: pair, frame: w.t,
    detail: `the edge of ${pair.split('/')[0]} that is hidden under ${pair.split('/')[1]} at rest comes out from under it (${w.c} points, gap up to ${w.depth} px): the seam shows — pin the two parts together, share a pivot, or overlap them deeper`,
  }));
}

module.exports = { checkExposed };
