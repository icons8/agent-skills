// Scene JSON (parts, bones, tracks) + SVG → Lottie and a model for the checks.
const fs = require('fs');
const path = require('path');
const { parseSvg, color } = require('../svg/parse');
const { applySplit } = require('./split');
const { applyCuts } = require('./cut');
const { anim, valueAt } = require('../lottie/keys');
const { buildLottie } = require('../lottie/build');
const { bakeBend, deformPaths, pointOnBone, boneAngle, weights, pose, deformPoint, pinWeight, pinned, bakeMap } = require('../bones/skin');
const { localMatrix, mul, invert, apply } = require('../lottie/evaluate');
const { TEMPLATES, PARAMS, checkKeys } = require('../templates');

const REST = { p: [0, 0], s: [100, 100], r: 0, o: 100 };
const asArr = (v) => (Array.isArray(v) ? v : [v]);
const sameValue = (a, b) => asArr(a).every((v, k) => Math.abs(v - asArr(b)[k]) < 0.01);
const same = sameValue;

function bboxOf(els, idx) {
  const b = [Infinity, Infinity, -Infinity, -Infinity];
  for (const i of idx) {
    const e = els[i].bbox;
    b[0] = Math.min(b[0], e[0]); b[1] = Math.min(b[1], e[1]); b[2] = Math.max(b[2], e[2]); b[3] = Math.max(b[3], e[3]);
  }
  return b;
}

function resolvePivot(pv, b, name) {
  if (Array.isArray(pv)) return pv;
  const cx = (b[0] + b[2]) / 2, cy = (b[1] + b[3]) / 2;
  const named = { center: [cx, cy], bottom: [cx, b[3]], top: [cx, b[1]], left: [b[0], cy], right: [b[2], cy] }[pv || 'center'];
  if (!named) throw new Error(`${name}: unclear pivot "${pv}"`);
  return named;
}

// segs: [{ keys: [[t, v, e]], jump }] for one prop of one part. Rest at 0 and op, holds between tracks.
// wrap: 360 for rotation — a full turn is the same pose, so a spin may end at 360 and the loop stays closed.
function mergeProp(segs, rest, op, wrap = 0) {
  const same = (a, b) => (wrap ? asArr(a).every((v, k) => Math.abs((((v - asArr(b)[k]) % wrap) + wrap + 0.005) % wrap) < 0.01) : sameValue(a, b));
  segs = [...segs].sort((a, b) => a.keys[0][0] - b.keys[0][0]);
  const keys = [[0, rest]];
  const jumps = [];
  const close = (key, next, allowed) => {
    if (!same(key[1], next[1])) jumps.push({ frame: next[0], allowed });
    key[2] = 'hold';
  };
  for (const seg of segs) {
    const ks = seg.keys.map((k) => [...k]);
    const prev = keys[keys.length - 1];
    if (ks[0][0] < prev[0]) throw new Error(`tracks overlap in time (frame ${ks[0][0]})`);
    if (ks[ks.length - 1][0] > op) throw new Error(`track runs past the end of the loop (frame ${ks[ks.length - 1][0]})`);
    if (ks[0][0] === prev[0]) {
      if (!same(ks[0][1], prev[1])) throw new Error(`two tracks meet at frame ${prev[0]} with different values`);
      keys.pop();
    } else close(prev, ks[0], !!seg.jump);
    keys.push(...ks);
  }
  const last = keys[keys.length - 1];
  if (last[0] < op) {
    close(last, [op, rest], false);
    // a spin that ended a whole turn away holds there: no 360 → 0 step inside the loop
    keys.push([op, wrap && same(last[1], rest) ? last[1] : rest]);
  } else if (!same(last[1], rest)) jumps.push({ frame: op, allowed: false });
  return { keys, jumps };
}

const TRACK_FIELDS = ['part', 't', 'at', 'role', 'beat', 'jump', 'constant', 'keys'];

// The scene file is hand-written (by an agent): reject missing or malformed fields before anything is built.
function validateScene(scene) {
  const bad = (m) => { throw new Error(m); };
  if (!scene || typeof scene !== 'object' || Array.isArray(scene)) bad('Scene must be a JSON object');
  if (typeof scene.name !== 'string' || !scene.name) bad('Scene: name missing (string)');
  if (typeof scene.svg !== 'string' || !scene.svg) bad('Scene: svg missing (file path as a string)');
  if (!(Number.isInteger(scene.fr) && scene.fr > 0)) bad('Scene: fr must be an integer above 0');
  if (!(Number.isInteger(scene.op) && scene.op > 0)) bad('Scene: op must be a whole number of frames above 0');
  if (!Array.isArray(scene.parts)) bad('Scene: parts must be an array of parts');
  if (!Array.isArray(scene.tracks)) bad('Scene: tracks must be an array of tracks');
  if (scene.split !== undefined) bad('split is no longer needed: give the paths directly in els ("17.0")');
  const pt = (q) => Array.isArray(q) && q.length === 2 && q.every(Number.isFinite);
  for (const p of scene.parts) {
    if (!p || typeof p.name !== 'string' || !p.name) bad('Part without name');
    const okRef = (r) => Number.isInteger(r) || (typeof r === 'string' && /^\d+(\.\d+|:[A-Za-z][\w-]*)$/.test(r));
    if (!Array.isArray(p.els) || !p.els.length) bad(`${p.name}: els must be a non-empty array of element numbers`);
    if (!p.els.every(okRef)) bad(`${p.name}: els are element numbers (12), paths of a split element ("17.0") or cut pieces ("4:arm", "4:rest")`);
    if (p.pin !== undefined) {
      const pin = p.pin;
      if (!pin || typeof pin !== 'object' || Array.isArray(pin)) bad(`${p.name}: pin is an object { line | zone, feather }`);
      if (pin.line === undefined && pin.zone === undefined) bad(`${p.name}: pin needs line (the cut line) or zone (what stands still)`);
      if (pin.line !== undefined && !(Array.isArray(pin.line) && pin.line.length >= 2 && pin.line.every(pt))) bad(`${p.name}: pin.line needs at least 2 points [x, y]`);
      if (pin.zone !== undefined && !(Array.isArray(pin.zone) && pin.zone.length >= 3 && pin.zone.every(pt))) bad(`${p.name}: pin.zone is a polygon of at least 3 points [x, y]`);
      if (pin.feather !== undefined && !(Number.isFinite(pin.feather) && pin.feather > 0)) bad(`${p.name}: pin.feather is a distance in px above 0`);
    }
  }
  if (scene.joints !== undefined) {
    if (!Array.isArray(scene.joints)) bad('joints must be an array of {a, b, at}');
    const names = new Set(scene.parts.map((x) => x.name));
    for (const j of scene.joints) {
      for (const k of ['a', 'b']) {
        if (!j || typeof j[k] !== 'string') bad(`joints: joint has no ${k} (part name)`);
        if (!names.has(j[k])) bad(`joints: no part ${j[k]}`);
      }
      if (!(Array.isArray(j.at) && j.at.length === 2 && j.at.every(Number.isFinite))) bad('joints: at must be [x, y]');
    }
  }
  for (const tr of scene.tracks) {
    if (!tr || typeof tr.part !== 'string') bad('Track without part (part name)');
    if (tr.keys !== undefined) {
      const ok = tr.keys && typeof tr.keys === 'object' && !Array.isArray(tr.keys) && Object.values(tr.keys).every(Array.isArray);
      if (!ok) bad(`${tr.part}: keys must be an object {property: [[frame, value, easing], …]}`);
    } else if (typeof tr.t !== 'string') bad(`${tr.part}: track has neither t (template) nor keys (own keys)`);
  }
}

const plural = (n) => (n === 1 ? 'angle' : 'angles');

function trackKeys(track) {
  if (track.keys) return checkKeys(track.part, track.keys);
  const fn = TEMPLATES[track.t];
  if (!fn) throw new Error(`No template "${track.t}" (${track.part})`);
  const unknown = Object.keys(track).filter((k) => !TRACK_FIELDS.includes(k) && !PARAMS[track.t].includes(k));
  if (unknown.length) throw new Error(`${track.t}: unknown parameter ${unknown[0]} (available: ${PARAMS[track.t].join(', ')})`);
  const { part, t, at, role, beat, jump, constant, ...params } = track;
  return fn(at, params);
}

// keep the edges of every run of equal values
const compact = (keys) => keys.filter((k, n) =>
  n === 0 || n === keys.length - 1 || !same(k[1], keys[n - 1][1]) || !same(k[1], keys[n + 1][1]));

// "N.j" in a part's els is subpath j of element N. Elements that parts claim by subpaths are cut into groups:
// one per claiming part, plus one for the unclaimed rest (it stays static). Groups keep paint order by smallest subpath.
// key: "N" or a cut piece "N:name" → index in els (after cuts).
function splitFromParts(parts, els, key = (k) => Number(k)) {
  const whole = new Set();
  const claimed = new Map(); // N -> Map(j -> part name)
  for (const p of parts) {
    for (const r of p.els) {
      const m = typeof r === 'string' ? /^(\d+)\.(\d+)$/.exec(r) : null;
      if (!m) { whole.add(String(key(String(r), p.name))); continue; }
      const n = String(key(m[1], p.name)), j = Number(m[2]);
      if (!els[Number(n)]) throw new Error(`${p.name}: no element ${n}`);
      const count = els[Number(n)].paths.length;
      if (j >= count) throw new Error(`${p.name}: element ${n} has no path ${j} (has 0–${count - 1})`);
      const by = claimed.get(n) || claimed.set(n, new Map()).get(n);
      if (by.has(j) && by.get(j) !== p.name) throw new Error(`path ${n}.${j} belongs to both ${by.get(j)} and ${p.name}`);
      by.set(j, p.name);
    }
  }
  const split = {};
  const groupOf = {};
  for (const [n, by] of claimed) {
    if (whole.has(n)) throw new Error(`element ${n} is given both whole and by paths — pick one`);
    const all = els[Number(n)].paths.map((_, j) => j);
    const groups = [...new Set(by.values())].map((name) => ({ name, js: [...by].filter(([, v]) => v === name).map(([j]) => j) }));
    const rest = all.filter((j) => !by.has(j));
    if (rest.length) groups.push({ name: null, js: rest });
    groups.sort((x, y) => Math.min(...x.js) - Math.min(...y.js));
    if (groups.length < 2) continue;
    split[n] = groups.map((g) => g.js);
    groupOf[n] = groups.map((g) => g.js);
  }
  const resolve = (sp, r, who) => {
    const m = typeof r === 'string' ? /^(\d+)\.(\d+)$/.exec(r) : null;
    if (!m) return sp.ref(String(key(String(r), who)), who);
    const n = String(key(m[1], who));
    if (!split[n]) return sp.ref(n, who);
    return sp.ref(`${n}.${groupOf[n].findIndex((g) => g.includes(Number(m[2])))}`, who);
  };
  return { split, resolve };
}

// Round ends where a mask edge cuts a drawn line. Lines are filled outlines: the cut crosses both sides of a line at two points
// close together along the mask outline (also across its corner) — the cap is a disc of that width at their middle. Light fills (white) are skipped.
function cutCaps(elList, poly, maxW = 22, maxR = 5.5) {
  const caps = [];
  const cross = (a, b, c, d) => {
    const r = [b[0] - a[0], b[1] - a[1]], s = [d[0] - c[0], d[1] - c[1]];
    const den = r[0] * s[1] - r[1] * s[0];
    if (Math.abs(den) < 1e-9) return null;
    const t = ((c[0] - a[0]) * s[1] - (c[1] - a[1]) * s[0]) / den, u = ((c[0] - a[0]) * r[1] - (c[1] - a[1]) * r[0]) / den;
    return t >= 0 && t <= 1 && u >= 0 && u <= 1 ? u : null;
  };
  for (const el of elList) {
    if (!el.color || el.color.reduce((x, y) => x + y, 0) > 2.7) continue;
    const hits = [];
    const at = [0];   // perimeter length before each edge
    poly.forEach((A, e) => { const B = poly[(e + 1) % poly.length]; at.push(at[e] + Math.hypot(B[0] - A[0], B[1] - A[1])); });
    for (const pa of el.paths) {
      const n = pa.v.length, pts = [];
      for (let k = 0; k < (pa.c ? n : n - 1); k++) {
        const p0 = pa.v[k], p3 = pa.v[(k + 1) % n];
        const p1 = [p0[0] + pa.o[k][0], p0[1] + pa.o[k][1]], p2 = [p3[0] + pa.i[(k + 1) % n][0], p3[1] + pa.i[(k + 1) % n][1]];
        for (let j = 0; j < 8; j++) {
          const t = j / 8, m = 1 - t;
          pts.push([0, 1].map((d) => m * m * m * p0[d] + 3 * m * m * t * p1[d] + 3 * m * t * t * p2[d] + t * t * t * p3[d]));
        }
      }
      if (pa.c) pts.push(pts[0]); else pts.push(pa.v[n - 1]);
      for (let q = 0; q + 1 < pts.length; q++) {
        poly.forEach((A, e) => {
          const B = poly[(e + 1) % poly.length];
          const u = cross(pts[q], pts[q + 1], A, B);
          if (u !== null) hits.push({ u: at[e] + u * (at[e + 1] - at[e]), p: [A[0] + (B[0] - A[0]) * u, A[1] + (B[1] - A[1]) * u] });
        });
      }
    }
    {
      const hs = hits.sort((a, b) => a.u - b.u);
      for (let k = 0; k + 1 < hs.length; k++) {
        const a = hs[k].p, b = hs[k + 1].p, w = Math.hypot(b[0] - a[0], b[1] - a[1]);
        if (w > maxW || w < 1) continue;
        const c = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2], r = Math.min(Math.max(w / 2, 2.5), maxR), K = 0.5523 * r;   // an oblique cut is wider than the line
        caps.push({ r, color: el.color, opacity: 1, rule: 1, paths: [{ c: true,
          v: [[c[0] + r, c[1]], [c[0], c[1] + r], [c[0] - r, c[1]], [c[0], c[1] - r]],
          i: [[0, -K], [K, 0], [0, K], [-K, 0]], o: [[0, K], [-K, 0], [0, -K], [K, 0]] }] });
        k++;
      }
    }
  }
  return caps;
}

// Centre line of a drawn line between two points. Lines are filled outlines: every outline point is paired with the nearest point
// across the line (another contour, or the same one far along it), their middle is on the centre line and their distance is its width.
// The walk goes along one side of the line from the point nearest `from` to the one nearest `to`, the way that passes `via`.
function centerline(elList, { from, to, via }) {
  let best = null;
  for (const el of elList) {
    if (!el.color || el.color.reduce((x, y) => x + y, 0) > 2.7) continue;
    const cs = el.paths.map((pa) => {
      const n = pa.v.length, pts = [];
      for (let k = 0; k < (pa.c ? n : n - 1); k++) {
        const p0 = pa.v[k], p3 = pa.v[(k + 1) % n];
        const p1 = [p0[0] + pa.o[k][0], p0[1] + pa.o[k][1]], p2 = [p3[0] + pa.i[(k + 1) % n][0], p3[1] + pa.i[(k + 1) % n][1]];
        const steps = Math.max(2, Math.ceil(Math.hypot(p3[0] - p0[0], p3[1] - p0[1]) / 2));
        for (let j = 0; j < steps; j++) {
          const t = j / steps, m = 1 - t;
          pts.push([0, 1].map((d) => m * m * m * p0[d] + 3 * m * m * t * p1[d] + 3 * m * t * t * p2[d] + t * t * t * p3[d]));
        }
      }
      const at = [0];
      for (let k = 1; k < pts.length; k++) at.push(at[k - 1] + Math.hypot(pts[k][0] - pts[k - 1][0], pts[k][1] - pts[k - 1][1]));
      return { pts, at, len: at[at.length - 1], closed: pa.c };
    });
    for (const [ci, c] of cs.entries()) {
      const mids = c.pts.map((p, k) => {
        let q = null, dq = 30;
        for (const [cj, o] of cs.entries()) o.pts.forEach((r, m) => {
          if (cj === ci) { const a = Math.abs(c.at[k] - c.at[m]); if (Math.min(a, c.closed ? c.len - a : a) < 25) return; }
          const d = Math.hypot(r[0] - p[0], r[1] - p[1]);
          if (d < dq) { dq = d; q = r; }
        });
        return q ? { p: [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2], w: dq } : null;
      });
      const near = (t) => mids.reduce((b, m, k) => (m && (b < 0 || Math.hypot(m.p[0] - t[0], m.p[1] - t[1]) < Math.hypot(mids[b].p[0] - t[0], mids[b].p[1] - t[1])) ? k : b), -1);
      const a = near(from), b = near(to);
      if (a < 0 || b < 0) continue;
      const err = Math.hypot(mids[a].p[0] - from[0], mids[a].p[1] - from[1]) + Math.hypot(mids[b].p[0] - to[0], mids[b].p[1] - to[1]);
      const n = mids.length;
      const walk = (dir) => { const out = []; for (let k = a; ; k = (k + dir + n) % n) { if (mids[k]) out.push(mids[k]); if (k === b || (!c.closed && (k + dir < 0 || k + dir >= n))) break; } return out; };
      const ways = [walk(1), ...(c.closed ? [walk(-1)] : [])];
      const pass = (wy) => (via ? Math.min(...wy.map((m) => Math.hypot(m.p[0] - via[0], m.p[1] - via[1]))) : wy.length);
      const way = ways.sort((x, y) => pass(x) - pass(y))[0];
      if (!best || err < best.err) best = { err, way };
    }
  }
  if (!best) throw new Error('maskBy.lines — no line found between from and to');
  // smooth the zigzag of pairing, keep a point every ~3 px
  const raw = best.way.map((m) => m.p);
  const sm = raw.map((p, k) => { const win = raw.slice(Math.max(0, k - 1), k + 2); return [0, 1].map((d) => win.reduce((s, q) => s + q[d], 0) / win.length); });
  sm[0] = raw[0]; sm[sm.length - 1] = raw[raw.length - 1];
  const pts = [sm[0]];
  for (const p of sm.slice(1)) if (Math.hypot(p[0] - pts[pts.length - 1][0], p[1] - pts[pts.length - 1][1]) >= 3) pts.push(p);
  const ws = best.way.map((m) => m.w).sort((x, y) => x - y);
  return { pts, w: ws[Math.floor(ws.length / 2)] };
}

function compileScene(file, opts = {}) {
  const scene = JSON.parse(fs.readFileSync(file, 'utf8'));
  validateScene(scene);
  const svgFile = path.resolve(path.dirname(file), scene.svg);
  const parsed = parseSvg(svgFile, { size: scene.size || 1200 });
  const { w, h, src, warnings } = parsed;
  const cuts = applyCuts(parsed.els, scene.cuts);
  const key = (k, who) => {
    if (cuts.index.has(k)) return cuts.index.get(k);
    const own = [...cuts.index.keys()].filter((x) => x.startsWith(`${k.split(':')[0]}:`));
    if (/^\d+$/.test(k) && own.length) throw new Error(`${who}: element ${k} is cut — name its pieces: ${own.join(', ')}`);
    if (k.includes(':')) throw new Error(`${who}: no piece ${k}${own.length ? ` (has: ${own.join(', ')})` : ' — element is not cut (cuts)'}`);
    throw new Error(`${who}: no element ${k}`);
  };
  const cut = splitFromParts(scene.parts, cuts.els, key);
  const sp = applySplit(cuts.els, cut.split);
  const els = sp.els;
  const { fr, op } = scene;
  const start = opts.start ?? scene.start ?? 0;
  if (!(Number.isInteger(start) && start >= 0 && start < op)) throw new Error(`start must be a whole frame from 0 to op−1 (got ${start})`);

  // messages name elements the way the agent wrote them: 16, 17.0+17.1 — not the internal numbers after the split
  const nm = (i) => els[i].from ?? String(i);
  const owner = new Map();
  const parts = {};
  for (const part of scene.parts) {
    const p = { ...part, els: [...new Set(part.els.map((r) => cut.resolve(sp, r, part.name)))] };
    if (parts[p.name]) throw new Error(`part ${p.name} is described twice`);
    for (const i of p.els) {
      if (owner.has(i)) throw new Error(`element ${nm(i)} belongs to both ${owner.get(i)} and ${p.name}`);
      owner.set(i, p.name);
    }
    const bbox = bboxOf(els, p.els);
    parts[p.name] = { ...p, bbox, pivot: resolvePivot(p.pivot, bbox, p.name) };
  }
  for (const p of Object.values(parts)) {
    if (p.attach && p.parent) throw new Error(`${p.name}: attach and parent together — keep one`);
    if (p.bones && !(Array.isArray(p.bones.joints) && p.bones.joints.length >= 2)) throw new Error(`${p.name}: bones need at least 2 joints`);
    if (p.parent && !parts[p.parent]) throw new Error(`${p.name}: no parent ${p.parent}`);
    if (p.attach && !(parts[p.attach.part] && parts[p.attach.part].bones)) throw new Error(`${p.name}: ${p.attach.part} has no bones`);
    if (p.attach) {
      const b = p.attach.bone;
      if (!(Number.isInteger(b) && b >= 0 && b < parts[p.attach.part].bones.joints.length - 1)) throw new Error(`${p.name}: ${p.attach.part} has no bone ${b}`);
    }
  }

  if (!scene.tracks.some((tr) => tr.role === 'action')) throw new Error('No story: the scene has no action (role: action)');
  const segs = {};
  const linearOk = new Set();
  for (const tr of scene.tracks) {
    if (!parts[tr.part]) throw new Error(`track for unknown part ${tr.part}`);
    for (const [prop, ks] of Object.entries(trackKeys(tr))) {
      ((segs[tr.part] ??= {})[prop] ??= []).push({ keys: ks, jump: tr.jump });
      if (tr.constant || tr.t === 'spin') linearOk.add(`${tr.part}.${prop}`);
    }
  }

  const up = (p) => (p.attach ? parts[p.attach.part] : p.parent ? parts[p.parent] : null);
  const pinChain = (p) => { for (let q = p, n = 0; q && n < 50; q = up(q), n++) if (q.pin) return true; return false; };
  const jumps = [];
  const layers = {};
  for (const p of Object.values(parts)) {
    const L = { name: p.name, els: [...p.els].sort((a, b) => a - b), pivot: p.pivot, parent: p.attach ? p.attach.part : p.parent };
    const rest = { ...REST, bend: Array(p.bones ? p.bones.joints.length - 1 : 0).fill(0) };
    const merged = {};
    for (const [prop, list] of Object.entries(segs[p.name] || {})) {
      if (!(prop in rest)) throw new Error(`${p.name}: unknown property ${prop}`);
      if (prop === 'bend' && !p.bones) throw new Error(`${p.name}: bend without bones`);
      if (prop === 'bend') {
        const n = p.bones.joints.length - 1;
        for (const sg of list) for (const [, v] of sg.keys) if (!Array.isArray(v) || v.length !== n) throw new Error(`${p.name}: bend has ${Array.isArray(v) ? v.length : 0} ${plural(Array.isArray(v) ? v.length : 0)}, but there are ${n} bones`);
      }
      if (prop === 'p' && p.attach) throw new Error(`${p.name}: an attached part has no position motion of its own`);
      const m = mergeProp(list, rest[prop], op, prop === 'r' ? 360 : 0);
      jumps.push(...m.jumps.map((j) => ({ ...j, part: p.name, prop })));
      merged[prop] = m.keys;
    }
    const abs = (prop, v) => (prop === 'p' ? [p.pivot[0] + v[0], p.pivot[1] + v[1], 0] : prop === 's' ? [v[0], v[1], 100] : v);
    for (const prop of ['p', 's', 'r', 'o']) {
      if (merged[prop]) L[prop] = anim(merged[prop].map(([t, v, e, arc]) => [t, abs(prop, v), e, arc]), prop === 'p');
    }
    if (merged.bend) {
      p.bendProp = anim(merged.bend);
      if (!pinChain(p)) {
        p.shapeKeys = Object.fromEntries(L.els.map((i) => [i, bakeBend(els[i].paths, p.bones.joints, p.bendProp, op)]));
        L.shapeKeys = p.shapeKeys;
      }
    }
    layers[p.name] = L;
    if (p.backfill) {
      // backfill: [{ poly: [[x, y], …], color?: "#ffffff" }] — background-coloured silhouette under the part's lines.
      // It bends with the part; in the key pose (frame 0) it is collapsed to a point, so the pose still equals the SVG.
      if (!Array.isArray(p.backfill)) throw new Error(`${p.name}: backfill must be an array of {poly, color}`);
      L.backfill = p.backfill.map((b) => {
        if (!(Array.isArray(b.poly) && b.poly.length >= 3)) throw new Error(`${p.name}: backfill.poly needs at least 3 points [x, y]`);
        return { color: color(b.color || '#ffffff'), paths: [{ c: true, v: b.poly.map((q) => [...q]), i: b.poly.map(() => [0, 0]), o: b.poly.map(() => [0, 0]) }] };
      });
      L.backfillKeys = L.backfill.map((b) => {
        const rest = b.paths;
        const mid = rest[0].v.reduce((a, q) => [a[0] + q[0] / rest[0].v.length, a[1] + q[1] / rest[0].v.length], [0, 0]);
        const dot = [{ c: true, v: rest[0].v.map(() => [...mid]), i: rest[0].v.map(() => [0, 0]), o: rest[0].v.map(() => [0, 0]) }];
        let keys = p.bones && p.bendProp ? bakeBend(rest, p.bones.joints, p.bendProp, op) : [{ t: 0, paths: rest }, { t: op, paths: rest }];
        if (keys[1].t !== 1) keys.splice(1, 0, { t: 1, paths: p.bones && p.bendProp ? deformPaths(rest, p.bones.joints, valueAt(p.bendProp, 1)) : rest });
        keys[0] = { t: 0, paths: dot };
        return keys;
      });
    }
  }

  for (const p of Object.values(parts)) {
    if (!p.attach) continue;
    const rig = parts[p.attach.part];
    const L = layers[p.name];
    const zero = Array(rig.bones.joints.length - 1).fill(0);
    const ownR = L.r;
    const pk = [], rk = [];
    for (let t = 0; t <= op; t++) {
      const angles = rig.bendProp ? valueAt(rig.bendProp, t) : zero;
      const pt = pointOnBone(rig.bones.joints, angles, p.attach.bone, p.pivot);
      pk.push([t, [pt[0], pt[1], 0], 'lin']);
      rk.push([t, boneAngle(angles, p.attach.bone) + (ownR ? valueAt(ownR, t)[0] : 0), 'lin']);
    }
    L.p = anim(compact(pk), true);
    L.r = anim(compact(rk));
    linearOk.add(`${p.name}.p`).add(`${p.name}.r`);
  }

  for (const p of Object.values(parts)) if (pinChain(p)) bakePinned(p, parts, layers, els, op);

  // a part whose elements are not in a row (a cut arm between its torso's pieces, a hand behind and in front)
  // becomes several layers with the same motion: NAME, NAME·2, …
  const order = [];
  const runs = {};
  const fullEls = Object.fromEntries(Object.entries(layers).map(([k, L]) => [k, L.els]));
  let run = null;
  for (let i = 0; i < els.length; i++) {
    const o = owner.get(i);
    if (o === undefined) {
      if (!run || run.part) { run = { name: `STATIC_${order.length}`, els: [], pivot: [w / 2, h / 2] }; order.push(run); }
      run.els.push(i);
      continue;
    }
    if (!run || run.part !== o) {
      const n = (runs[o] = (runs[o] || 0) + 1);
      if (n > 1 && (parts[o].maskBy || parts[o].clipBy)) throw new Error(`${o}: maskBy and clipBy need the part's elements in a row — elements of another part are drawn between them`);
      const full = fullEls[o];
      run = n === 1 ? Object.assign(layers[o], { els: [], part: o }) : { ...layers[o], name: `${o}·${n}`, els: [], part: o };
      if (n > 1) for (const prop of ['p', 'r', 's', 'o']) if (linearOk.has(`${o}.${prop}`)) linearOk.add(`${run.name}.${prop}`);
      order.push(run);
      if (n === 1) masks: {
      // clipBy: "<PART>" — the part is visible only inside the shape of that part (alpha track matte that follows it)
      const mb = parts[o].maskBy;
      if (mb) {
        // maskBy: { part, hull: [els], extra?: [[x, y]], out?: true } — the part is hidden (out) or shown only (not out) inside the
        // silhouette of another part: the convex hull of the elements' points, following that part. Occlusion by a rigid part, no fill.
        // poly: [[x, y], ...] instead of hull — a traced (concave) silhouette, where the convex hull would eat a neighbour (boot and ankle).
        if (!layers[mb.part]) throw new Error(`${o}: maskBy — no part ${mb.part}`);
        if (mb.lines) {
          // lines: [{ from, to, via? }] — a tight mask on the part's own drawn lines (the Figma way): a pen stroke along each line's
          // centre, its width, round ends where the line is cut. fill: true — plus the limb's inside, closed by a straight chord between
          // the ends (the limb covers what is behind it); without fill only the lines are cut. trim: { s, e } — keys in % of each line:
          // the ends slide along it (the line grows or shrinks as the limb moves).
          const lines = mb.lines.map((ln) => centerline(full.map((i) => els[i]), ln));
          layers[o].clipped = true;
          layers[o].clipOut = !!mb.out;
          order.push({ ...layers[mb.part], name: `${o}_MATTE`, els: [], matteEls: null, matteLine: { lines, fill: !!mb.fill, pad: mb.pad ?? 3, trim: mb.trim, add: mb.add || [] }, backfill: undefined, shapeKeys: undefined, clipped: false });
          break masks; // no clipBy and no caps: the line mask has its own round ends
        }
        const pts = [...(mb.extra || [])];
        for (const i of mb.hull || []) for (const pa of els[i].paths) pts.push(...pa.v.map((q) => [q[0], q[1]]));
        if (pts.length < 3 && !mb.poly) throw new Error(`${o}: maskBy — hull has fewer than three points`);
        const cross = (a, b, c) => (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
        const s = [...pts].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
        const lo = []; for (const q of s) { while (lo.length > 1 && cross(lo[lo.length - 2], lo[lo.length - 1], q) <= 0) lo.pop(); lo.push(q); }
        const up = []; for (const q of [...s].reverse()) { while (up.length > 1 && cross(up[up.length - 2], up[up.length - 1], q) <= 0) up.pop(); up.push(q); }
        const hull = mb.poly || [...lo.slice(0, -1), ...up.slice(0, -1)];
        if (hull.length < 3) throw new Error(`${o}: maskBy — poly has fewer than three points`);
        layers[o].clipped = true;
        layers[o].clipOut = !!mb.out;
        order.push({ ...layers[mb.part], name: `${o}_MATTE`, els: [], matteEls: null, matteShape: hull, backfill: undefined, shapeKeys: undefined, clipped: false });
        // a part cut by its own mask (a limb sawn off): every line the cut crosses gets a round pen end, so no stubs or slivers
        if (mb.part === o && mb.caps !== false) {
          // capSkip: [[x, y, r]] — no cap there (a T-junction: the cut line ends right at another line of this part)
          const caps = cutCaps(full.map((i) => els[i]), hull).filter((c) => !(mb.capSkip || []).some(([x, y, r]) => Math.hypot(c.paths[0].v[2][0] + c.r - x, c.paths[0].v[2][1] - y) < r));
          if (caps.length) order.push({ name: `${o}_CAPS`, els: [], capEls: caps, pivot: layers[o].pivot, parent: o });
        }
      }
      const cb = parts[o].clipBy;
      if (cb) {
        if (!layers[cb]) throw new Error(`${o}: clipBy — no part ${cb}`);
        layers[o].clipped = true;
        order.push({ ...layers[cb], name: `${o}_MATTE`, els: [], matteEls: fullEls[cb], clipped: false });
      }
      }
    }
    run.els.push(i);
  }

  const inner = buildLottie({ w, h, fr, op, els, layers: order, name: scene.name });
  return {
    lottie: rotateLoop(inner, start),
    inner,
    model: { scene, svgFile, src, w, h, fr, op, els, parts, jumps, linearOk, keyFrame: (op - start) % op, warnings, seams: cuts.seams },
  };
}

// Parts in a pinned chain (own pin, or a parent / rig with one) are baked into shape keys: every point goes through
// its own bend and transform, then each ancestor's transform, and each pinned step is blended with identity by the
// distance to its pin (the cut edge stands, motion grows over `feather` px). The layer keeps its rigid transform for
// the checks; the baked shape is that transform undone, so lottie draws exactly the pinned result.
const FEATHER = 150;
function bakePinned(p, parts, layers, els, op) {
  const up = (q) => (q.attach ? parts[q.attach.part] : q.parent ? parts[q.parent] : null);
  const chain = [];
  for (let q = p; q; q = up(q)) chain.push(q);
  const st = (k) => ({ a: 0, k });
  const local = (q, t) => {
    const L = layers[q.name], pv = [...q.pivot, 0];
    return localMatrix({ p: L.p || st(pv), a: st(pv), s: L.s || st([100, 100, 100]), r: L.r || st(0) }, t);
  };
  const wOf = new Map(chain.filter((q) => q.pin).map((q) => [q, pinWeight({ feather: FEATHER, ...q.pin })]));
  const maps = [];
  const mapAt = (t) => {
    if (maps[t]) return maps[t];
    const steps = [];
    let W = [1, 0, 0, 1, 0, 0];
    chain.forEach((q, n) => {
      const M = local(q, t);
      W = mul(M, W);
      let f = (x) => apply(M, x);
      if (n === 0 && q.bones && q.bendProp) {
        const J = q.bones.joints, P = pose(J, valueAt(q.bendProp, t));
        f = (x) => apply(M, deformPoint(x, weights(x, J), J, P));
      }
      steps.push(q.pin ? pinned(f, wOf.get(q)) : f);
    });
    const back = invert(W);
    return (maps[t] = (x) => apply(back, steps.reduce((y, f) => f(y), x)));
  };
  p.mapAt = mapAt;
  const keys = {};
  for (const i of p.els) {
    const ks = bakeMap(els[i].paths, mapAt, op);
    const rest = els[i].paths;
    const moved = ks.some((kf) => kf.paths.some((sp, j) => sp.v.some((v, k) => Math.abs(v[0] - rest[j].v[k][0]) > 1e-3 || Math.abs(v[1] - rest[j].v[k][1]) > 1e-3)));
    if (moved) keys[i] = ks;
  }
  if (Object.keys(keys).length) {
    p.shapeKeys = keys;
    layers[p.name].shapeKeys = keys;
  }
}

// The scene is authored from the key pose (= SVG) at frame 0. The output loop may start at any phase:
// the animation becomes a precomp played twice, [start, op) then [0, start).
function rotateLoop(inner, start) {
  if (!start) return inner;
  const { w, h, op, fr } = inner;
  const st = (k) => ({ a: 0, k });
  const ks = { o: st(100), r: st(0), p: st([w / 2, h / 2, 0]), a: st([w / 2, h / 2, 0]), s: st([100, 100, 100]) };
  const ref = (ind, stT, ip, opT) => ({ ddd: 0, ind, ty: 0, nm: `loop ${ind}`, refId: 'loop', sr: 1, ks, ao: 0, w, h, ip, op: opT, st: stT, bm: 0 });
  return {
    v: inner.v, fr, ip: 0, op, w, h, nm: inner.nm, ddd: 0,
    assets: [{ id: 'loop', layers: inner.layers }],
    layers: [ref(1, -start, 0, op - start), ref(2, op - start, op - start, op)],
  };
}

module.exports = { compileScene, mergeProp, rotateLoop, centerline };
