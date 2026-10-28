// The Pace line of the intent against the build: one decision per scene, made before the code and checked after it.
//   Pace: <loop>f loop, <accent>f accents, <easing>, <feel>      e.g.  Pace: 60f loop, 12f accents, soft, playful
// loop — frames of the output loop; accent — frames of one push of the main motion; easing — soft | inOut | sine | out
// (snap-out) | in | lin | spring (back); feel — calm | playful | snappy | heavy | steady. The numbers are measured on the
// compiled scene, the way `rhythm.js` measures it, and set against the style's rhythm profile when there is one.
const { partRuns, runCurve, metrics } = require('./rhythm');

const EASING = { soft: 'smooth', inout: 'smooth', sine: 'smooth', smooth: 'smooth', out: 'out', 'snap-out': 'out', 'ease-out': 'out', in: 'in', 'ease-in': 'in', lin: 'lin', linear: 'lin', spring: 'spring', back: 'spring', bounce: 'spring' };
const FEELS = ['calm', 'playful', 'snappy', 'heavy', 'steady'];
const SLACK = { frames: 3, share: 0.35 }; // an accent is right within max(3 frames, 35%) of the measured one
const SHARE = 0.35; // the declared easing must be the largest family or hold at least this share of the moving frames

const LINE = /^[\s>*-]*`?Pace:?`?:?\s*(\d+)\s*f(?:rames?)?\s+loop\s*[,;·]\s*(\d+)\s*f(?:rames?)?\s+accents?\s*[,;·]\s*([A-Za-z-]+)\s*[,;·]\s*([A-Za-z-]+)/im;
const LABELLED = /^[\s>*-]*`?(?:Frame|Motion|Mechanism|Why|Pace):/im;

// What the story says: { state: 'ok', loop, accent, easing, feel } | { state: 'missing' } | { state: 'unreadable', line } |
// { state: 'legacy' } (a story of the old form, no labelled lines at all: nothing to check)
function parseStory(text) {
  if (!LABELLED.test(text)) return { state: 'legacy' };
  const any = text.match(/^[\s>*-]*`?Pace:?`?:?.*$/im);
  if (!any) return { state: 'missing' };
  const m = text.match(LINE);
  if (!m) return { state: 'unreadable', line: any[0].trim() };
  const easing = m[3].toLowerCase(), feel = m[4].toLowerCase();
  return { state: 'ok', loop: +m[1], accent: +m[2], easing, family: EASING[easing] || null, feel, line: any[0].trim() };
}

const fam = (c) => {
  if (c.overshoot >= 5) return 'spring';
  if (Math.abs(c.p25 - 0.25) < 0.06 && Math.abs(c.p50 - 0.5) < 0.06) return 'lin';
  if (c.p50 < 0.35) return 'in';
  if (c.p25 >= 0.6) return 'out';
  return 'smooth';
};

// Share of the moving frames by easing family (ambient sways and the runs without a displacement stay out) and the median settle
// of the runs that settle at all.
function familyShares(lottie, model) {
  const w = {}, settles = [];
  let total = 0;
  for (const list of Object.values(partRuns(lottie, model))) {
    for (const r of list) {
      const c = runCurve(r);
      if (!c) continue;
      const f = fam(c);
      if (c.overshoot >= 3) settles.push(c.overshoot);
      w[f] = (w[f] || 0) + c.len;
      total += c.len;
    }
  }
  const out = {};
  for (const [f, v] of Object.entries(w)) out[f] = Math.round((v / total) * 100) / 100;
  settles.sort((a, b) => a - b);
  return { shares: out, overshoot: settles.length ? Math.round(settles[settles.length >> 1]) : 0 };
}

const norm = (frames, fps) => frames * (30 / fps); // frames at 30 fps: the unit of the feel limits

function feelMiss(feel, m, shares, over, fps) {
  const acc = m.moveFrames === null ? null : norm(m.moveFrames, fps);
  const sp = shares.spring || 0;
  // only a clear contradiction fails: the limits are looser than the feel words, calibrated on the approved scenes
  switch (feel) {
    case 'calm': return over > 15 ? `calm, but the scene settles ${over}% past its strokes (up to 15%)` : acc !== null && acc < 10 ? `calm, but an accent runs ${acc.toFixed(0)} frames at 30 fps (from 10)` : null;
    case 'playful': return over < 5 && sp < 0.2 ? `playful, but nothing springs: settle ${over}%, spring share ${Math.round(sp * 100)}% (from 5% or 20%)` : null;
    case 'snappy': return acc !== null && acc > 16 ? `snappy, but an accent runs ${acc.toFixed(0)} frames at 30 fps (up to 16)` : null;
    case 'heavy': return over > 12 ? `heavy, but the scene settles ${over}% past its strokes (up to 12%)` : acc !== null && acc < 14 ? `heavy, but an accent runs ${acc.toFixed(0)} frames at 30 fps (from 14)` : null;
    case 'steady': return (shares.lin || 0) + (shares.smooth || 0) < 0.5 ? 'steady, but lin and smooth curves are under 50% of the motion' : over > 15 ? `steady, but the scene settles ${over}% past its strokes` : null;
    default: return null;
  }
}

const within = (v, [lo, hi]) => v >= lo - 0.25 * Math.abs(lo) && v <= hi + 0.25 * Math.abs(hi);

// story: the text of scenes/<name>.story.md; lottie/model: compileScene(...); profile: the style's rhythm json or null
function checkPace(story, lottie, model, profile) {
  const p = typeof story === 'string' ? parseStory(story) : story;
  if (p.state === 'legacy') return { ok: true, skipped: 'the story has no labelled intent lines (old form): no Pace to check', errors: [], warnings: [] };
  if (p.state === 'missing') return { ok: false, errors: ['no `Pace:` line in the intent: add `Pace: <loop>f loop, <accent>f accents, <easing>, <feel>` (analyze step B) and check the build against it'], warnings: [] };
  if (p.state === 'unreadable') return { ok: false, line: p.line, errors: [`the Pace line does not read: "${p.line}" — the form is \`Pace: 60f loop, 12f accents, soft, playful\``], warnings: [] };
  const errors = [], warnings = [];
  const m = metrics(lottie, model), fps = lottie.fr;
  const { shares, overshoot } = familyShares(lottie, model);
  const loop = lottie.op - lottie.ip;
  if (!p.family) errors.push(`easing "${p.easing}" is not one of soft, inOut, sine, out (snap-out), in, lin, spring (back)`);
  if (!FEELS.includes(p.feel)) warnings.push(`feel "${p.feel}" is not in the vocabulary (${FEELS.join(', ')}): not checked`);
  if (loop !== p.loop) errors.push(`the line says a ${p.loop}-frame loop, the scene runs ${loop}: change the line or the scene`);
  if (m.moveFrames === null) warnings.push('no motion run measured: the accent is not checked');
  else if (Math.abs(m.moveFrames - p.accent) > Math.max(SLACK.frames, SLACK.share * p.accent)) errors.push(`the line says accents of ${p.accent} frames, the median motion in the scene is ${m.moveFrames}`);
  if (p.family) {
    const top = Object.entries(shares).sort((a, b) => b[1] - a[1])[0];
    if (!top) warnings.push('no run with a displacement: the easing is not checked');
    else if (top[0] !== p.family && (shares[p.family] || 0) < SHARE) errors.push(`the line says ${p.easing} (${p.family}), the scene moves by ${Object.entries(shares).map(([f, v]) => `${f} ${Math.round(v * 100)}%`).join(', ')}`);
  }
  if (FEELS.includes(p.feel)) { const f = feelMiss(p.feel, m, shares, overshoot, fps); if (f) errors.push(f); }
  if (profile) {
    const r = profile.ranges || {};
    const k = fps / (profile.fps || fps);
    if (r.loopSec && !within(p.loop / fps, r.loopSec)) warnings.push(`loop ${p.loop} frames = ${(p.loop / fps).toFixed(1)} s, the style has ${r.loopSec[0]}–${r.loopSec[1]} s`);
    if (r.moveFrames && !within(p.accent / k, r.moveFrames)) warnings.push(`accents of ${p.accent} frames, the style has ${r.moveFrames[0]}–${r.moveFrames[1]} at ${profile.fps} fps`);
    if (p.family === 'spring' && r.overshootPct && r.overshootPct[1] < 5) warnings.push(`spring, but the style has overshoot ${r.overshootPct[0]}–${r.overshootPct[1]}%`);
    if (p.family === 'lin' && r.linearShare && r.linearShare[1] < 0.1) warnings.push(`lin, but the style has a linear share of ${r.linearShare[0]}–${r.linearShare[1]}`);
  }
  return { ok: !errors.length, line: p.line, declared: { loop: p.loop, accent: p.accent, easing: p.easing, feel: p.feel }, measured: { loop, accent: m.moveFrames, easing: shares, overshootPct: overshoot }, errors, warnings };
}

module.exports = { parseStory, checkPace, familyShares, fam, EASING, FEELS };
