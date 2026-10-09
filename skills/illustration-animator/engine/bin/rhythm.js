// usage: node engine/bin/rhythm.js <scene.json> --style <id> — rhythm metrics, score and misses as JSON
const fs = require('fs');
const path = require('path');
const { compileScene } = require('../src/scene/compile');
const { rhythm } = require('../src/check/rhythm');

const args = process.argv.slice(2);
const style = args[args.indexOf('--style') + 1];
if (!args[0] || args.indexOf('--style') < 0) {
  console.error('Usage: node engine/bin/rhythm.js <scene.json> --style <style>');
  process.exit(1);
}
const profileFile = path.join(__dirname, '..', '..', '.claude', 'skills', 'animator-analyze', 'styles', `${style}.json`);
if (!fs.existsSync(profileFile)) {
  console.error(`No style profile: ${profileFile}`);
  process.exit(1);
}
const { inner, model } = compileScene(path.resolve(args[0]));
console.log(JSON.stringify(rhythm(inner, model, JSON.parse(fs.readFileSync(profileFile, 'utf8'))), null, 2));
