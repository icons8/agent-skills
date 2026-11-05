// Frame energy of a finished Lottie: mean absolute pixel change between neighbouring frames (white background, 256 px),
// including the wrap last frame -> first. Prints the numbers a loop is judged by: dead share, seam speed vs mean, stop at the seam.
const fs = require('fs');
const path = require('path');
const { req, resolve } = require('../src/setup/deps');
const { loadTools: readTools } = require('../src/setup');

async function energy(lottie, tools, size = 256) {
  const puppeteer = req('puppeteer-core');
  const browser = await puppeteer.launch({ executablePath: tools.chrome, headless: true, args: ['--force-color-profile=srgb'] });
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: size, height: size, deviceScaleFactor: 1 });
    await page.setContent(`<html><body style="margin:0"><div id="a" style="width:${size}px;height:${size}px"></div></body></html>`);
    await page.addScriptTag({ path: resolve('lottie-web/build/player/lottie.min.js') });
    return await page.evaluate((d, size) => {
      const anim = lottie.loadAnimation({ container: document.getElementById('a'), renderer: 'canvas', loop: false, autoplay: false, animationData: d,
        rendererSettings: { clearCanvas: true, preserveAspectRatio: 'xMidYMid meet' } });
      const n = d.op - d.ip;
      const frames = [];
      for (let f = 0; f < n; f++) {
        anim.goToAndStop(d.ip + f, true);
        const c = document.querySelector('#a canvas');
        const x = c.getContext('2d');
        const w = c.width, h = c.height;
        const px = x.getImageData(0, 0, w, h).data;
        const g = new Float32Array(w * h);
        for (let i = 0; i < w * h; i++) { const a = px[i * 4 + 3] / 255; g[i] = (px[i * 4] * a + 255 * (1 - a)) * 0.3 + (px[i * 4 + 1] * a + 255 * (1 - a)) * 0.59 + (px[i * 4 + 2] * a + 255 * (1 - a)) * 0.11; }
        frames.push(g);
      }
      const out = [];
      for (let f = 0; f < n; f++) {
        const A = frames[f], B = frames[(f + 1) % n];
        let s = 0; for (let i = 0; i < A.length; i++) s += Math.abs(A[i] - B[i]);
        out.push(s / A.length);
      }
      return out;
    }, lottie, size);
  } finally { await browser.close(); }
}

const med = (a) => { const s = [...a].sort((x, y) => x - y); return s[Math.floor(s.length / 2)]; };
function stats(e, fr) {
  const n = e.length, mean = e.reduce((a, b) => a + b, 0) / n, m = med(e);
  const dead = e.filter((v) => v < 0.15 * m).length / n;
  const seam = [...e.slice(-3), ...e.slice(0, 3)];
  const seamMean = seam.reduce((a, b) => a + b, 0) / seam.length;
  // longest run of dead frames, wrapping around the seam
  let best = 0, run = 0;
  for (let k = 0; k < 2 * n; k++) { if (e[k % n] < 0.15 * m) { run++; best = Math.max(best, Math.min(run, n)); } else run = 0; }
  // the dead run that touches the seam
  let atSeam = 0; for (let k = 0; k < n && e[(n - 1 - k + n) % n] < 0.15 * m; k++) atSeam++;
  let afterSeam = 0; for (let k = 0; k < n && e[k] < 0.15 * m; k++) afterSeam++;
  return { frames: n, mean, median: m, dead, longestDeadSec: best / fr, seamRel: seamMean / mean, seamDead: atSeam + afterSeam, half: [e.slice(0, n / 2), e.slice(n / 2)].map((h) => h.reduce((a, b) => a + b, 0) / h.length / mean) };
}

module.exports = { energy, stats };

if (require.main === module) (async () => {
  const tools = readTools();
  const argv = process.argv.slice(2), ri = argv.indexOf('--raw');
  const rawDir = ri >= 0 ? argv.splice(ri, 2)[1] : '';
  for (const f of argv) {
    const lottie = JSON.parse(fs.readFileSync(f, 'utf8'));
    const e = await energy(lottie, tools);
    const st = stats(e, lottie.fr);
    if (rawDir) fs.writeFileSync(rawDir + '/' + path.basename(path.dirname(f)) + '-' + path.basename(f) + '.energy.json', JSON.stringify(e));
    console.log(path.basename(path.dirname(f)) + '/' + path.basename(f), JSON.stringify(st, (k, v) => (typeof v === 'number' ? +v.toFixed(3) : v)));
  }
})();
