// The fallback after the attempt limit: a fused part moves whole. The named cuts are removed from the scene, the pieces
// return into their elements, the parts that held only pieces disappear and their motion goes to the part that holds what
// is left of those elements (position, scale, rotation and opacity as they are; a bend of bones becomes a rotation).
const holder = (r) => (typeof r === 'string' ? r.split(':') : [String(r), null]);

function dropCuts(scene, names) {
  const s = JSON.parse(JSON.stringify(scene));
  const gone = new Set(names);
  const kept = (s.cuts || []).filter((c) => !gone.has(c.name));
  const stackOf = (c) => (c.poly ? c.els : [...(c.with || []), c.el]);
  const stillCut = (n) => kept.some((c) => stackOf(c).includes(n));
  const removed = [], moved = new Map();
  s.parts = s.parts.map((p) => {
    const els = [], from = [];
    for (const r of p.els) {
      const [n, piece] = holder(r);
      if (typeof r !== 'string') { els.push(r); continue; }
      if (gone.has(piece)) { from.push(Number(n)); continue; }
      if (piece === 'rest' && !stillCut(Number(n))) { els.push(Number(n)); moved.set(Number(n), p.name); continue; }
      els.push(r);
    }
    if (!els.length) { removed.push({ ...p, from }); return null; }
    return { ...p, els: [...new Set(els)] };
  }).filter(Boolean);
  if (kept.length) s.cuts = kept; else delete s.cuts;
  const alive = new Set(s.parts.map((p) => p.name));
  const up = (p) => (p.parent && !alive.has(p.parent) ? up(removed.find((q) => q.name === p.parent) || {}) : p.parent);
  s.parts = s.parts.map((p) => {
    const q = { ...p };
    if (q.parent && !alive.has(q.parent)) { const u = up(q); if (u) q.parent = u; else delete q.parent; }
    if (q.attach && !alive.has(q.attach.part)) delete q.attach;
    if (q.touch) q.touch = q.touch.filter((n) => alive.has(n));
    if (q.maskBy && !alive.has(q.maskBy.part)) delete q.maskBy;
    return q;
  });
  if (s.joints) s.joints = s.joints.filter((j) => alive.has(j.a) && alive.has(j.b));
  // the motion of a removed part goes to the part that holds the rest of its elements; a track the heir already has on that
  // property is not replaced
  const heirOf = (p) => (p ? p.from.map((n) => moved.get(n)).find(Boolean) : undefined);
  const asTurn = (tr) => ({ t: 'turn', at: tr.at, from: (tr.from || [0])[0], to: (tr.to || [0])[0], dur: tr.dur, ease: tr.ease, role: tr.role, beat: tr.beat });
  const tracks = [];
  for (const tr of s.tracks || []) {
    if (alive.has(tr.part)) { tracks.push(tr); continue; }
    const to = heirOf(removed.find((p) => p.name === tr.part));
    if (!to) continue;
    const mine = (prop) => tracks.some((t) => t.part === to && t.keys && t.keys[prop]);
    if (tr.keys) {
      const keys = {};
      for (const [prop, ks] of Object.entries(tr.keys)) {
        const as = prop === 'bend' ? 'r' : prop;
        if (mine(as) || keys[as]) continue;
        keys[as] = prop === 'bend' ? ks.map(([t, v, e]) => [t, Array.isArray(v) ? v[0] : v, e]) : ks;
      }
      if (Object.keys(keys).length) tracks.push({ ...tr, part: to, keys });
    } else tracks.push({ ...(tr.t === 'bend' ? asTurn(tr) : tr), part: to });
  }
  s.tracks = tracks;
  return { scene: s, removed: removed.map((p) => p.name) };
}

module.exports = { dropCuts };
