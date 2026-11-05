// usage: node engine/bin/angles.js <scene.json | lottie.json> [--json]
// How far the limbs swing: the largest rotation and bone bend of the limb parts, degrees, and the verdict
// pass / low / n/a against the threshold of the approved scenes. A hint for the judge, never a gate: always exits 0.
// A scene file gives both angles; a finished Lottie only the rotation (the bend is baked into its paths).
const fs = require('fs');
const path = require('path');
const { compileScene } = require('../src/scene/compile');
const { ofModel, ofLottie, kneeDirection } = require('../src/check/angles');

const args = process.argv.slice(2);
if (!args[0]) {
  console.error('Usage: node engine/bin/angles.js <scene.json | lottie.json> [--json]');
  process.exit(1);
}
const file = path.resolve(args[0]);
const data = JSON.parse(fs.readFileSync(file, 'utf8'));
let res, knee = { dir: 'n/a', part: '', bend: 0 };
try {
  if (data.layers) res = ofLottie(data);
  else {
    const { inner, model } = compileScene(file);
    res = ofModel(inner, model);
    knee = kneeDirection(model, data.facing);
  }
} catch (e) {
  console.error(`angles: ${e.message}`);
  process.exit(1);
}
if (args.includes('--json')) console.log(JSON.stringify({ ...res, knee }));
else {
  const bend = res.max_bend === null ? 'not measured' : `${res.max_bend}° (${res.bend_part || '-'})`;
  console.log(res.verdict === 'n/a'
    ? 'angles n/a: no limb parts by name (arm, leg, hand, foot ...)'
    : `angles ${res.verdict}: max rotation ${res.max_rotation}° (${res.rotation_part || '-'}), max bend ${bend}; limbs ${res.limbs}, threshold ${res.threshold}°`);
  if (knee.dir === 'reversed') console.log(`KNEE REVERSED: ${knee.part} bends ${knee.bend}° the wrong way for a character facing ${data.facing} — the shin goes forward; flip the sign of the knee bend`);
  else if (knee.dir === 'ok') console.log(`knee direction ok (${knee.part} ${knee.bend}°, facing ${data.facing})`);
}
