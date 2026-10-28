// The judge is an adviser, not a gate: one round per scene, a time and size ceiling kept by code, a verdict that is only
// a recommendation. This module builds the judge's brief (style rules, judge examples, the closest rated clips) and keeps
// the round counter; bin/judge.js is its command line.
const fs = require('fs');
const path = require('path');

const LIMITS = {
  rounds: 1, // judge rounds per scene; the second claim is refused
  sceneSec: 180, // a verdict that arrives later than this after the claim is not used
  outputBudget: 60000, // output units one scene may cost; a bigger report is not used
  examples: 6, // rated clips shown to the judge
  briefChars: 70000, // text of the brief; the rules are cut to fit, never the examples
  exampleEntries: 20, // newest entries of judge-examples.md
};

const layout = (root) => ({
  styles: path.join(root, 'complex-animation', 'references', 'styles'),
  judgeMd: 'complex-animation/references/judge.md',
  examples: path.join(root, 'complex-animation', 'references', 'judge-examples.md'),
  ratings: path.join(root, 'none'),
  scores: path.join(root, 'none'),
});

const readIf = (f) => (fs.existsSync(f) ? fs.readFileSync(f, 'utf8') : '');
const stateFile = (styleDir, scene) => path.join(styleDir, '.verify', scene, 'judge.state.json');
const readState = (styleDir, scene) => { try { return JSON.parse(readIf(stateFile(styleDir, scene))); } catch { return null; } };
const writeState = (styleDir, scene, st) => {
  fs.mkdirSync(path.dirname(stateFile(styleDir, scene)), { recursive: true });
  fs.writeFileSync(stateFile(styleDir, scene), JSON.stringify(st, null, 2));
  // mirrored into the scene status; make.js rewrites that file on a rebuild, the state file above stays the counter
  const sf = path.join(styleDir, 'out', `${scene}.status.json`);
  if (fs.existsSync(sf)) {
    try { const s = JSON.parse(fs.readFileSync(sf, 'utf8')); s.judgeRounds = st.rounds; fs.writeFileSync(sf, JSON.stringify(s, null, 2)); } catch { /* status is only a mirror */ }
  }
};

// Take the scene's only judge round. { ok: false } — already used: the scene goes on by the script checks, the judge's
// remarks (if any) go to the report.
function claim(styleDir, scene, now = Date.now()) {
  const st = readState(styleDir, scene);
  if (st && st.rounds >= LIMITS.rounds) return { ok: false, reason: `judge round already used for ${scene} (${LIMITS.rounds} per scene): no second call, remarks go to the report` };
  writeState(styleDir, scene, { rounds: 1, claimedAt: now, deadline: now + LIMITS.sceneSec * 1000 });
  return { ok: true, deadline: now + LIMITS.sceneSec * 1000 };
}

// Record the verdict. Over the time or size ceiling it is kept in the file but marked not used (the build goes on).
function record(styleDir, scene, answer, { usage = 0, now = Date.now() } = {}) {
  const st = readState(styleDir, scene);
  if (!st) return { used: false, reason: 'no claim for this scene: call claim first' };
  const late = now > st.deadline, big = usage > LIMITS.outputBudget;
  const used = !late && !big;
  const note = late ? `skipped: the judge took more than ${LIMITS.sceneSec} s` : big ? `skipped: the judge spent ${usage} > ${LIMITS.outputBudget} output units` : '';
  const dir = path.join(styleDir, '.verify', scene);
  fs.writeFileSync(path.join(dir, 'judge.json'), JSON.stringify({ advisory: true, used, note, answer }, null, 2));
  writeState(styleDir, scene, { ...st, recordedAt: now, usage, used });
  const failed = !answer ? [] : Object.entries(answer.checks || {}).filter(([, v]) => v === false).map(([k]) => k)
    .concat(Object.entries(answer.story_checks || {}).filter(([, v]) => v === false).map(([k]) => k));
  return { used, note, failed, notes: (answer && answer.notes) || '' };
}

// ---- brief ----
const styleOf = (scene, rulesDir) => {
  const names = fs.readdirSync(rulesDir).filter((f) => f.endsWith('.md') && !f.endsWith('.lessons.md') && f !== 'common.md').map((f) => f.slice(0, -3));
  return names.filter((n) => scene === n || scene.startsWith(`${n}-`)).sort((a, b) => b.length - a.length)[0] || null;
};

// the user's words per scene from judge-examples.md: "## <scene> · judge: … · user: …" + the "Why:" line
function quotes(examples) {
  const out = {};
  for (const m of examples.matchAll(/^## (\S+) · judge: ([^\n]*?) · user: ([^\n]*)\n(?:Why: ([^\n]*))?/gm)) out[m[1]] = { judge: m[2], user: m[3], why: m[4] || '' };
  return out;
}

// All rated clips as { scene, score, first }; score > 0 is good. the ratings file (good/almost/bad) is the older record.
function rated(root) {
  const all = new Map();
  const word = { good: 3, almost: 1, bad: -3 };
  try {
    for (const r of JSON.parse(readIf(layout(root).ratings))) all.set(r.scene, { scene: r.scene, score: word[r.owner] ?? 0, first: false, via: 'owner-ratings' });
  } catch { /* none */ }
  try {
    for (const [k, v] of Object.entries(JSON.parse(readIf(layout(root).scores)))) {
      const scene = k.slice(k.lastIndexOf('/') + 1);
      if (v.try === 'unknown' || typeof v.score !== 'number') continue;
      all.set(scene, { scene, score: v.score, first: v.try === 'first', via: 'ratings.json' });
    }
  } catch { /* none */ }
  return [...all.values()];
}

// Examples: first-attempt pluses first (the user's rule: +1 at the first try without edits beats +5 after edits), then every
// minus (first-attempt minuses before the rest, harsher first), then fixed pluses. Same style first, other styles fill up.
function pickExamples(root, scene, style, n = LIMITS.examples) {
  const rulesDir = layout(root).styles;
  const rank = (r) => (r.first && r.score > 0 ? 0 : r.score < 0 ? (r.first ? 1 : 2) : 3);
  const order = (a, b) => rank(a) - rank(b) || (a.score < 0 ? a.score - b.score : b.score - a.score);
  // scenes of a known style only: pairs like A/B of the brief test have no style to compare
  const pool = rated(root).filter((r) => r.scene !== scene && r.score !== 0 && styleOf(r.scene, rulesDir));
  const same = pool.filter((r) => style && r.scene.startsWith(`${style}-`)).sort(order);
  const rest = pool.filter((r) => !same.includes(r)).sort(order);
  // keep both signs in the set: at least two of the opposite sign whenever the style has them
  const pick = [];
  const take = (list, f) => { for (const r of list) if (pick.length < n && !pick.includes(r) && f(r)) pick.push(r); };
  take(same, (r) => r.first && r.score > 0); take(same, (r) => r.score < 0); take(same, () => true);
  take(rest, (r) => r.first && r.score > 0); take(rest, (r) => r.score < 0); take(rest, () => true);
  return pick.slice(0, n);
}

// MP4 on white of a rated clip (the preview) or its MOV; null when the file is gone
function findClip(root, scene) {
  const base = path.join(root, '!animated');
  if (!fs.existsSync(base)) return null;
  for (const d of fs.readdirSync(base)) {
    for (const f of [path.join(base, d, '!preview', `${scene}.mp4`), path.join(base, d, scene, `${scene}.mov`), path.join(base, '!preview', `${scene}.mp4`)]) if (fs.existsSync(f)) return f;
  }
  return null;
}

// Cut the text to a size: the head of the file stays, the tail goes with a mark
const cut = (text, max) => (text.length <= max ? text : `${text.slice(0, max)}\n… [cut: ${text.length - max} characters left out, read the file for the rest]`);

// The brief of one batch; returns { text, examples: [{scene, score, first, sheet}] }. makeSheet(video, out) draws a clip's
// sheet (null → the example is listed without a picture).
function buildBrief({ root, styleDir, style, scenes, makeSheet, exclude = [] }) {
  const rules = layout(root).styles;
  const judgeMd = layout(root).judgeMd;
  // the user's own cases and rules of this style folder come with the shipped ones
  const examplesMd = [readIf(path.join(styleDir, 'judge-examples.md')), readIf(layout(root).examples)].join('\n');
  const entries = examplesMd.split(/^(?=## )/m).filter((e) => e.startsWith('## ') && !e.startsWith('## <') && / · judge: /.test(e.split('\n')[0])).slice(0, LIMITS.exampleEntries).join('\n');
  const q = quotes(examplesMd);
  const first = scenes[0];
  const ex = pickExamples(root, first, style).filter((r) => !exclude.includes(r.scene)).map((r) => {
    const clip = findClip(root, r.scene);
    const dir = path.join(styleDir, '.verify', '_examples');
    fs.mkdirSync(dir, { recursive: true });
    const sheet = path.join(dir, `${r.scene}.png`);
    if (clip && makeSheet && !fs.existsSync(sheet)) { try { makeSheet(clip, sheet); } catch { /* listed without a picture */ } }
    return { ...r, sheet: fs.existsSync(sheet) ? sheet : null, quote: q[r.scene] || null };
  });
  const exText = ex.map((r, i) => `${i + 1}. \`${r.scene}\` — user: ${r.score > 0 ? '+' : ''}${r.score} (${r.first ? 'first attempt, no edits' : 'after edits'})`
    + `${r.quote ? ` · judge said ${r.quote.judge}, user: ${r.quote.user}. "${r.quote.why}"` : ''}${r.sheet ? ` · sheet: \`${r.sheet}\`` : ' · no picture'}`).join('\n');
  const own = [readIf(path.join(rules, `${style}.md`)), readIf(path.join(rules, `${style}.lessons.md`)), readIf(path.join(styleDir, 'rules.md'))].filter(Boolean).join('\n\n');
  const fixed = `# Judge brief — style ${style || '?'}, scenes: ${scenes.join(', ')}\n\n`
    + `You are the judge: read \`${judgeMd}\` ("checklist" mode) and answer with the JSON array it describes. Your word is advice: it does not block delivery and nothing is rebuilt after it. One round; ${LIMITS.sceneSec} s per scene.\n\n`
    + '## How the user rated clips close to these (look at the sheets, then judge the way they would)\n\n'
    + `${exText || 'No rated clips for this style.'}\n\n`
    + 'A plus at the first attempt without edits is the standard to match; every minus names a defect to look for. Do not copy a verdict from a neighbour: use it to calibrate what the user forgives and what they reject.\n\n'
    + `## Cases where the user disagreed with the judge (newest first)\n\n${entries || '(none)'}\n\n`;
  const room = Math.max(4000, LIMITS.briefChars - fixed.length);
  const common = readIf(path.join(rules, 'common.md'));
  const text = `${fixed}## Style rules — \`${style}.md\` and its lessons\n\n${cut(own || '(no style file)', Math.floor(room * 0.4))}\n\n`
    + `## Common rules — \`common.md\`\n\n${cut(common, Math.floor(room * 0.6))}\n`;
  return { text, examples: ex };
}

module.exports = { LIMITS, layout, claim, record, styleOf, rated, pickExamples, findClip, buildBrief, quotes, readState };
