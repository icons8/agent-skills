// usage: node engine/bin/preview-mp4.js <scene.json> [--out file.mp4]
// MP4 on white (H.264) for the user, from the scene's MOV beside its Lottie, at the scene's own frame rate and length.
const fs = require('fs');
const path = require('path');
const { loadTools } = require('../src/setup');
const { whitePreview } = require('../src/render/encode');

const args = process.argv.slice(2);
const outAt = args.indexOf('--out');
if (!args[0]) {
  console.error('Usage: node engine/bin/preview-mp4.js <scene.json> [--out file.mp4]');
  process.exit(1);
}
const json = path.resolve(args[0]);
const lottie = JSON.parse(fs.readFileSync(json, 'utf8'));
const mov = json.replace(/\.json$/, '.mov');
if (!fs.existsSync(mov)) { console.error(`No MOV beside the Lottie: ${mov}`); process.exit(1); }
try {
  const out = whitePreview(loadTools(), mov, { fr: lottie.fr, op: lottie.op }, outAt >= 0 ? path.resolve(args[outAt + 1]) : undefined);
  console.log(out);
} catch (e) { console.error(e.message); process.exit(1); }
