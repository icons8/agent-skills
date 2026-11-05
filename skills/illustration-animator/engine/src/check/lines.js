// The lines of the drawing at the pixel level: does a line break, does a moving part run over a foreign line.
// The vector checks (tear, exposed, overlap) look at declared seams and outlines; this one looks at what is drawn.
// Every frame is drawn twice by Skia (Skottie, no browser): the scene as it is, and the same scene with every part flat-filled in
// its own colour — the second one says which part owns each pixel, the first one which pixels are ink (dark, or thin like a stroke).
// The ink of a part is what is visible of it, so a line hidden under another part's fill does not count.
//   break — at rest a line of part H ends at a line of part G (H stops where G's outline starts: the artist cut it there).
//           The end is carried with H, the line with G. When they come apart the end hangs free in the air: `gap` px.
//           An end that only goes under a fill of some part is not a gap (occlusion, the drawing is meant to look so).
//   cross — the ink of two parts touches where it did not touch at rest, away from every rest contact carried by the parts:
//           a moving line runs over a line of another part.
const path = require('path');
const { req, resolve } = require('../setup/deps');
const { worldMatrix, apply } = require('../lottie/evaluate');
const { valueAt } = require('../lottie/keys');

const SCALE = 0.5;     // the masks are drawn at half the canvas
const MAX_GROUPS = 62; // owner colour: three channels with unrelated steps, so an anti-aliased edge between two parts matches no third
const LIMITS = {
  contact: 2,          // mask px: ink within this reach of another part's ink is a contact
  minContact: 4,       // mask px of a contact worth following
  window: 16,          // mask px: radius in which the arms of a line are counted
  arm: 10,             // mask px: a stretch of line shorter than this is not an arm
  gap: 14,             // canvas px the end of a line may come off the line it stopped at (error above)
  known: 14,           // mask px: a contact this close to a carried rest contact is the same contact
  crossArea: 12,       // mask px of a new contact worth reporting
  step: 3,             // frames
};

const groupOf = (nm) => (/^STATIC_/.test(nm) ? 'STATIC' : nm.replace(/_MATTE$|_CAPS$/, '').replace(/·\d+$/, ''));

// ---- masks ----
function sat(m, W, H) {
  const s = new Int32Array((W + 1) * (H + 1));
  for (let y = 0; y < H; y++) {
    let r = 0;
    for (let x = 0; x < W; x++) { r += m[y * W + x]; s[(y + 1) * (W + 1) + x + 1] = s[y * (W + 1) + x + 1] + r; }
  }
  return s;
}
function boxSum(s, W, H, x, y, r) {
  const x0 = Math.max(0, x - r), y0 = Math.max(0, y - r), x1 = Math.min(W, x + r + 1), y1 = Math.min(H, y + r + 1);
  return s[y1 * (W + 1) + x1] - s[y0 * (W + 1) + x1] - s[y1 * (W + 1) + x0] + s[y0 * (W + 1) + x0];
}
function dilate(m, W, H, r) {
  const s = sat(m, W, H), o = new Uint8Array(W * H);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) o[y * W + x] = boxSum(s, W, H, x, y, r) > 0 ? 1 : 0;
  return o;
}
function erode(m, W, H, r) {
  const s = sat(m, W, H), o = new Uint8Array(W * H), full = (2 * r + 1) * (2 * r + 1);
  for (let y = r; y < H - r; y++) for (let x = r; x < W - r; x++) o[y * W + x] = boxSum(s, W, H, x, y, r) === full ? 1 : 0;
  return o;
}

// 8-connected components of a mask: [{n, cx, cy, px: [i...]}]
function components(m, W, H, minN = 1) {
  const seen = new Uint8Array(W * H), out = [];
  const stack = [];
  for (let i0 = 0; i0 < W * H; i0++) {
    if (!m[i0] || seen[i0]) continue;
    const px = [];
    stack.push(i0); seen[i0] = 1;
    while (stack.length) {
      const i = stack.pop(); px.push(i);
      const x = i % W, y = (i - x) / W;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        const xx = x + dx, yy = y + dy;
        if (xx < 0 || yy < 0 || xx >= W || yy >= H) continue;
        const j = yy * W + xx;
        if (m[j] && !seen[j]) { seen[j] = 1; stack.push(j); }
      }
    }
    if (px.length < minN) continue;
    let sx = 0, sy = 0;
    for (const i of px) { sx += i % W; sy += Math.floor(i / W); }
    out.push({ n: px.length, cx: sx / px.length, cy: sy / px.length, px });
  }
  return out;
}

const code = (id) => [id * 4, (id * 37) % 251 + 2, (id * 91) % 247 + 4];

// ---- the two drawings ----
// every fill and stroke of a part becomes the flat colour of its number; a matte keeps its own (a matte reads alpha)
function ownerLottie(inner, groups) {
  const d = JSON.parse(JSON.stringify(inner));
  const flat = (items, col) => {
    for (let k = 0; k < items.length; k++) {
      const it = items[k];
      if (it.ty === 'gr') flat(it.it, col);
      else if (it.ty === 'fl') it.c = { a: 0, k: col };
      else if (it.ty === 'st') it.c = { a: 0, k: col };
      else if (it.ty === 'gf') items[k] = { ty: 'fl', nm: it.nm, c: { a: 0, k: col }, o: it.o || { a: 0, k: 100 }, r: it.r || 1 };
      else if (it.ty === 'gs') items[k] = { ty: 'st', nm: it.nm, c: { a: 0, k: col }, o: it.o || { a: 0, k: 100 }, w: it.w, lc: it.lc || 2, lj: it.lj || 2, ml: it.ml || 4 };
    }
  };
  for (const L of d.layers) {
    if (L.td || !L.shapes) continue;
    const id = groups.indexOf(groupOf(L.nm)) + 1;
    flat(L.shapes, [...code(id).map((v) => v / 255), 1]);
  }
  return d;
}

async function canvasKit() {
  const js = resolve('canvaskit-wasm/full');
  return req('canvaskit-wasm/full')({ locateFile: (f) => path.join(path.dirname(js), f) });
}

// owner (0 = none, 1.. = group number, -1 = an edge pixel of two parts) and `dark` of one frame
function readFrame(CK, surf, anim, W, H, f) {
  const c = surf.getCanvas();
  c.clear(CK.TRANSPARENT);
  anim.seekFrame(f);
  anim.render(c, CK.LTRBRect(0, 0, W, H));
  surf.flush();
  return c.readPixels(0, 0, { width: W, height: H, colorType: CK.ColorType.RGBA_8888, alphaType: CK.AlphaType.Unpremul, colorSpace: CK.ColorSpace.SRGB });
}

function decode(real, own, W, H) {
  const owner = new Int16Array(W * H), dark = new Uint8Array(W * H);
  for (let i = 0; i < W * H; i++) {
    if (real[i * 4 + 3] > 128 && real[i * 4] * 0.3 + real[i * 4 + 1] * 0.59 + real[i * 4 + 2] * 0.11 < 110) dark[i] = 1;
    if (own[i * 4 + 3] < 128) continue;
    const id = Math.round(own[i * 4] / 4), c = code(id);
    owner[i] = id > 0 && id <= MAX_GROUPS && Math.abs(own[i * 4] - c[0]) <= 1 && Math.abs(own[i * 4 + 1] - c[1]) <= 1 && Math.abs(own[i * 4 + 2] - c[2]) <= 1 ? id : -1;
  }
  return { owner, dark };
}

// the ink of every part: its visible pixels that are dark or thin (what is left of the mask when the opening takes the fills away)
function inkOf(owner, dark, n, W, H) {
  const out = [];
  for (let g = 1; g <= n; g++) {
    const ink = new Uint8Array(W * H);
    let any = 0;
    for (let i = 0; i < W * H; i++) if (owner[i] === g && dark[i]) { ink[i] = 1; any++; }
    out.push(any ? ink : null);
  }
  return out;
}

// ---- contacts at rest ----
function contactsOf(ink, groups, W, H) {
  const dil = ink.map((m) => (m ? dilate(m, W, H, LIMITS.contact) : null));
  const out = [];
  for (let a = 0; a < groups.length; a++) {
    if (!ink[a]) continue;
    for (let b = a + 1; b < groups.length; b++) {
      if (!ink[b]) continue;
      const m = new Uint8Array(W * H);
      let any = 0;
      for (let i = 0; i < W * H; i++) if ((ink[a][i] && dil[b][i]) || (ink[b][i] && dil[a][i])) { m[i] = 1; any++; }
      if (!any) continue;
      for (const c of components(m, W, H, LIMITS.minContact)) out.push({ a, b, ...c, px: undefined, size: c.n });
    }
  }
  return { list: out, dil };
}

// arms of `side`'s line around the contact: stretches of its ink that leave the contact and reach the edge of the window
function arms(ink, other, c, W, H) {
  const Rw = LIMITS.window, x0 = Math.round(c.cx), y0 = Math.round(c.cy);
  const cut = dilate(other, W, H, LIMITS.contact + 1);
  const m = new Uint8Array(W * H);
  for (let y = Math.max(0, y0 - Rw); y <= Math.min(H - 1, y0 + Rw); y++) {
    for (let x = Math.max(0, x0 - Rw); x <= Math.min(W - 1, x0 + Rw); x++) {
      const i = y * W + x;
      if (ink[i] && !cut[i] && Math.hypot(x - x0, y - y0) <= Rw) m[i] = 1;
    }
  }
  let k = 0;
  for (const comp of components(m, W, H, LIMITS.arm)) {
    if (comp.px.some((i) => Math.hypot((i % W) - x0, Math.floor(i / W) - y0) >= Rw - 3)) k++;
  }
  return k;
}

// arms of a line around a point: the ink of one part with a small disc cut out at the point
function armsAt(ink, x, y, W, H) {
  const Rw = LIMITS.window, x0 = Math.round(x), y0 = Math.round(y), Rc = LIMITS.contact + 2;
  const m = new Uint8Array(W * H);
  for (let yy = Math.max(0, y0 - Rw); yy <= Math.min(H - 1, y0 + Rw); yy++) {
    for (let xx = Math.max(0, x0 - Rw); xx <= Math.min(W - 1, x0 + Rw); xx++) {
      const d = Math.hypot(xx - x0, yy - y0);
      if (ink[yy * W + xx] && d > Rc && d <= Rw) m[yy * W + xx] = 1;
    }
  }
  let k = 0;
  for (const comp of components(m, W, H, LIMITS.arm)) {
    if (comp.px.some((i) => Math.hypot((i % W) - x0, Math.floor(i / W) - y0) >= Rw - 3)) k++;
  }
  return k;
}

function nearest(ink, W, H, x, y, maxR) {
  if (!ink) return Infinity;
  let best = Infinity;
  const xi = Math.round(x), yi = Math.round(y);
  for (let dy = -maxR; dy <= maxR; dy++) {
    const yy = yi + dy;
    if (yy < 0 || yy >= H) continue;
    for (let dx = -maxR; dx <= maxR; dx++) {
      const xx = xi + dx;
      if (xx < 0 || xx >= W) continue;
      if (ink[yy * W + xx]) { const d = Math.hypot(dx, dy); if (d < best) best = d; }
    }
  }
  return best;
}

// distance from a point to the nearest ink that does not belong to part h (any other part)
function nearestForeign(owner, ink, h, W, H, x, y, maxR) {
  let best = Infinity;
  const xi = Math.round(x), yi = Math.round(y);
  for (let dy = -maxR; dy <= maxR; dy++) {
    const yy = yi + dy;
    if (yy < 0 || yy >= H) continue;
    for (let dx = -maxR; dx <= maxR; dx++) {
      const xx = xi + dx;
      if (xx < 0 || xx >= W) continue;
      const i = yy * W + xx, g = owner[i] - 1;
      if (g >= 0 && g !== h && ink[g] && ink[g][i]) { const d = Math.hypot(dx, dy); if (d < best) best = d; }
    }
  }
  return best;
}

// where a rest point of a group is at frame t (canvas px)
function carried(lottie, model, group, pt, t) {
  if (group === 'STATIC' || !model.parts[group]) return pt;
  const { pointOf } = require('./lint');
  return pointOf(lottie, model, group, pt, t);
}

// Measure everything: {breaks: [{part, other, frame, gap, at}], crosses: [{a, b, frame, area, at}], contacts, terminals}
async function measureLines(inner, model, opt = {}) {
  const CK = await canvasKit();
  const groups = [...new Set(inner.layers.map((l) => groupOf(l.nm)))];
  if (groups.length > MAX_GROUPS) return { skipped: `${groups.length} parts` };
  const W = Math.round(inner.w * SCALE), H = Math.round(inner.h * SCALE), k = 1 / SCALE;
  const real = CK.MakeManagedAnimation(JSON.stringify(inner), {});
  const own = CK.MakeManagedAnimation(JSON.stringify(ownerLottie(inner, groups)), {});
  if (!real || !own) return { skipped: 'Skottie could not parse the Lottie' };
  const surf = CK.MakeSurface(W, H);
  const snap = (f) => {
    const { owner, dark } = decode(readFrame(CK, surf, real, W, H, f), readFrame(CK, surf, own, W, H, f), W, H);
    return { owner, ink: inkOf(owner, dark, groups.length, W, H) };
  };
  // parts cut out of one SVG element share its outline: a seam of the cut runs between them
  const srcOf = (name) => new Set(((model.parts[name] || {}).els || []).map((i) => String((model.els[i] || {}).from || i).split(':')[0]));
  const shared = (a, b) => { const A = srcOf(a); return [...srcOf(b)].some((x) => A.has(x)); };
  const out = { breaks: [], crosses: [], contacts: 0, terminals: 0, groups };
  try {
    const f0 = snap(0);
    const { list: contacts } = contactsOf(f0.ink, groups, W, H);
    out.contacts = contacts.length;
    // a terminal: the line of one side ends at the contact (one arm) — the other side is what it stopped at
    const terminals = [];
    for (const c of contacts) {
      for (const [h, g] of [[c.a, c.b], [c.b, c.a]]) {
        if (arms(f0.ink[h], f0.ink[g], c, W, H) === 1) terminals.push({ h, g, c, at: [c.cx * k, c.cy * k], d0: nearestForeign(f0.owner, f0.ink, h, W, H, c.cx, c.cy, 30) * k });
      }
    }
    out.terminals = terminals.length;
    const step = opt.step || LIMITS.step;
    const worst = new Map();
    const newest = new Map();
    for (let t = step; t < model.op; t += step) {
      const s = snap(t);
      for (const T of terminals) {
        const hn = groups[T.h], gn = groups[T.g];
        const q = carried(inner, model, hn, T.at, t).map((v) => v / k);
        if (q[0] < 0 || q[1] < 0 || q[0] >= W || q[1] >= H) continue;
        const own0 = s.owner[Math.round(q[1]) * W + Math.round(q[0])];
        if (own0 > 0 && own0 !== T.h + 1) continue; // under another part: occlusion
        if (!s.ink[T.h] || nearest(s.ink[T.h], W, H, q[0], q[1], 6) === Infinity) continue; // the line itself is not there
        if (armsAt(s.ink[T.h], q[0], q[1], W, H) !== 1) continue; // the line goes on past the point: not an end
        const d = nearestForeign(s.owner, s.ink, T.h, W, H, q[0], q[1], 40) * k;
        const gap = Math.min(d, 40 * k) - Math.min(T.d0, 40 * k);
        const spot = `${hn}>${gn}@${Math.round(T.at[0])},${Math.round(T.at[1])}`;
        if (!worst.has(spot) || worst.get(spot).gap < gap) worst.set(spot, { part: hn, other: gn, seam: shared(hn, gn), frame: t, gap, rest: [Math.round(T.at[0]), Math.round(T.at[1])], at: [Math.round(q[0] * k), Math.round(q[1] * k)] });
      }
      // new contacts: the pairs that touch at frame t away from every rest contact carried by the parts
      const { list } = contactsOf(s.ink, groups, W, H);
      for (const c of list) {
        const rest = contacts.filter((r) => r.a === c.a && r.b === c.b);
        const known = rest.some((r) => {
          const pa = carried(inner, model, groups[c.a], [r.cx * k, r.cy * k], t), pb = carried(inner, model, groups[c.b], [r.cx * k, r.cy * k], t);
          return [pa, pb].some((p) => Math.hypot(p[0] / k - c.cx, p[1] / k - c.cy) <= LIMITS.known);
        });
        if (known || c.size < LIMITS.crossArea) continue;
        const spot = `${groups[c.a]}|${groups[c.b]}`;
        const prev = newest.get(spot);
        if (!prev || prev.area < c.size) newest.set(spot, { a: groups[c.a], b: groups[c.b], seam: shared(groups[c.a], groups[c.b]), frame: t, area: c.size, at: [Math.round(c.cx * k), Math.round(c.cy * k)] });
      }
    }
    out.breaks = [...worst.values()];
    out.crosses = [...newest.values()];
  } finally {
    surf.delete();
    real.delete();
    own.delete();
  }
  return out;
}


// ---- hairlines on the seam of a cut ----
// A cut line must not show: where the pieces of one element are carried apart or turned, the edge of one piece can draw a thin
// straight line (or a dash) that the drawing does not have at rest. Thin ink = dark pixels the opening of the dark mask removes.
// Counted near the seam as carried by each side; the rise over frame 0 is the `hair`.
const SEAM = { reach: 3, thin: 2, minHair: 14, step: 3 };
async function measureSeams(inner, model, opt = {}) {
  const seams = (model.seams || []).filter((s) => s.pts && s.pts.length > 1 && s.samples && s.samples.length);
  const out = { hairs: [] };
  if (!seams.length) return out;
  const CK = await canvasKit();
  const W = Math.round(inner.w * SCALE), H = Math.round(inner.h * SCALE), k = 1 / SCALE;
  const real = CK.MakeManagedAnimation(JSON.stringify(inner), {});
  if (!real) return { hairs: [], skipped: 'Skottie could not parse the Lottie' };
  const surf = CK.MakeSurface(W, H);
  const owner = new Map();
  for (const p of Object.values(model.parts)) for (const i of p.els) owner.set(model.els[i].from, p.name);
  const sides = seams.map((s) => {
    const names = new Set();
    for (const sm of s.samples) { names.add(owner.get(`${sm.el}:${s.name}`) || 'STATIC'); names.add(owner.get(`${sm.el}:${sm.side}`) || 'STATIC'); }
    return [...names];
  });
  const near = (mask, polys) => {
    let n = 0;
    const seen = new Uint8Array(W * H);
    for (const poly of polys) {
      for (let a = 0; a + 1 < poly.length; a++) {
        const [x0, y0] = poly[a], [x1, y1] = poly[a + 1];
        const steps = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0)));
        for (let q = 0; q <= steps; q++) {
          const cx = Math.round(x0 + (x1 - x0) * q / steps), cy = Math.round(y0 + (y1 - y0) * q / steps);
          for (let dy = -SEAM.reach; dy <= SEAM.reach; dy++) for (let dx = -SEAM.reach; dx <= SEAM.reach; dx++) {
            const x = cx + dx, y = cy + dy;
            if (x < 0 || y < 0 || x >= W || y >= H) continue;
            const i = y * W + x;
            if (mask[i] && !seen[i]) { seen[i] = 1; n++; }
          }
        }
      }
    }
    return n;
  };
  const thinOf = (frame) => {
    const dark = new Uint8Array(W * H);
    for (let i = 0; i < W * H; i++) if (frame[i * 4 + 3] > 128 && frame[i * 4] * 0.3 + frame[i * 4 + 1] * 0.59 + frame[i * 4 + 2] * 0.11 < 110) dark[i] = 1;
    const open = dilate(erode(dark, W, H, SEAM.thin), W, H, SEAM.thin);
    const thin = new Uint8Array(W * H);
    for (let i = 0; i < W * H; i++) if (dark[i] && !open[i]) thin[i] = 1;
    return thin;
  };
  const polysAt = (si, t) => sides[si].map((nm) => seams[si].pts.map((p) => carried(inner, model, nm, p, t).map((v) => v / k)));
  try {
    const base = thinOf(readFrame(CK, surf, real, W, H, 0));
    const n0 = seams.map((_, si) => near(base, polysAt(si, 0)));
    const step = opt.step || SEAM.step;
    const worst = new Map();
    for (let t = step; t < model.op; t += step) {
      const thin = thinOf(readFrame(CK, surf, real, W, H, t));
      seams.forEach((s, si) => {
        const d = near(thin, polysAt(si, t)) - n0[si];
        if (d >= SEAM.minHair && (!worst.has(s.name) || worst.get(s.name).hair < d)) {
          const q = polysAt(si, t)[0][0];
          worst.set(s.name, { cut: s.name, frame: t, hair: d, at: [Math.round(q[0] * k), Math.round(q[1] * k)] });
        }
      });
    }
    out.hairs = [...worst.values()];
  } finally { surf.delete(); real.delete(); }
  return out;
}

// ---- what the gate and the looker get ----
// error: a cut line that shows (`hair`). Quiet on the approved scenes, which have no cut line that runs along a stroke.
async function checkHair(inner, model) {
  const r = await measureSeams(inner, model);
  return r.hairs.map((h) => ({ check: 'hair', part: h.cut, frame: h.frame, at: h.at, detail: `the line of cut ${h.cut} shows as a thin dark line of ${h.hair} px around (${h.at.join(', ')}) that the drawing does not have at rest — move the cut line across the strokes instead of along them` }));
}

// warnings for the eye: where the end of a line has come off the lines it stopped at (GAP px more than at rest) and
// where the lines of two parts meet that did not touch at rest. A moving part slides by design too (an orbit, a lens), so this
// is a list of places to look at, never a fault. At most MAX_PLACES, the worst first.
const PLACES = { gap: 20, area: 40, max: 8, panel: 200, zoom: 1.5 };
async function linePlaces(inner, model, opt = {}) {
  const r = await measureLines(inner, model, opt);
  if (r.skipped) return { places: [], skipped: r.skipped };
  const list = [];
  for (const b of r.breaks) if (b.gap >= PLACES.gap) list.push({ kind: 'lineend', part: b.part, other: b.other, frame: b.frame, at: b.at, rest: b.rest, size: b.gap });
  for (const c of r.crosses) if (c.area >= PLACES.area) list.push({ kind: 'lineover', part: c.a, other: c.b, frame: c.frame, at: c.at, rest: c.at, size: c.area });
  list.sort((a, b) => (a.kind === b.kind ? b.size - a.size : a.kind === 'lineend' ? -1 : 1));
  const places = [];
  for (const p of list) {
    if (places.some((q) => q.frame === p.frame && Math.hypot(q.at[0] - p.at[0], q.at[1] - p.at[1]) < PLACES.panel / 2)) continue;
    places.push(p);
    if (places.length >= PLACES.max) break;
  }
  return { places };
}

// one picture: a row per place, the rest frame and the frame of the place side by side, PANEL canvas px square, zoomed
async function placesSheet(inner, places, file) {
  const CK = await canvasKit();
  const anim = CK.MakeManagedAnimation(JSON.stringify(inner), {});
  if (!anim || !places.length) return null;
  const P = Math.round(PLACES.panel * PLACES.zoom);
  const surf = CK.MakeSurface(P * 2 + 6, (P + 6) * places.length);
  const c = surf.getCanvas();
  c.clear(CK.WHITE);
  const paint = new CK.Paint();
  paint.setColor(CK.Color(220, 60, 60, 1));
  places.forEach((p, row) => {
    [[0, p.rest || p.at], [p.frame, p.at]].forEach(([f, at], col) => {
      c.save();
      c.translate(col * (P + 6), row * (P + 6));
      c.clipRect(CK.LTRBRect(0, 0, P, P), CK.ClipOp.Intersect, false);
      c.scale(PLACES.zoom, PLACES.zoom);
      c.translate(-(at[0] - PLACES.panel / 2), -(at[1] - PLACES.panel / 2));
      anim.seekFrame(f);
      anim.render(c, CK.LTRBRect(0, 0, inner.w, inner.h));
      c.restore();
    });
    c.drawRect(CK.LTRBRect(P, row * (P + 6), P + 6, (row + 1) * (P + 6)), paint);
  });
  surf.flush();
  require('fs').writeFileSync(file, Buffer.from(surf.makeImageSnapshot().encodeToBytes()));
  paint.delete();
  surf.delete();
  anim.delete();
  return file;
}

function placesText(places) {
  return [
    '# Places to look at',
    'Row n of places.png: left — the drawing at rest (frame 0) around the place, right — the same place at the frame named below. Lines of the drawing must stay whole there.',
    ...places.map((p, k) => `${k + 1}. ${p.kind === 'lineend' ? `the end of a line of ${p.part} is ${Math.round(p.size)} px further from ${p.other}` : `lines of ${p.part} and ${p.other} meet that did not touch at rest`} — frame ${p.frame}, around (${p.at.join(', ')})`),
    '',
  ].join(String.fromCharCode(10));
}

// places.png + places.md of a scene into the folder `out` (the sheets of the verify step and of the judge)
async function writePlaces(inner, model, out) {
  const { places, skipped } = await linePlaces(inner, model);
  require('fs').rmSync(path.join(out, 'places.png'), { force: true });
  if (places.length) {
    await placesSheet(inner, places, path.join(out, 'places.png'));
    require('fs').writeFileSync(path.join(out, 'places.md'), placesText(places));
  } else require('fs').writeFileSync(path.join(out, 'places.md'), (skipped ? `Line places not measured: ${skipped}.` : 'No places to look at: no line end came off the lines it stopped at, no new meetings of lines.') + String.fromCharCode(10));
  return places;
}

module.exports = { writePlaces, measureLines, measureSeams, checkHair, linePlaces, placesSheet, placesText, LIMITS, SEAM, PLACES, groupOf };
