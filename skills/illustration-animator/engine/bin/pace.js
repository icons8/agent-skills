// usage: node engine/bin/pace.js <scene.json> --style <id> [--story <file>] — the Pace line of the intent against the build, as JSON
// The story is scenes/<name>.story.md next to the scene unless --story says otherwise. Exit 1 when the line is missing or the build does not match it.
// The style profile is optional: a style without one is checked against the build only.
const fs = require('fs');
const path = require('path');
const { compileScene } = require('../src/scene/compile');
const { checkPace } = require('../src/check/pace');

const args = process.argv.slice(2);
const opt = (name) => { const i = args.indexOf(name); return i < 0 ? null : args[i + 1]; };
const style = opt('--style');
if (!args[0] || args[0].startsWith('--') || (style !== null && !/^[a-z0-9-]+$/.test(style || ''))) {
  console.error('Usage: node engine/bin/pace.js <scene.json> [--style <style>] [--story <story.md>]');
  process.exit(1);
}
const sceneFile = path.resolve(args[0]);
const storyFile = path.resolve(opt('--story') || path.join(path.dirname(sceneFile), `${path.basename(sceneFile, '.json')}.story.md`));
if (!fs.existsSync(storyFile)) {
  console.log(JSON.stringify({ ok: false, errors: [`no story file ${path.basename(storyFile)}: write the intent with its Pace line first`], warnings: [] }, null, 2));
  process.exit(1);
}
const ROOT = path.join(__dirname, '..', '..');
const profileFile = style && [path.join(ROOT, 'complex-animation', 'references', 'styles')]
  .map((d) => path.join(d, `${style}.json`)).find((f) => fs.existsSync(f));
const profile = profileFile ? JSON.parse(fs.readFileSync(profileFile, 'utf8')) : null;
const { inner, model } = compileScene(sceneFile);
const res = checkPace(fs.readFileSync(storyFile, 'utf8'), inner, model, profile);
console.log(JSON.stringify(res, null, 2));
process.exit(res.ok ? 0 : 1);
