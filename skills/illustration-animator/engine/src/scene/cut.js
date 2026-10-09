// Cut merged elements into pieces (a body from its counter, an arm from its torso) so each piece can move on its own.
// scene.cuts, bottom to top: each cut takes its piece out of what is left and is drawn above it.
//   { "name": "arm", "els": [3, 4, 5], "poly": [[x, y], …] }                 — boolean cut by a polygon (paper.js)
//   { "name": "arm", "el": 7, "contour": 0, "from": 42, "to": 65, "with": [6] } — split the outline at two of its own
//     vertices: from → to (forward) closes into the piece, its curves kept byte for byte; `with` (the fill under it)
//     is cut by the same region.
// Pieces are "N:name", what is left of N is "N:rest". The pieces of one cut form a stack drawn right after the cut's
// last element, so a cut arm passes over the torso instead of between its fill and outline.
// At rest the picture is the source: no two anti-aliased edges lie on one line (that shows a hairline through solid
// black). Every lower piece reaches OV px under the edge above it, and within a stack each lower element's edge sits
// D px deeper than the one above, so it is covered by it.
const { req } = require('../env/deps');
const { pathsBBox } = require('../svg/parse');
const { inside, outline } = require('../bones/skin');

const OV = 3;
const D = 1.5;
let paper = null;
function getPaper() {
  if (!paper) {
    paper = req('paper/dist/paper-core.js');
    paper.setup([1200, 1200]);
  }
  return paper;
}

const toPaper = (paths, rule = 1) => {
  const P = getPaper();
  const cp = new P.CompoundPath({
    children: paths.map((sp) => new P.Path({
      segments: sp.v.map((v, k) => new P.Segment(new P.Point(v), new P.Point(sp.i[k]), new P.Point(sp.o[k]))),
      closed: sp.c !== false,
      insert: false,
    })),
    insert: false,
  });
  cp.fillRule = rule === 2 ? 'evenodd' : 'nonzero';
  return cp;
};

const fromPaper = (item) => {
  const kids = item.children ? item.children : [item];
  return kids.filter((p) => p.segments && p.segments.length > 1).map((p) => ({
    c: p.closed,
    v: p.segments.map((s) => [s.point.x, s.point.y]),
    i: p.segments.map((s) => [s.handleIn.x, s.handleIn.y]),
    o: p.segments.map((s) => [s.handleOut.x, s.handleOut.y]),
  }));
};

const polyPath = (poly) => new (getPaper().Path)({ segments: poly, closed: true, insert: false });
const intersect = (a, b) => a.intersect(b, { insert: false });
const subtract = (a, b) => a.subtract(b, { insert: false });

// A band of half-width d along a polyline (rectangles on edges, discs on corners).
function band(pts, d, closed) {
  const P = getPaper();
  let out = null;
  const add = (item) => { out = out ? out.unite(item, { insert: false }) : item; };
  pts.forEach((a, k) => {
    if (closed || k < pts.length - 1) {
      const b = pts[(k + 1) % pts.length];
      const L = Math.hypot(b[0] - a[0], b[1] - a[1]);
      if (L > 1e-6) {
        const nx = (-(b[1] - a[1]) / L) * d, ny = ((b[0] - a[0]) / L) * d;
        add(new P.Path({ segments: [[a[0] + nx, a[1] + ny], [b[0] + nx, b[1] + ny], [b[0] - nx, b[1] - ny], [a[0] - nx, a[1] - ny]], closed: true, insert: false }));
      }
    }
    add(new P.Path.Circle({ center: a, radius: d, insert: false }));
  });
  return out;
}

// Vertices from → to of a contour (forward, wrapping), closed by straight points `bridge` back to the start.
function chain(sp, from, to, bridge = []) {
  const n = sp.v.length, idx = [];
  for (let k = from; ; k = (k + 1) % n) { idx.push(k); if (k === to) break; }
  const v = idx.map((k) => sp.v[k]), i = idx.map((k) => sp.i[k]), o = idx.map((k) => sp.o[k]);
  i[0] = [0, 0]; o[o.length - 1] = [0, 0];
  for (const p of bridge) { v.push(p); i.push([0, 0]); o.push([0, 0]); }
  return { c: true, v, i: i.map((q) => [...q]), o: o.map((q) => [...q]) };
}

// The rest's bridge A → B bows OV px into the piece (zero at both ends, steep ramps), so the two overlap along the seam.
function bowed(A, B, piecePoly) {
  const L = Math.hypot(B[0] - A[0], B[1] - A[1]);
  let nx = -(B[1] - A[1]) / L, ny = (B[0] - A[0]) / L;
  const mid = [(A[0] + B[0]) / 2 + nx * OV, (A[1] + B[1]) / 2 + ny * OV];
  if (!inside(mid, piecePoly)) { nx = -nx; ny = -ny; }
  return [[0.02, 0.5], [0.06, 1], [0.25, 1], [0.5, 1], [0.75, 1], [0.94, 1], [0.98, 0.5]]
    .map(([t, w]) => [A[0] + (B[0] - A[0]) * t + nx * OV * w, A[1] + (B[1] - A[1]) * t + ny * OV * w]);
}

// a contour goes with the piece when most of its vertices lie inside the piece (a hole in the hand, a button)
const within = (sp, poly) => sp.v.filter((p) => inside(p, poly)).length * 2 > sp.v.length;

function validateCuts(cuts, els) {
  const bad = (m) => { throw new Error(m); };
  if (!Array.isArray(cuts)) bad('cuts must be an array of cuts');
  const pt = (q) => Array.isArray(q) && q.length === 2 && q.every(Number.isFinite);
  const ints = (a) => Array.isArray(a) && a.length && a.every(Number.isInteger);
  const seen = new Set();
  for (const c of cuts) {
    if (!c || typeof c.name !== 'string' || !/^[A-Za-z][\w-]*$/.test(c.name) || c.name === 'rest') bad('cuts: a cut needs a name (Latin letters, not "rest")');
    if (seen.has(c.name)) bad(`cuts: two cuts named ${c.name} — one piece is cut by one cut (list the fill in the same cut)`);
    seen.add(c.name);
    const poly = c.poly !== undefined;
    const split = ['el', 'contour', 'from', 'to'].some((k) => c[k] !== undefined);
    if (poly === split) bad(`cuts ${c.name}: needs either poly + els (polygon) or el + contour + from + to (path split by its points)`);
    if (poly) {
      if (!ints(c.els)) bad(`cuts ${c.name}: els must be a non-empty array of element numbers`);
      if (!(Array.isArray(c.poly) && c.poly.length >= 3 && c.poly.every(pt))) bad(`cuts ${c.name}: poly needs at least 3 points [x, y]`);
      if (c.with !== undefined) bad(`cuts ${c.name}: with is only for a path split; for a polygon all elements go in els`);
    } else {
      if (!Number.isInteger(c.el)) bad(`cuts ${c.name}: el must be the number of the element whose path is split`);
      if (c.els !== undefined) bad(`cuts ${c.name}: a path split has no els — use el (the path) and with (the fill and anything under it)`);
      for (const k of ['contour', 'from', 'to']) if (!Number.isInteger(c[k])) bad(`cuts ${c.name}: ${k} must be an integer`);
      if (c.with !== undefined && !ints(c.with)) bad(`cuts ${c.name}: with must be an array of element numbers`);
      if ((c.with || []).some((n) => n >= c.el)) bad(`cuts ${c.name}: with must be elements under path ${c.el} (numbers below ${c.el}): the split path is drawn on top`);
      const e = els[c.el];
      if (!e) bad(`cuts ${c.name}: no element ${c.el}`);
      const sp = e.paths[c.contour];
      if (!sp) bad(`cuts ${c.name}: element ${c.el} has no path ${c.contour} (has 0–${e.paths.length - 1})`);
      if (c.from === c.to || [c.from, c.to].some((k) => k < 0 || k >= sp.v.length)) bad(`cuts ${c.name}: from and to must be different points of path ${c.el}.${c.contour} (0–${sp.v.length - 1})`);
    }
    for (const n of poly ? c.els : [...(c.with || []), c.el]) if (!els[n]) bad(`cuts ${c.name}: no element ${n}`);
  }
}

// A cut: its region (paper item), the line along which its pieces meet the rest, and its stack of elements.
function prepare(c, els) {
  if (c.poly) return { ...c, stack: [...new Set(c.els)].sort((a, b) => a - b), region: () => polyPath(c.poly), seam: c.poly, closed: true };
  const sp = els[c.el].paths[c.contour];
  const piece = chain(sp, c.from, c.to);
  return {
    ...c, stack: [...new Set([...(c.with || []), c.el])].sort((a, b) => a - b), piece,
    region: () => toPaper([piece]), seam: [sp.v[c.from], sp.v[c.to]], closed: false,
  };
}

// The region of a cut pulled d px back from its seam.
const inner = (c, d) => (d > 0 ? subtract(c.region(), band(c.seam, d, c.closed)) : c.region());

// One element through its cuts (bottom to top) → [{ name, paths }], "rest" first.
function cutElement(e, list) {
  const own = list.find((c) => c.el === e.i);
  if (own) {
    if (list.length > 1) throw new Error(`cuts: the path of element ${e.i} is split by cut ${own.name} — it cannot have other cuts`);
    const sp = e.paths[own.contour], A = sp.v[own.from], B = sp.v[own.to];
    const poly = outline(own.piece, 8);
    const rest = chain(sp, own.to, own.from, bowed(A, B, poly));
    const mine = [own.piece], left = [rest];
    e.paths.forEach((q, k) => { if (k !== own.contour) (within(q, poly) ? mine : left).push(q); });
    return [{ name: 'rest', paths: left }, { name: own.name, paths: mine }];
  }
  const sh = (c) => (c.stack.length - 1 - c.stack.indexOf(e.i)) * D;
  const src = toPaper(e.paths, e.rule);
  const out = [];
  let below = src;
  list.forEach((c, k) => {
    let mine = intersect(src, inner(c, sh(c)));
    for (const l of list.slice(k + 1)) mine = subtract(mine, inner(l, sh(l) + OV));
    out.push({ name: c.name, paths: fromPaper(mine) });
    below = subtract(below, inner(c, sh(c) + OV));
  });
  return [{ name: 'rest', paths: fromPaper(below) }, ...out];
}

// Points every 4 px along each cut line where it runs through the drawing (inside an element of the stack), each with
// a point just across the line and the piece that is there: the tear check compares how the two sides move.
function seamSamples(all, els) {
  const P = getPaper();
  const items = new Map();
  const item = (i) => items.get(i) || items.set(i, toPaper(els[i].paths, els[i].rule)).get(i);
  const polyOf = (c) => c.poly || outline(c.piece, 8);
  return all.map((c, k) => {
    const pts = c.seam, n = c.closed ? pts.length : pts.length - 1, out = [];
    const mine = polyOf(c);
    for (let e = 0; e < n; e++) {
      const a = pts[e], b = pts[(e + 1) % pts.length], L = Math.hypot(b[0] - a[0], b[1] - a[1]);
      if (!(L > 0)) continue;
      const nx = -(b[1] - a[1]) / L, ny = (b[0] - a[0]) / L, steps = Math.max(1, Math.ceil(L / 4));
      for (let j = 0; j <= steps; j++) {
        const p = [a[0] + ((b[0] - a[0]) * j) / steps, a[1] + ((b[1] - a[1]) * j) / steps];
        const el = [...c.stack].reverse().find((i) => item(i).contains(new P.Point(p)));
        if (el === undefined) continue;
        if (all.slice(k + 1).some((l) => l.stack.includes(el) && inside(p, polyOf(l)))) continue; // a later cut took it
        const q1 = [p[0] + nx * 2 * OV, p[1] + ny * 2 * OV], q2 = [p[0] - nx * 2 * OV, p[1] - ny * 2 * OV];
        const in1 = inside(q1, mine), in2 = inside(q2, mine);
        if (in1 === in2) continue; // a corner of the polygon
        const q = in1 ? q2 : q1;
        const by = (list) => list.find((l) => l.stack.includes(el) && inside(q, polyOf(l)));
        const side = (by(all.slice(k + 1).reverse()) || by(all.slice(0, k).reverse()) || { name: 'rest' }).name;
        out.push({ p, q, el, side });
      }
    }
    return out;
  });
}

// els → { els (pieces in paint order, `from` = "N:name"), index: key → position }. No cuts: the same list.
function applyCuts(els, cuts) {
  if (!cuts || !cuts.length) return { els, index: new Map(els.map((e) => [String(e.i), e.i])), seams: [] };
  validateCuts(cuts, els);
  const all = cuts.map((c) => prepare(c, els));
  for (const c of all) {
    const s = c.stack;
    for (let i = s[0]; i <= s[s.length - 1]; i++) {
      if (!s.includes(i)) throw new Error(`cuts ${c.name}: element ${i} lies between cut elements ${s[0]} and ${s[s.length - 1]} but is not cut itself — add it to the cut, otherwise it will be hidden under the cut-off part`);
    }
  }
  const byEl = new Map();
  for (const c of all) for (const i of c.stack) (byEl.get(i) || byEl.set(i, []).get(i)).push(c);
  const pieces = new Map();
  for (const [i, list] of byEl) {
    for (const p of cutElement(els[i], list)) {
      pieces.set(`${i}:${p.name}`, p.paths);
    }
  }
  const after = new Map();
  for (const c of all) {
    const last = c.stack[c.stack.length - 1];
    (after.get(last) || after.set(last, []).get(last)).push(c);
  }
  const out = [], index = new Map();
  const push = (e, key, paths) => {
    if (paths && !paths.length) return; // the cut missed this element of its stack, or took all of it
    index.set(key, out.length);
    out.push(paths ? { ...e, i: out.length, paths, bbox: pathsBBox(paths), from: key } : { ...e, i: out.length, from: key });
  };
  for (const e of els) {
    if (byEl.has(e.i)) push(e, `${e.i}:rest`, pieces.get(`${e.i}:rest`));
    else push(e, String(e.i));
    for (const c of after.get(e.i) || []) for (const i of c.stack) push(els[i], `${i}:${c.name}`, pieces.get(`${i}:${c.name}`));
  }
  const samples = seamSamples(all, els);
  return { els: out, index, seams: all.map((c, k) => ({ name: c.name, pts: c.seam, closed: c.closed, samples: samples[k] })) };
}

// Differing pixels of the rest pose (full size) that lie within r px of a cut line, per cut: a hairline shows there.
function seamHits(pts, seams, r = 4) {
  const near = (p, a, b) => {
    const dx = b[0] - a[0], dy = b[1] - a[1], L = dx * dx + dy * dy;
    const t = L ? Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / L)) : 0;
    return Math.hypot(p[0] - a[0] - t * dx, p[1] - a[1] - t * dy) <= r;
  };
  return seams.map((s) => {
    const n = s.closed ? s.pts.length : s.pts.length - 1;
    return { name: s.name, hits: pts.filter((p) => { for (let k = 0; k < n; k++) if (near(p, s.pts[k], s.pts[(k + 1) % s.pts.length])) return true; return false; }).length };
  });
}

module.exports = { applyCuts, seamHits, toPaper, fromPaper, chain, OV, D };
