// A limit of attempts per check: the same class of failure of one scene twice ends the loop of rebuilds. The count lives in
// the status file of the scene (`attempts: { <check>: n }`), so it survives from one make.js run to the next and is kept by
// the code, not by the agent's reading of a rule. After the limit the fused part moves whole (no cut at that seam) and the
// scene goes to manual-review.md of the style folder.
const fs = require('fs');
const path = require('path');

const LIMIT = 2;

// the earlier counts (from the status file left by the previous run) plus the checks that failed now
function bump(prev, issues) {
  const attempts = { ...((prev && prev.attempts) || {}) };
  for (const c of new Set(issues.map((i) => i.check))) attempts[c] = (attempts[c] || 0) + 1;
  return attempts;
}

const over = (attempts) => Object.keys(attempts).filter((c) => attempts[c] >= LIMIT);

// the cut seams the failed checks name (`tear`, `cut` carry the cut's name in `part`)
const cutsOf = (scene, issues, classes) => [...new Set(issues.filter((i) => classes.includes(i.check) && (scene.cuts || []).some((c) => c.name === i.part)).map((i) => i.part))];

// "## <scene>" block of manual-review.md (the format animator-verify writes and ledger.js reads); an old block of the scene is replaced
function writeManual(styleDir, name, { wrong, tried }) {
  const file = path.join(styleDir, 'manual-review.md');
  const parts = (fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '').split(/^## /m);
  const head = parts.shift().replace(/\n*$/, '\n');
  const kept = parts.filter((b) => b.split('\n')[0].trim() !== name).map((b) => `## ${b.replace(/\n*$/, '\n')}`);
  const mine = `## ${name}\n- What's wrong: ${wrong}\n- What was tried: ${tried}\n`;
  fs.writeFileSync(file, [head === '\n' ? '' : head, ...kept, mine].filter(Boolean).join('\n'));
}

module.exports = { LIMIT, bump, over, cutsOf, writeManual };
