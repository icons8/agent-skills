// How a loop READS, not only whether its end meets its start (that is `seam` in lint.js).
// A loop that is quiet for a long stretch and then bursts, or whose motion at the seam jumps in energy, looks like a cut
// even when every value matches at the seam. Measured on the total speed of the frame: the sum of every animated
// property's frame-to-frame speed in px (motion.js speedSeries), smoothed over half a second.
// Calibrated on the approved scenes and on the Black Chalk loop test (2026-10-26): a good loop never has a smoothed
// frame energy below ~0.2 of its mean for more than a few frames and does not step by more than ~3× at the seam.
const { speedSeries } = require('./motion');

// Two tiers. The approved scenes are mostly "one gesture, then rest": 17 of 28 sit at rest on the seam and some rest for 20–57%
// of the loop, so the broad rules are warnings (they ride in the status and into the judge brief). The error is the narrow
// combination none of them has: a long rest that ends in a burst at the seam (rain-cloud: 25% of the loop at ~0.1 of the mean,
// then 0.66 of the mean on the first frames).
const LOOP = {
  window: 0.5,    // s, smoothing of the frame energy
  dead: 0.25,     // smoothed energy under this share of the mean = the frame is at rest
  deadShare: 0.12, // warning: more than this share of the loop at rest
  seam: 3,        // warning: energy just after the seam (3 frames) over the 3 frames before it (or the reverse)
  seamFloor: 0.5, // ...only when the busier side is above this share of the mean
  burstRest: 0.22, // error: a single rest this long (share of the loop) ...
  burstJump: 10,  // ... that meets the seam with this energy jump ...
  burstFloor: 0.5, // ... into motion above this share of the mean
  period: 0.06,   // warning: a repeating track's period must divide the loop within this share
};

// frame energy: total speed of the frame per frame of the loop; hidden steps are already 0 in speedSeries
function energy(lottie, model) {
  const op = model.op ?? lottie.op;
  const e = new Array(op).fill(0);
  for (const sr of speedSeries(lottie, model)) sr.s.forEach((v, t) => { e[t] += v; });
  return e;
}

const avg = (a) => a.reduce((s, v) => s + v, 0) / (a.length || 1);

function loopStats(lottie, model) {
  const e = energy(lottie, model);
  const n = e.length, fr = model.fr ?? lottie.fr ?? 30;
  const mean = avg(e);
  if (!(mean > 0.05)) return { n, mean, still: true };
  const w = Math.max(3, Math.round(LOOP.window * fr));
  // cyclic window centred on the frame
  const sm = e.map((_, t) => { let s = 0; for (let k = 0; k < w; k++) s += e[(t - Math.floor(w / 2) + k + n * 2) % n]; return s / w; });
  const low = sm.map((v) => v < LOOP.dead * mean);
  const dead = low.filter(Boolean).length / n;
  let run = 0, best = 0;
  for (let k = 0; k < 2 * n; k++) { if (low[k % n]) { run++; best = Math.max(best, Math.min(run, n)); } else run = 0; }
  const before = avg(e.slice(-3)), after = avg(e.slice(0, 3));
  const hi = Math.max(before, after), lo = Math.min(before, after);
  return { n, mean, dead, deadRun: best / n, before: before / mean, after: after / mean, seam: hi / Math.max(lo, 1e-6), seamHi: hi / mean };
}

// Does a repeating track's period divide the loop? Turning points of one property, same kind apart by T frames
function periods(lottie, model) {
  const out = [];
  const n = model.op ?? lottie.op;
  for (const sr of speedSeries(lottie, model)) {
    // speed peaks of an oscillation: local maxima of the speed series, one per half swing
    const pk = [];
    for (let t = 0; t < n; t++) {
      const a = sr.s[(t - 1 + n) % n], b = sr.s[t], c = sr.s[(t + 1) % n];
      if (b > a && b >= c && b > 0.2) pk.push(t);
    }
    if (pk.length < 4) continue;
    const gaps = pk.map((t, i) => (pk[(i + 1) % pk.length] - t + n) % n || n);
    const T = (2 * n) / pk.length; // two speed peaks per period of a sine
    // evenly spaced peaks only (an oscillation, not a one-off gesture)
    if (Math.max(...gaps) > 1.4 * Math.min(...gaps)) continue;
    const k = n / T;
    out.push({ part: sr.part, prop: sr.prop, cycles: k, ok: Math.abs(k - Math.round(k)) / Math.max(1, Math.round(k)) <= LOOP.period && Math.round(k) >= 1 });
  }
  return out;
}

function checkLoop(lottie, model) {
  const st = loopStats(lottie, model);
  if (st.still || !(st.deadRun >= LOOP.burstRest && st.seam > LOOP.burstJump && st.seamHi > LOOP.burstFloor)) return [];
  return [{ check: 'loop', part: 'scene', frame: model.op ?? lottie.op, detail: `the loop rests for ${Math.round(st.deadRun * 100)}% of its length and then bursts at the seam (${st.before.toFixed(2)} of the mean before it, ${st.after.toFixed(2)} after): it reads as a cut, the whole frame stops and starts again — spread the motion over the loop, let a slow idle (a breath, a sway) run through the rest and the seam, or shorten the loop` }];
}

function loopWarnings(lottie, model) {
  const st = loopStats(lottie, model);
  const out = [];
  if (!st.still && st.dead > LOOP.deadShare) out.push({ check: 'loop', part: 'scene', frame: 0, detail: `the whole frame is at rest for ${Math.round(st.dead * 100)}% of the loop (longest ${Math.round(st.deadRun * 100)}%) — a held pose that long reads as a stop; keep a slow idle going` });
  if (!st.still && st.seam > LOOP.seam && st.seamHi > LOOP.seamFloor) out.push({ check: 'loop', part: 'scene', frame: model.op ?? lottie.op, detail: `energy jumps ${st.seam.toFixed(1)}× across the seam (${st.before.toFixed(2)} of the mean before it, ${st.after.toFixed(2)} after)` });
  for (const p of periods(lottie, model)) {
    if (!p.ok) out.push({ check: 'period', part: p.part, frame: 0, detail: `${p.prop}: repeats ${p.cycles.toFixed(2)} times per loop — the period does not divide the loop length, the repeat jumps at the seam` });
  }
  return out;
}

// What the judge reads next to the sheets: the loop length, the energy at the seam and which parts move when. A part that
// moves in the loop but is not in the story or the plan (a pulsing moon) shows up here as a track nobody asked for.
function loopFacts(lottie, model) {
  const st = loopStats(lottie, model);
  const n = model.op ?? lottie.op, fr = model.fr ?? lottie.fr ?? 30;
  const lines = [`Loop: ${n} frames at ${fr} fps (${(n / fr).toFixed(1)} s).`];
  if (st.still) lines.push('Nothing moves.');
  else {
    lines.push(`Whole-frame energy: at rest (under ${LOOP.dead * 100}% of the mean) for ${Math.round(st.dead * 100)}% of the loop, longest rest ${Math.round(st.deadRun * 100)}%.`);
    lines.push(`Seam (last 3 frames → first 3 frames): ${st.before.toFixed(2)} → ${st.after.toFixed(2)} of the mean energy${st.seam > LOOP.seam && st.seamHi > LOOP.seamFloor ? ` — a jump of ${st.seam.toFixed(1)}×` : ''}.`);
  }
  const per = {};
  for (const sr of speedSeries(lottie, model)) {
    const on = sr.s.map((v, t) => (v > 0.05 ? t : -1)).filter((t) => t >= 0);
    if (!on.length) continue;
    const o = (per[sr.part] ??= { props: new Set(), t0: n, t1: 0, px: 0 });
    o.props.add(sr.prop); o.t0 = Math.min(o.t0, on[0]); o.t1 = Math.max(o.t1, on[on.length - 1] + 1); o.px += sr.s.reduce((a, v) => a + v, 0);
  }
  const cyc = new Map(periods(lottie, model).map((p) => [p.part, p.cycles]));
  lines.push('Moving parts (properties, frames of motion, path in px, cycles per loop if it repeats):');
  for (const [name, o] of Object.entries(per)) lines.push(`- ${name}: ${[...o.props].join('/')}, frames ${o.t0}–${o.t1}, ${Math.round(o.px)} px${cyc.has(name) ? `, repeats ${cyc.get(name).toFixed(1)}×` : ''}`);
  return lines.join('\n');
}

module.exports = { LOOP, loopFacts, energy, loopStats, periods, checkLoop, loopWarnings };
