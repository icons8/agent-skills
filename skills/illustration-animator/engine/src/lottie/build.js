const { anim } = require('./keys');
const r2 = (n) => Math.round(n * 100) / 100;
const st = (k) => ({ a: 0, k });
const shape = (p) => ({ c: p.c, v: p.v.map((q) => q.map(r2)), i: p.i.map((q) => q.map(r2)), o: p.o.map((q) => q.map(r2)) });
const LIN = { o: { x: [0], y: [0] }, i: { x: [1], y: [1] } };
const TR0 = { ty: 'tr', p: st([0, 0]), a: st([0, 0]), s: st([100, 100]), r: st(0), o: st(100), sk: st(0), sa: st(0) };

// maskBy.lines: one group per line — its centre path, trim (the ends slide along it), fill closed by the chord (variant A), a round pen
// stroke of the line's width (Lottie and AE close a trimmed open path with a straight line when filling it)
function matteLineShapes(M) {
  return M.lines.map((ln, k) => ({
    nm: 'matte', ty: 'gr',
    it: [
      { ty: 'sh', ks: st({ c: false, v: ln.pts.map((q) => q.map(r2)), i: ln.pts.map(() => [0, 0]), o: ln.pts.map(() => [0, 0]) }) },
      { ty: 'tm', s: M.trim && M.trim[k] && M.trim[k].s ? anim(M.trim[k].s) : st(0), e: M.trim && M.trim[k] && M.trim[k].e ? anim(M.trim[k].e) : st(100), o: st(0), m: 1 },
      ...(M.fill ? [{ ty: 'fl', c: st([1, 1, 1, 1]), o: st(100), r: 1 }] : []),
      { ty: 'st', c: st([1, 1, 1, 1]), o: st(100), w: st(r2(ln.w + M.pad)), lc: 2, lj: 2 },
      TR0,
    ],
  })).concat((M.add || []).map((pl) => ({
    // add: solid blobs on a line (a filled shoe) the pen can't cover — plain filled polygons in the same matte
    nm: 'matte', ty: 'gr',
    it: [{ ty: 'sh', ks: st({ c: true, v: pl.map((q) => q.map(r2)), i: pl.map(() => [0, 0]), o: pl.map(() => [0, 0]) }) }, { ty: 'fl', c: st([1, 1, 1, 1]), o: st(100), r: 1 }, TR0],
  })));
}

function shapeGroup(el, keys) {
  const sh = el.paths.map((p, j) => ({
    ty: 'sh',
    ks: keys
      ? { a: 1, k: keys.map((kf, n) => ({ t: kf.t, s: [shape(kf.paths[j])], ...(n < keys.length - 1 ? LIN : {}) })) }
      : st(shape(p)),
  }));
  const op = st(r2(el.opacity * 100));
  const fill = el.grad
    ? {
      ty: 'gf', o: op, r: el.rule, t: el.grad.radial ? 2 : 1,
      s: st(el.grad.s.map(r2)), e: st(el.grad.e.map(r2)), h: st(0), a: st(0),
      g: { p: el.grad.stops.length, k: st(el.grad.stops.flat().map((v) => Math.round(v * 1000) / 1000)) },
    }
    : { ty: 'fl', c: st([...el.color.map(r2), 1]), o: op, r: el.rule };
  return {
    ty: 'gr',
    it: [...sh, fill, { ty: 'tr', p: st([0, 0]), a: st([0, 0]), s: st([100, 100]), r: st(0), o: st(100), sk: st(0), sa: st(0) }],
  };
}

function checkLayers(layers) {
  const byName = new Map();
  for (const l of layers) {
    if (byName.has(l.name)) throw new Error(`Two layers named ${l.name}`);
    byName.set(l.name, l);
  }
  for (const l of layers) {
    if (l.parent && !byName.has(l.parent)) throw new Error(`Layer ${l.name}: parent ${l.parent} not found`);
  }
  for (const l of layers) {
    const path = [l.name];
    for (let p = l.parent; p; p = byName.get(p).parent) {
      path.push(p);
      if (p === l.name) throw new Error(`Parent cycle: ${path.join(' → ')}`);
      if (path.indexOf(p) !== path.length - 1) break; // cycle not through l: reported from its own member
    }
  }
}

function buildLottie({ w, h, fr, op, els, layers, name = 'anim' }) {
  checkLayers(layers);
  // layers come in paint order (bottom first) and are written top first; ind follows the written order
  // (1 = top, as AE exports it): players that stack layers by ind must get the same order as by array
  const ind = Object.fromEntries(layers.map((l, i) => [l.name, layers.length - i]));
  const out = layers.map((L) => {
    const pv = [...L.pivot.map(r2), 0];
    // backfill: background-coloured silhouettes under the part's own lines (hide what crosses behind it); bottom of the layer
    const fills = (L.backfill || []).map((b, k) => ({ nm: 'backfill', ...shapeGroup({ paths: b.paths, color: b.color, opacity: 1, rule: 1 }, L.backfillKeys && L.backfillKeys[k]) }));
    const layer = {
      ddd: 0, ind: ind[L.name], ty: 4, nm: L.name, sr: 1,
      ks: { o: L.o || st(100), r: L.r || st(0), p: L.p || st(pv), a: st(pv), s: L.s || st([100, 100, 100]) },
      ao: 0,
      shapes: L.matteLine ? matteLineShapes(L.matteLine) : L.capEls ? L.capEls.map((e) => ({ nm: 'cap', ...shapeGroup(e) })) : L.matteShape ? [{ nm: 'matte', ty: 'gr', it: [{ ty: 'sh', ks: st({ c: true, v: L.matteShape.map((q) => q.map(r2)), i: L.matteShape.map(() => [0, 0]), o: L.matteShape.map(() => [0, 0]) }) }, { ty: 'fl', c: st([1, 1, 1, 1]), o: st(100), r: 1 }, { ty: 'tr', p: st([0, 0]), a: st([0, 0]), s: st([100, 100]), r: st(0), o: st(100), sk: st(0), sa: st(0) }] }] : [...(L.matteEls || L.els).map((i) => ({ ...(L.matteEls ? { nm: 'matte' } : {}), ...shapeGroup(els[i], L.shapeKeys && L.shapeKeys[i]) })).reverse(), ...fills.reverse()],
      ip: 0, op, st: 0, bm: 0,
    };
    // clipBy: alpha track matte — the matte source (td) is the layer directly above the clipped one (tt)
    if (L.clipped) layer.tt = L.clipOut ? 2 : 1;
    if (L.matteEls || L.matteShape || L.matteLine) layer.td = 1;
    if (L.parent) layer.parent = ind[L.parent];
    return layer;
  });
  return { v: '5.7.4', fr, ip: 0, op, w, h, nm: name, ddd: 0, assets: [], layers: out.reverse() };
}

module.exports = { buildLottie, shapeGroup };
