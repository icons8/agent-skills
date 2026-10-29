// Easing `through`: a key passes its neighbours at speed. The tangent at a key comes from the neighbouring keys
// (Catmull-Rom over uneven spacing, round the loop through frame op when the track runs from 0 to op) and is zero only
// where the motion turns (an extreme of the swing), at a hold, or at the ends of a track. A segment between two keys
// whose ease is `through` becomes the cubic Hermite curve of those tangents, written as a bezier easing.
// By default the engine also does it where a part passes at speed (opts.auto): a key at the rest value in the middle of
// a swing, and the keys of the loop seam when the motion goes on through it. A segment with the smooth easing of the
// templates (soft, inOut, none) that ends in such a key becomes a `through` one; every other key of the segment stands
// still as before. An explicit other curve (sine, a custom one, lin, out, hold …) or `"through": false` in the scene
// keeps the segment as written.
const asArr = (v) => (Array.isArray(v) ? v : [v]);
const dot = (a, b) => a.reduce((s, v, n) => s + v * b[n], 0);
const sub = (a, b) => a.map((v, n) => v - b[n]);

// keys: [[frame, value, ease, arc?], ...] of one property of one part, op: loop length.
const SMOOTH = new Set([undefined, 'soft', 'inOut']);

function resolveThrough(keys, op, opts = {}) {
  const { auto = false, rest = null } = opts;
  if (!auto && !keys.some((k) => k[2] === 'through')) return keys;
  const n = keys.length;
  const cyc = n > 2 && keys[0][0] === 0 && keys[n - 1][0] === op;
  const val = keys.map((k) => asArr(k[1]));
  // neighbours of key j: [time, value] before and after, or null where the motion does not continue through the key
  const around = (j) => {
    let prev = null, next = null;
    if (j > 0) { if (keys[j - 1][2] !== 'hold') prev = [keys[j - 1][0], val[j - 1]]; }
    else if (cyc && keys[n - 2][2] !== 'hold') prev = [keys[n - 2][0] - op, val[n - 2]];
    if (j < n - 1) { if (keys[j][2] !== 'hold') next = [keys[j + 1][0], val[j + 1]]; }
    else if (cyc && keys[0][2] !== 'hold') next = [keys[1][0] + op, val[1]];
    return prev && next ? [prev, next] : null;
  };
  const tangent = (j) => {
    const nb = around(j);
    const zero = val[j].map(() => 0);
    if (!nb) return zero;
    const [[t0, v0], [t1, v1]] = nb;
    const t = keys[j][0];
    const d0 = sub(val[j], v0), d1 = sub(v1, val[j]);
    if (dot(d0, d1) <= 0) return zero; // an extreme of the swing: the motion turns here
    const m = sub(v1, v0).map((v) => v / (t1 - t0));
    // never faster than 3× the slower neighbouring chord: no overshoot past the next key
    const lim = 3 * Math.min(Math.hypot(...d0) / (t - t0), Math.hypot(...d1) / (t1 - t));
    const sp = Math.hypot(...m);
    return sp > lim && sp > 0 ? m.map((v) => (v * lim) / sp) : m;
  };
  // a key the part passes at speed: the loop seam, or the rest value in the middle of a swing
  let amp = 0;
  if (rest !== null) for (const v of val) amp = Math.max(amp, Math.hypot(...sub(v, asArr(rest))));
  // both segments at the key must be smooth ones: speed that arrives at a key must leave it
  const smooth = (i) => SMOOTH.has(keys[i][2]) || keys[i][2] === 'through';
  const passes = (j) => {
    if (!around(j) || tangent(j).every((v) => v === 0)) return false;
    if (!smooth(j === 0 ? n - 2 : j - 1) || !smooth(j === n - 1 ? 0 : j)) return false;
    if (cyc && (j === 0 || j === n - 1)) return true;
    return rest !== null && amp > 0 && Math.hypot(...sub(val[j], asArr(rest))) <= 0.02 * amp;
  };
  const mark = auto ? keys.map((k, j) => j < n - 1 && SMOOTH.has(k[2]) && (passes(j) || passes(j + 1))) : [];
  if (auto && !mark.some(Boolean) && !keys.some((k) => k[2] === 'through')) return keys;
  const tan = (j, auto1) => (auto1 && !passes(j) ? val[j].map(() => 0) : tangent(j));
  return keys.map((k, j) => {
    if (k[2] !== 'through' && !mark[j]) return k;
    if (j === n - 1) throw new Error(`through: the last key (frame ${k[0]}) has no segment after it`);
    const dt = keys[j + 1][0] - k[0];
    const dv = sub(val[j + 1], val[j]);
    const dd = dot(dv, dv);
    let y1 = 0, y2 = 1;
    if (dd > 1e-9) {
      const own = k[2] !== 'through';
      y1 = (dot(tan(j, own), dv) / dd) * (dt / 3);
      y2 = 1 - (dot(tan(j + 1, own), dv) / dd) * (dt / 3);
    }
    const r = (x) => Math.round(x * 1000) / 1000;
    return [k[0], k[1], [r(1 / 3), r(y1), r(2 / 3), r(y2)], ...k.slice(3)];
  });
}

module.exports = { resolveThrough };
