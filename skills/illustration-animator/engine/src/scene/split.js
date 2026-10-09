// Split compound SVG elements into several elements by groups of subpaths, keeping paint order.
// scene.split = { "17": [[0, 1, 2], [3]] } → element 17 becomes "17.0" (subpaths 0–2) and "17.1" (subpath 3).
const { pathsBBox } = require('../svg/parse');

function applySplit(els, split = {}) {
  for (const [k, groups] of Object.entries(split)) {
    const e = els[Number(k)];
    if (!e) throw new Error(`split: SVG has no element ${k}`);
    if (!Array.isArray(groups) || groups.length < 2 || !groups.every(Array.isArray)) {
      throw new Error(`split ${k}: need at least two path groups, for example [[0, 1], [2]]`);
    }
    const seen = groups.flat();
    const all = e.paths.map((_, j) => j);
    if (seen.length !== all.length || !all.every((j) => seen.includes(j))) {
      throw new Error(`split ${k}: every path 0–${all.length - 1} must be in exactly one group (got ${JSON.stringify(groups)})`);
    }
  }
  const out = [];
  const map = new Map();
  for (const e of els) {
    const groups = split[String(e.i)];
    if (!groups) {
      map.set(String(e.i), out.length);
      out.push({ ...e, i: out.length, from: e.from ?? String(e.i) });
      continue;
    }
    groups.forEach((g, n) => {
      const paths = g.map((j) => e.paths[j]);
      map.set(`${e.i}.${n}`, out.length);
      out.push({ ...e, i: out.length, paths, bbox: pathsBBox(paths), from: g.map((j) => `${e.from ?? e.i}.${j}`).join('+') });
    });
  }
  const ref = (r, who) => {
    const key = String(r);
    if (map.has(key)) return map.get(key);
    if (split[key]) throw new Error(`${who}: element ${key} is split — specify ${split[key].map((_, n) => `${key}.${n}`).join(' or ')}`);
    throw new Error(`${who}: no element ${key}`);
  };
  return { els: out, ref };
}

module.exports = { applySplit };
