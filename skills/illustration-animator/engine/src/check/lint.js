// Script checks on a compiled scene: loop seam, jumps, easing, speed, roles, timing, joints, bounds, deformation, overlap.
const { valueAt } = require('../lottie/keys');
const { worldMatrix, apply } = require('../lottie/evaluate');
const { weights, pose, deformPoint, area, outline, inside } = require('../bones/skin');
const { checkSpeed } = require('./motion');

const ROLES = ['action', 'reaction', 'ambient'];
const eq = (a, b, eps = 0.01) => a.every((v, i) => Math.abs(v - b[i]) <= eps);
const first = (v) => (Array.isArray(v) ? v[0] : v);
const start = (tr) => tr.at ?? Math.min(...Object.values(tr.keys || {}).map((ks) => ks[0][0]));

function checkJumps(model) {
  return model.jumps.filter((j) => !j.allowed).map((j) => ({
    check: j.frame === model.op ? 'seam' : 'jump', part: j.part, frame: j.frame,
    detail: j.frame === model.op ? `${j.prop}: does not return to the start value by the end of the loop` : `${j.prop}: value jump`,
  }));
}

function checkSeam(lottie) {
  const out = [];
  const op = lottie.op;
  for (const L of lottie.layers) {
    for (const [prop, P] of Object.entries(L.ks)) {
      if (!P || P.a !== 1) continue;
      const v0 = valueAt(P, 0), vE = valueAt(P, op);
      // a whole number of turns is the same pose
      const turn = prop === 'r' && Math.abs(Math.round((vE[0] - v0[0]) / 360) * 360 - (vE[0] - v0[0])) < 0.01;
      if (!turn && !eq(v0, vE)) { out.push({ check: 'seam', part: L.nm, frame: op, detail: `${prop}: values at frames 0 and ${op} differ` }); continue; }
      const d0 = valueAt(P, 1).map((v, i) => v - v0[i]);
      const dE = vE.map((v, i) => v - valueAt(P, op - 1)[i]);
      // a smooth turn on the seam (a leg at its extreme): speed reverses but grows from zero on both sides, not a bounce
      const d1 = valueAt(P, 2).map((v, i) => v - valueAt(P, 1)[i]);
      const dF = valueAt(P, op - 1).map((v, i) => v - valueAt(P, op - 2)[i]);
      const turn0 = d0.every((v, i) => v * dE[i] <= 0 && Math.abs(v) <= 0.6 * Math.abs(d1[i]) + 0.01 && Math.abs(dE[i]) <= 0.6 * Math.abs(dF[i]) + 0.01);
      // fast motion along a curve (a plate riding the ring): one-frame differences on both sides differ by curvature, so 5 % of the speed
      const tol = Math.max(0.5, 0.05 * Math.hypot(...d0));
      if (!eq(d0, dE, tol) && !turn0) out.push({ check: 'seam', part: L.nm, frame: op, detail: `${prop}: velocity at the seam does not match` });
    }
  }
  return out;
}

function checkLinear(lottie, linearOk) {
  const out = [];
  for (const L of lottie.layers) {
    for (const [prop, P] of Object.entries(L.ks)) {
      if (!P || P.a !== 1 || linearOk.has(`${L.nm}.${prop}`)) continue;
      for (let j = 0; j < P.k.length - 1; j++) {
        const a = P.k[j], b = P.k[j + 1];
        // one-frame keys are a sampled curve (spring, bend with lag), not a linear move
        if (a.h === 1 || b.t - a.t <= 1 || eq([].concat(a.s), [].concat(b.s))) continue;
        const lin = Math.abs(first(a.o.x) - first(a.o.y)) < 1e-3 && Math.abs(first(a.i.x) - first(a.i.y)) < 1e-3;
        if (lin) { out.push({ check: 'linear', part: L.nm, frame: a.t, detail: `${prop}: linear easing` }); break; }
      }
    }
  }
  return out;
}

const checkRoles = (scene) => scene.tracks
  .filter((tr) => !ROLES.includes(tr.role))
  .map((tr) => ({ check: 'role', part: tr.part, frame: start(tr), detail: 'track has no role (action / reaction / ambient)' }));

function checkSimultaneous(scene) {
  const rs = scene.tracks.filter((tr) => tr.role === 'reaction').sort((a, b) => start(a) - start(b));
  const out = [];
  for (let n = 1; n < rs.length; n++) {
    if (rs[n].part !== rs[n - 1].part && Math.abs(start(rs[n]) - start(rs[n - 1])) < 3) {
      out.push({ check: 'simultaneous', part: `${rs[n - 1].part}+${rs[n].part}`, frame: start(rs[n]), detail: 'two reactions at once' });
    }
  }
  return out;
}

// Ambient motion is allowed only on top of a plot: at least one action and one reaction.
function checkNarrative(scene) {
  const has = (r) => scene.tracks.some((tr) => tr.role === r);
  return has('action') && has('reaction') ? [] : [{ check: 'narrative', detail: 'no story: need at least one action and a reaction to it' }];
}

function pointOf(lottie, model, name, pt, t) {
  const part = model.parts[name];
  let local = pt;
  if (part.mapAt) local = part.mapAt(t)(pt);
  else if (part.bones && part.bendProp) {
    const J = part.bones.joints;
    local = deformPoint(pt, weights(pt, J), J, pose(J, valueAt(part.bendProp, t)));
  }
  return apply(worldMatrix(lottie, name, t), local);
}

function checkJoints(lottie, model) {
  const out = [];
  for (const j of model.scene.joints || []) {
    for (let t = 0; t <= model.op; t++) {
      const a = pointOf(lottie, model, j.a, j.at, t), b = pointOf(lottie, model, j.b, j.at, t);
      const d = Math.hypot(a[0] - b[0], a[1] - b[1]);
      if (d > 2) { out.push({ check: 'joint', part: `${j.a}/${j.b}`, frame: t, detail: `joint came apart by ${d.toFixed(1)} px` }); break; }
    }
  }
  return out;
}

function checkBounds(lottie, model) {
  const out = [];
  for (const p of Object.values(model.parts)) {
    if (p.canLeave) continue;
    const [x0, y0, x1, y1] = p.bbox;
    for (let t = 0; t <= model.op; t++) {
      const m = worldMatrix(lottie, p.name, t);
      const pts = [[x0, y0], [x1, y0], [x1, y1], [x0, y1]].map((q) => apply(m, q));
      if (pts.some(([x, y]) => x < -2 || y < -2 || x > model.w + 2 || y > model.h + 2)) {
        out.push({ check: 'bounds', part: p.name, frame: t, detail: 'goes off the canvas' });
        break;
      }
    }
    // a bent part: the outline itself moves, so test the bbox of every baked key (vertices and handles)
    for (const keys of Object.values(p.shapeKeys || {})) {
      const bad = keys.find((kf) => {
        const pts = [];
        for (const sp of kf.paths) sp.v.forEach((v, k) => pts.push(v, [v[0] + sp.i[k][0], v[1] + sp.i[k][1]], [v[0] + sp.o[k][0], v[1] + sp.o[k][1]]));
        const xs = pts.map((q) => q[0]), ys = pts.map((q) => q[1]);
        const [bx0, by0, bx1, by1] = [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)];
        const m = worldMatrix(lottie, p.name, kf.t);
        return [[bx0, by0], [bx1, by0], [bx1, by1], [bx0, by1]].map((q) => apply(m, q))
          .some(([x, y]) => x < -2 || y < -2 || x > model.w + 2 || y > model.h + 2);
      });
      if (bad && !out.some((o) => o.part === p.name)) out.push({ check: 'bounds', part: p.name, frame: bad.t, detail: 'bent part goes off the canvas' });
    }
  }
  return out;
}

// Polygonize (6 samples per cubic) and count proper crossings between non-adjacent edges.
function crossings(paths) {
  const edges = [];
  for (const sp of paths) {
    const n = sp.v.length, pts = [];
    for (let k = 0; k < (sp.c ? n : n - 1); k++) {
      const a = sp.v[k], b = sp.v[(k + 1) % n];
      const c1 = [a[0] + sp.o[k][0], a[1] + sp.o[k][1]], c2 = [b[0] + sp.i[(k + 1) % n][0], b[1] + sp.i[(k + 1) % n][1]];
      for (let s = 0; s < 6; s++) {
        const t = s / 6, u = 1 - t;
        pts.push([
          u * u * u * a[0] + 3 * u * u * t * c1[0] + 3 * u * t * t * c2[0] + t * t * t * b[0],
          u * u * u * a[1] + 3 * u * u * t * c1[1] + 3 * u * t * t * c2[1] + t * t * t * b[1],
        ]);
      }
    }
    for (let k = 0; k < pts.length; k++) edges.push([pts[k], pts[(k + 1) % pts.length], edges.length, pts.length]);
  }
  const cross = (x, y) => x[0] * y[1] - x[1] * y[0];
  const sub = (x, y) => [x[0] - y[0], x[1] - y[1]];
  const step = edges.length > 1500 ? Math.ceil(edges.length / 1500) : 1;
  let count = 0;
  for (let i = 0; i < edges.length; i += step) {
    for (let j = i + 2; j < edges.length; j++) {
      const [a, b] = edges[i], [c, d] = edges[j];
      if (a === d || b === c) continue;
      const r = sub(b, a), q = sub(d, c);
      const den = cross(r, q);
      // parallel, collinear or zero-length: not a crossing
      if (Math.abs(den) < 1e-9 * Math.hypot(r[0], r[1]) * Math.hypot(q[0], q[1])) continue;
      const ca = sub(c, a);
      const t = cross(ca, q) / den, u = cross(ca, r) / den;
      // half-open on the parameter: a crossing exactly on a sample vertex counts once
      if (t >= 0 && t < 1 && u >= 0 && u < 1) count++;
    }
  }
  return count;
}

function checkDeform(lottie, model) {
  const out = [];
  for (const p of Object.values(model.parts)) {
    if (!p.shapeKeys) continue;
    for (const [i, keys] of Object.entries(p.shapeKeys)) {
      const rest = model.els[i].paths;
      const a0 = area(rest), x0 = crossings(rest);
      for (const kf of keys) {
        const ratio = area(kf.paths) / a0;
        if (Math.abs(ratio - 1) > 0.1) { out.push({ check: 'deform', part: p.name, frame: kf.t, detail: `area changed by a factor of ${ratio.toFixed(2)}` }); break; }
        if (crossings(kf.paths) > x0) { out.push({ check: 'deform', part: p.name, frame: kf.t, detail: 'path twisted at the bend' }); break; }
      }
    }
  }
  return out;
}

// Player-independent: every SVG element lands in the Lottie exactly once (one shape group each),
// and stacking by ind gives the same order as the array (1 = top), so no player flips the layers.
function checkStructure(lottie, model) {
  const out = [];
  const groups = lottie.layers.reduce((n, l) => n + (l.shapes || []).filter((g) => g.nm !== 'backfill' && g.nm !== 'matte' && g.nm !== 'cap').length, 0);
  if (groups !== model.els.length) out.push({ check: 'structure', frame: 0, detail: `SVG elements ${model.els.length}, in Lottie ${groups}: ${groups < model.els.length ? 'a part is missing' : 'there are extra'}` });
  if (lottie.layers.some((l, k) => l.ind !== k + 1)) out.push({ check: 'structure', frame: 0, detail: 'layer order by index does not match the order in the file — other players will flip the stack' });
  return out;
}

// A cut must not tear the drawing: wherever a cut line runs through it, the two sides move together (the line is
// pinned, or it runs where nothing moves). Worst gap per cut over the loop, px.
const TEAR = 2;
function checkTear(lottie, model) {
  const out = [];
  const owner = new Map();
  for (const p of Object.values(model.parts)) for (const i of p.els) owner.set(model.els[i].from, p.name);
  const at = (name, pt, t) => (name ? pointOf(lottie, model, name, pt, t) : pt);
  for (const s of model.seams || []) {
    let worst = null;
    for (const sm of s.samples || []) {
      const X = owner.get(`${sm.el}:${s.name}`), Y = owner.get(`${sm.el}:${sm.side}`);
      if (X === Y) continue;
      for (let t = 0; t <= model.op; t++) {
        const a = at(X, sm.p, t), b = at(Y, sm.q, t);
        const d = Math.hypot(a[0] - sm.p[0] - (b[0] - sm.q[0]), a[1] - sm.p[1] - (b[1] - sm.q[1]));
        if (d > TEAR && (!worst || d > worst.d)) worst = { d, t, p: sm.p, X, Y };
      }
    }
    if (worst) {
      out.push({ check: 'tear', part: s.name, frame: worst.t, detail: `cut ${s.name} tears the drawing at (${worst.p.map(Math.round).join(', ')}): ${worst.X || 'static'} and ${worst.Y || 'static'} diverge by ${worst.d.toFixed(1)} px — run the cut line along a seam pinned by pin.line, or through empty space` });
    }
  }
  return out;
}

// Parts that stand apart in the key pose must not run into each other: the shared area of two parts (grid of points
// over their common box, even-odd fill) above 15 % of the smaller one. Parent and child, attached parts, parts
// with a joint between them, an actor with the part that reacts to it and parts listed in `touch` are skipped.
const OVERLAP = 0.15;
function checkOverlap(lottie, model) {
  const parts = Object.values(model.parts);
  if (parts.length < 2) return [];
  const up = (p) => p.parent || (p.attach && p.attach.part);
  const chain = (p) => { const out = new Set(); for (let q = up(p); q && !out.has(q); q = up(model.parts[q])) out.add(q); return out; };
  const anc = Object.fromEntries(parts.map((p) => [p.name, chain(p)]));
  const roles = Object.fromEntries(parts.map((p) => [p.name, new Set(model.scene.tracks.filter((tr) => tr.part === p.name).map((tr) => tr.role))]));
  const jointed = new Set((model.scene.joints || []).flatMap((j) => [`${j.a}|${j.b}`, `${j.b}|${j.a}`]));
  const pairs = [];
  for (let i = 0; i < parts.length; i++) {
    for (let j = i + 1; j < parts.length; j++) {
      const a = parts[i].name, b = parts[j].name;
      if (anc[a].has(b) || anc[b].has(a) || jointed.has(`${a}|${b}`)) continue;
      if ((parts[i].touch || []).includes(b) || (parts[j].touch || []).includes(a)) continue;
      // an actor and the thing it acts on touch by the plot: a cursor on its button, a hand on the toggle
      if ((roles[a].has('action') && roles[b].has('reaction')) || (roles[b].has('action') && roles[a].has('reaction'))) continue;
      pairs.push([parts[i], parts[j]]);
    }
  }
  // outline polygons of a part at frame t in canvas space (bent parts take their baked key); local outlines are
  // built once per element or baked key, each frame only moves their points
  const local = new WeakMap();
  const outlineOf = (paths) => {
    if (!local.has(paths)) local.set(paths, paths.map((sp) => outline(sp, 3)));
    return local.get(paths);
  };
  const boxOf = (pts) => {
    const b = [Infinity, Infinity, -Infinity, -Infinity];
    for (const [x, y] of pts) { if (x < b[0]) b[0] = x; if (y < b[1]) b[1] = y; if (x > b[2]) b[2] = x; if (y > b[3]) b[3] = y; }
    return b;
  };
  const polys = (p, t) => {
    const m = worldMatrix(lottie, p.name, t);
    const els = p.els.map((i) => {
      const keys = p.shapeKeys && p.shapeKeys[i];
      let paths = model.els[i].paths;
      if (keys) for (const kf of keys) { if (kf.t > t) break; paths = kf.paths; }
      return outlineOf(paths).map((poly) => { const w = poly.map((q) => apply(m, q)); return { w, box: boxOf(w) }; });
    });
    const all = els.flat();
    const box = [Math.min(...all.map((q) => q.box[0])), Math.min(...all.map((q) => q.box[1])), Math.max(...all.map((q) => q.box[2])), Math.max(...all.map((q) => q.box[3]))];
    return { els, box };
  };
  const filled = (P, q) => P.els.some((sps) => sps.reduce((c, poly) => (q[0] < poly.box[0] || q[0] > poly.box[2] || q[1] < poly.box[1] || q[1] > poly.box[3] ? c : c !== inside(q, poly.w)), false));
  const visible = (p, t) => {
    const L = lottie.layers.find((l) => l.nm === p.name);
    const o = valueAt(L.ks.o, t)[0], s = valueAt(L.ks.s, t);
    return o >= 50 && Math.min(Math.abs(s[0]), Math.abs(s[1])) >= 30;
  };
  // shared area: points of a 16×16 grid over the common box that are filled in both parts
  const shared = (A, B) => {
    const x0 = Math.max(A.box[0], B.box[0]), y0 = Math.max(A.box[1], B.box[1]), x1 = Math.min(A.box[2], B.box[2]), y1 = Math.min(A.box[3], B.box[3]);
    if (x1 <= x0 || y1 <= y0) return 0;
    const n = 16, cell = ((x1 - x0) * (y1 - y0)) / (n * n);
    let both = 0;
    for (let gx = 0; gx < n; gx++) for (let gy = 0; gy < n; gy++) {
      const q = [x0 + ((gx + 0.5) * (x1 - x0)) / n, y0 + ((gy + 0.5) * (y1 - y0)) / n];
      if (filled(A, q) && filled(B, q)) both++;
    }
    return both * cell;
  };
  const areaOf = (p) => p.els.reduce((s, i) => s + area(model.els[i].paths), 0);
  const out = [];
  const frameCache = new Map();
  const at = (p, t) => { const k = `${p.name}@${t}`; if (!frameCache.has(k)) frameCache.set(k, polys(p, t)); return frameCache.get(k); };
  for (const [a, b] of pairs) {
    const A0 = at(a, 0), B0 = at(b, 0);
    const small = Math.min(areaOf(a), areaOf(b));
    if (!(small > 0)) continue;
    if (shared(A0, B0) > 0.01 * small) continue; // touching or layered in the key pose: drawn so
    for (let t = 3; t <= model.op; t += 3) {
      if (!visible(a, t) || !visible(b, t)) continue;
      const A = at(a, t), B = at(b, t);
      if (A.box[2] < B.box[0] || B.box[2] < A.box[0] || A.box[3] < B.box[1] || B.box[3] < A.box[1]) continue;
      const share = shared(A, B) / small;
      if (share > OVERLAP) {
        out.push({ check: 'overlap', part: `${a.name}/${b.name}`, frame: t, detail: `parts overlap by ${Math.round(share * 100)}% of the smaller one (in the key pose they are apart)` });
        break;
      }
    }
  }
  return out;
}

const lint = (lottie, model) => [
  ...checkStructure(lottie, model),
  ...checkJumps(model),
  ...checkSeam(lottie),
  ...checkLinear(lottie, model.linearOk),
  ...checkSpeed(lottie, model),
  ...checkRoles(model.scene),
  ...checkSimultaneous(model.scene),
  ...checkNarrative(model.scene),
  ...checkJoints(lottie, model),
  ...checkBounds(lottie, model),
  ...checkDeform(lottie, model),
  ...checkOverlap(lottie, model),
  ...checkTear(lottie, model),
];

module.exports = { lint, checkSpeed, checkOverlap, checkTear, checkStructure, checkJumps, checkSeam, checkLinear, checkRoles, checkNarrative, checkSimultaneous, checkJoints, checkBounds, checkDeform, crossings };
