// usage: node engine/bin/sheet.js <scene.json | video> --out <dir> — sheet.png (+ blur-1..4.png, first.png, ghosts.png,
// speed.png for a scene)
const fs = require('fs');
const path = require('path');
const { loadTools } = require('../src/setup');
const { compileScene } = require('../src/scene/compile');
const { sheetFromLottie, sheetFromVideo, blurFrames, motionSheets } = require('../src/render/sheet');

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
  } else {
    sheetFromVideo(tools, src, path.join(out, 'sheet.png'));
  }
  console.log(out);
})().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
