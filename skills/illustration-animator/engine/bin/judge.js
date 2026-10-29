// The judge's brief and its one round per scene.
//   node engine/bin/judge.js prepare <style folder> [--scenes a,b] [--exclude x,y] [--root <project root>]
//     claims the scene's judge round, draws its sheets, writes <style folder>/.verify/judge-brief.md (style rules, judge
//     examples, the closest rated clips) and prints it as JSON; a scene whose round is already used is listed as refused
//   node engine/bin/judge.js record <style folder> <scene> --answer <judge answer.json> [--usage <output units>]
//     keeps the answer as advice; late or too big — marked not used. Never fails the scene.
const fs = require('fs');
const path = require('path');
const { loadTools } = require('../src/setup');
const { compileScene } = require('../src/scene/compile');
const { sheetFromLottie, sheetFromVideo, blurFrames, motionSheets, legSheet } = require('../src/render/sheet');
const J = require('../src/verify/judge');
const { loopFacts } = require('../src/check/loop');
const { writePlaces } = require('../src/check/lines');

const args = process.argv.slice(2);
const flag = (n) => { const i = args.indexOf(n); return i < 0 ? null : args[i + 1]; };
const [cmd, dirArg, sceneArg] = args;
if (!['prepare', 'record'].includes(cmd) || !dirArg) {
  console.error('Usage: node engine/bin/judge.js prepare <style folder> [--scenes a,b] | record <style folder> <scene> --answer <file> [--usage N]');
  process.exit(1);
}
const styleDir = path.resolve(dirArg);

(async () => {
  const tools = loadTools();
  const root = path.resolve(flag('--root') || tools.root || path.join(__dirname, '..', '..'));
  if (cmd === 'record') {
    const answer = JSON.parse(fs.readFileSync(path.resolve(flag('--answer')), 'utf8'));
    const one = Array.isArray(answer) ? answer.find((x) => x.scene === sceneArg) : answer;
    const r = J.record(styleDir, sceneArg, one || null, { usage: Number(flag('--usage') || 0) });
    if (r.used && r.failed.length) {
      const f = path.join(styleDir, 'manual-review.md');
      fs.appendFileSync(f, `\n## ${sceneArg} (judge's advice, nothing rebuilt)\n![](.verify/${sceneArg}/sheet.png)\nFailed checks: ${r.failed.join(', ')}\n${r.notes ? `Judge: ${r.notes}\n` : ''}`);
    }
    console.log(JSON.stringify(r));
    return;
  }
  const scenesDir = path.join(styleDir, 'scenes');
  const all = fs.readdirSync(scenesDir).filter((f) => f.endsWith('.json')).map((f) => f.slice(0, -5));
  const scenes = flag('--scenes') ? flag('--scenes').split(',') : all;
  const rules = J.layout(root).styles;
  const style = flag('--style') || J.styleOf(path.basename(styleDir), rules) || J.styleOf(scenes[0], rules) || path.basename(styleDir);
  const taken = [], refused = [];
  for (const s of scenes) {
    const c = J.claim(styleDir, s);
    if (!c.ok) { refused.push({ scene: s, reason: c.reason }); continue; }
    const out = path.join(styleDir, '.verify', s);
    fs.mkdirSync(out, { recursive: true });
    const { lottie, inner, model } = compileScene(path.join(scenesDir, `${s}.json`));
    await sheetFromLottie(lottie, tools, path.join(out, 'sheet.png'));
    await blurFrames(lottie, tools, out);
    await motionSheets(lottie, inner, model, tools, out);
    await legSheet(lottie, inner, model, tools, path.join(out, 'legs.png'));
    fs.writeFileSync(path.join(out, 'loop.md'), loopFacts(inner, model));
    await writePlaces(inner, model, out);
    taken.push({ scene: s, dir: out, deadline: c.deadline });
  }
  if (!taken.length) { console.log(JSON.stringify({ brief: null, scenes: [], refused }, null, 2)); return; }
  const brief = J.buildBrief({ root, styleDir, style, scenes: taken.map((t) => t.scene), makeSheet: (v, o) => sheetFromVideo(tools, v, o), exclude: (flag('--exclude') || '').split(',').filter(Boolean) });
  const file = path.join(styleDir, '.verify', 'judge-brief.md');
  fs.writeFileSync(file, brief.text);
  console.log(JSON.stringify({ brief: file, chars: brief.text.length, examples: brief.examples.map((e) => ({ scene: e.scene, score: e.score, first: e.first, sheet: !!e.sheet, quote: !!e.quote })), scenes: taken, refused }, null, 2));
})().catch((e) => { console.error(e.message); process.exit(1); });
