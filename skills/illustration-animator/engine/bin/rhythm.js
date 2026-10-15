// usage: node engine/bin/rhythm.js <scene.json> --style <id> — rhythm metrics, score and misses as JSON
// The style profile is <id>.json next to the style rules; a style without one prints { skipped } and exits 0.
const fs = require('fs');
const path = require('path');
const { compileScene } = require('../src/scene/compile');
const { rhythm } = require('../src/check/rhythm');

const args = process.argv.slice(2);
const style = args[args.indexOf('--style') + 1];
if (!args[0] || args.indexOf('--style') < 0 || !/^[a-z0-9-]+$/.test(style || '')) {
  console.error('Usage: node engine/bin/rhythm.js <scene.json> --style <style>');
  process.exit(1);
}
const ROOT = path.join(__dirname, '..', '..');
const profileFile = [path.join(ROOT, 'references', 'styles')]
  .map((d) => path.join(d, `${style}.json`)).find((f) => fs.existsSync(f));
if (!profileFile) {
  console.log(JSON.stringify({ skipped: `no rhythm profile for style ${style}: rhythm is not scored` }, null, 2));
  process.exit(0);
}
const { inner, model } = compileScene(path.resolve(args[0]));
console.log(JSON.stringify(rhythm(inner, model, JSON.parse(fs.readFileSync(profileFile, 'utf8'))), null, 2));
