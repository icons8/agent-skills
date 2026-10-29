// usage: node engine/bin/sheet.js <scene.json | video> --out <dir> — sheet.png (+ blur-1..4.png, first.png, ghosts.png,
// speed.png, legs.png, seam.png, places.png + places.md and loop.md for a scene)
const fs = require('fs');
const path = require('path');
const { loadTools } = require('../src/setup');
const { compileScene } = require('../src/scene/compile');
const { loopFacts } = require('../src/check/loop');
const { writePlaces } = require('../src/check/lines');
const { sheetFromLottie, sheetFromVideo, blurFrames, motionSheets, legSheet } = require('../src/render/sheet');

const args = process.argv.slice(2);
const i = args.indexOf('--out');
if (!args[0] || i < 0) {
  console.error('Usage: node engine/bin/sheet.js <scene.json | video> --out <folder>');
  process.exit(1);
}
const src = path.resolve(args[0]);
const out = path.resolve(args[i + 1]);
fs.mkdirSync(out, { recursive: true });

(async () => {
  const tools = loadTools();
  if (src.endsWith('.json')) {
    const { lottie, inner, model } = compileScene(src);
    await sheetFromLottie(lottie, tools, path.join(out, 'sheet.png'));
    await blurFrames(lottie, tools, out);
    await motionSheets(lottie, inner, model, tools, out);
    await legSheet(lottie, inner, model, tools, path.join(out, 'legs.png'));
    fs.writeFileSync(path.join(out, 'loop.md'), loopFacts(inner, model));
    // the places where a line end came off the lines it stopped at, cut out large: the rest frame beside the frame of the place
    await writePlaces(inner, model, out);
  } else {
    sheetFromVideo(tools, src, path.join(out, 'sheet.png'));
  }
  console.log(out);
})().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
