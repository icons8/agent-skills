// lottie-web in headless Chrome: transparent PNG frames, and frame-0 vs SVG pixel check.
const fs = require('fs');
const os = require('os');
const path = require('path');
const { req, resolve } = require('../env/deps');

async function withPage(env, [W, H], fn) {
  const puppeteer = req('puppeteer-core');
  const browser = await puppeteer.launch({ executablePath: env.chrome, headless: true, args: ['--force-color-profile=srgb'] });
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: W, height: H, deviceScaleFactor: 1 });
    await page.setContent(`<html><body style="margin:0;background:transparent"><div id="a" style="width:${W}px;height:${H}px"></div></body></html>`);
    await page.addScriptTag({ path: resolve('lottie-web/build/player/lottie.min.js') });
    return await fn(page);
  } finally {
    await browser.close();
  }
}

const load = (page, lottie) => page.evaluate((d) => {
  window.anim = lottie.loadAnimation({ container: document.getElementById('a'), renderer: 'svg', loop: false, autoplay: false, animationData: d });
}, lottie);

async function renderFrames(lottie, env, { dir, frames } = {}) {
  dir = dir || fs.mkdtempSync(path.join(os.tmpdir(), 'animator-'));
  const list = frames || [...Array(lottie.op - lottie.ip).keys()].map((f) => f + lottie.ip);
  await withPage(env, [lottie.w, lottie.h], async (page) => {
    await load(page, lottie);
    for (const [n, f] of list.entries()) {
      await page.evaluate((f) => window.anim.goToAndStop(f, true), f);
      await page.screenshot({
        path: path.join(dir, `f${String(n).padStart(4, '0')}.png`),
        clip: { x: 0, y: 0, width: lottie.w, height: lottie.h },
        omitBackground: true,
      });
    }
  });
  return dir;
}

// down: the compare runs at 1/down of the size (4 ignores hairline AA noise; 1 sees a hairline at a cut seam)
async function compareFrame0(svgFile, lottie, env, [W, H], { frame = 0, diffOut, down = 4 } = {}) {
  let svg = fs.readFileSync(svgFile, 'utf8');
  const head = svg.match(/<svg\b[^>]*>/)[0];
  if (!/\swidth=/.test(head)) svg = svg.replace(/<svg\b/, `<svg width="${W}" height="${H}"`);
  const res = await withPage(env, [lottie.w, lottie.h], async (page) => {
    await load(page, lottie);
    return page.evaluate(async (svg, W, H, size, frame, down) => {
      const w = Math.round(size / down), h = w;
      const k = w / Math.max(W, H), dx = (w - W * k) / 2, dy = (h - H * k) / 2;
      const img = (src) => new Promise((resolve, reject) => {
        const i = new Image();
        const timer = setTimeout(() => reject(new Error('SVG did not load within 20 seconds')), 20000);
        i.onload = () => { clearTimeout(timer); resolve(i); };
        i.onerror = () => { clearTimeout(timer); reject(new Error('SVG does not open in the browser: check that it is valid XML (entities, &)')); };
        i.src = src;
      });
      const canvas = (bg) => { const c = document.createElement('canvas'); c.width = w; c.height = h; const x = c.getContext('2d'); x.fillStyle = bg; x.fillRect(0, 0, w, h); return [c, x]; };
      const b64 = (s) => 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(s)));
      const imgA = await img(b64(svg));
      window.anim.goToAndStop(frame, true);
      const out = new XMLSerializer().serializeToString(document.querySelector('#a svg'));
      const imgB = await img(b64(out));
      // white and black backgrounds: a white element on transparency shows up on black, a black one on white
      const runOn = (bg) => {
        const [, xa] = canvas(bg); xa.drawImage(imgA, dx, dy, W * k, H * k);
        const [, xb] = canvas(bg); xb.drawImage(imgB, 0, 0, w, h);
        const A = xa.getImageData(0, 0, w, h).data, B = xb.getImageData(0, 0, w, h).data;
        const [dc, xd] = canvas(bg); const im = xd.createImageData(w, h);
        let sum = 0, bad = 0;
        const pts = [], leak = [];
        for (let i = 0; i < A.length; i += 4) {
          const d = (Math.abs(A[i] - B[i]) + Math.abs(A[i + 1] - B[i + 1]) + Math.abs(A[i + 2] - B[i + 2])) / 3;
          sum += d;
          if (d > 40) { bad++; if (pts.length < 40000) pts.push([((i / 4) % w) * down, Math.floor(i / 4 / w) * down]); }
          // light through dark: a gap between two pieces of a solid shape
          const la = (A[i] + A[i + 1] + A[i + 2]) / 3, lb = (B[i] + B[i + 1] + B[i + 2]) / 3;
          if (la < 128 && lb - la > 40 && leak.length < 40000) leak.push([((i / 4) % w) * down, Math.floor(i / 4 / w) * down]);
          const g = (A[i] + A[i + 1] + A[i + 2]) / 3 * 0.3 + 178;
          im.data[i] = d > 40 ? 255 : g; im.data[i + 1] = d > 40 ? 0 : g; im.data[i + 2] = d > 40 ? 0 : g; im.data[i + 3] = 255;
        }
        xd.putImageData(im, 0, 0);
        return { meanDiff: +(sum / (A.length / 4)).toFixed(3), bad, pts, leak, badPixelsPct: +((bad / (A.length / 4)) * 100).toFixed(3), diff: dc.toDataURL('image/png') };
      };
      const onWhite = runOn('#fff'), onBlack = runOn('#000');
      const worse = onBlack.badPixelsPct > onWhite.badPixelsPct ? onBlack : onWhite;
      return { ...worse, leak: onWhite.leak };
    }, svg, W, H, lottie.w, frame, down);
  });
  if (diffOut) fs.writeFileSync(diffOut, Buffer.from(res.diff.split(',')[1], 'base64'));
  return { meanDiff: res.meanDiff, badPixelsPct: res.badPixelsPct, bad: res.bad, badPts: res.pts, leakPts: res.leak, pass: res.badPixelsPct < 0.5 };
}

module.exports = { renderFrames, compareFrame0, withPage, load };
