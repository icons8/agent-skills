// Render frames of a Lottie with Skia Skottie (canvaskit-wasm full build) — the renderer that Lottie players use.
// usage: NODE_PATH=<dir>/node_modules node render.js file.json outdir width frame1 frame2 ...   ("all" = every frame)
// Frames are rendered on white so transparent art is visible; output height follows the comp aspect.
const fs = require('fs');
const path = require('path');
const ckJs = require.resolve('canvaskit-wasm/bin/full/canvaskit.js');
const CanvasKitInit = require(ckJs);
(async () => {
  const [file, outdir, sizeArg, ...frames] = process.argv.slice(2);
  const size = +sizeArg;
  const CK = await CanvasKitInit({ locateFile: f => path.join(path.dirname(ckJs), f) });
  const json = fs.readFileSync(file, 'utf8');
  const anim = CK.MakeManagedAnimation(json, {});
  if (!anim) throw new Error('Skottie failed to parse');
  fs.mkdirSync(outdir, { recursive: true });
  const total = Math.round(anim.duration() * anim.fps());
  const list = frames[0] === 'all' ? [...Array(total).keys()] : frames.map(Number);
  const j = JSON.parse(json); const hh = Math.round(size * j.h / j.w);
  const surf = CK.MakeSurface(size, hh);
  const c = surf.getCanvas();
  for (const f of list) {
    c.clear(CK.WHITE);
    anim.seekFrame(f);
    anim.render(c, CK.LTRBRect(0, 0, size, hh));
    surf.flush();
    const img = surf.makeImageSnapshot();
    fs.writeFileSync(path.join(outdir, `f${String(f).padStart(3, '0')}.png`), img.encodeToBytes());
    img.delete();
  }
  console.log('rendered', list.length, 'frames, total', total, 'fps', anim.fps());
})();
