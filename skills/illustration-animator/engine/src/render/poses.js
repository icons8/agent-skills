// Frames of a Lottie side by side, optionally zoomed into a box, with a coordinate grid, vertex numbers of chosen
// contours, or every part tinted its own colour — to draw a cut and to look at its seams in motion.
const fs = require('fs');
const path = require('path');
const { withPage } = require('./frames');

const PALETTE = [[0.9, 0.1, 0.29], [0.24, 0.71, 0.29], [0.26, 0.39, 0.85], [0.96, 0.51, 0.19], [0.57, 0.12, 0.71], [0.26, 0.83, 0.96], [0.94, 0.2, 0.9], [0.6, 0.39, 0.14]];

// Every layer of a part gets one colour (NAME and NAME·2 alike); static layers stay as they are, faded.
function tint(lottie) {
  const out = JSON.parse(JSON.stringify(lottie));
  const names = [];
  const walk = (layers) => {
    for (const L of layers) {
      const base = String(L.nm).split('·')[0];
      const fixed = base.startsWith('STATIC_');
      if (!fixed && !names.includes(base)) names.push(base);
      const c = fixed ? null : PALETTE[names.indexOf(base) % PALETTE.length];
      for (const g of L.shapes || []) for (const it of g.it) {
        if (it.ty === 'fl' || it.ty === 'gf') {
          if (c) { it.ty = 'fl'; it.c = { a: 0, k: [...c, 1] }; it.o = { a: 0, k: 75 }; } else it.o = { a: 0, k: 25 };
        }
      }
    }
  };
  walk(out.layers);
  for (const a of out.assets || []) if (a.layers) walk(a.layers);
  return { lottie: out, legend: names.map((n, k) => [n, PALETTE[k % PALETTE.length]]) };
}

function gridSvg(w, h) {
  let g = '';
  for (let k = 0; k <= Math.max(w, h); k += 50) {
    const sw = k % 100 ? 0.5 : 1.2;
    g += `<line x1="${k}" y1="0" x2="${k}" y2="${h}" stroke="#0a0" stroke-width="${sw}" opacity="0.6"/><line x1="0" y1="${k}" x2="${w}" y2="${k}" stroke="#0a0" stroke-width="${sw}" opacity="0.6"/>`;
    if (k % 100 === 0) g += `<text x="${k + 2}" y="14" font-size="13" fill="#060">${k}</text><text x="2" y="${k - 2}" font-size="13" fill="#060">${k}</text>`;
  }
  return g;
}

// pts: [{ label, v: [[x, y], …] }] — every vertex as a dot with its number
function ptsSvg(pts, scale) {
  const r = 2.5 / scale, fs = 11 / scale;
  return pts.map(({ v }) => v.map(([x, y], k) => `<circle cx="${x}" cy="${y}" r="${r}" fill="#d00"/><text x="${x + r * 1.5}" y="${y - r}" font-size="${fs}" fill="#d00" font-family="sans-serif">${k}</text>`).join('')).join('');
}

// frames: authored frames to show; box: [x, y, w, h] in canvas px; cell: px per frame on the sheet
async function poses(lottie, env, out, { frames = [0], box = null, cell = 600, grid = false, pts = [], legend = [] } = {}) {
  fs.mkdirSync(path.dirname(out), { recursive: true });
  const { w, h } = lottie;
  const [bx, by, bw, bh] = box || [0, 0, w, h];
  const k = cell / Math.max(bw, bh);
  const W = cell * frames.length, H = cell + (legend.length ? 24 : 0);
  const over = (grid ? gridSvg(w, h) : '') + ptsSvg(pts, k);
  await withPage(env, [W, H], async (page) => {
    await page.evaluate(({ frames, cell, k, bx, by, w, h, over, legend, data }) => {
      document.body.innerHTML = '';
      document.body.style.cssText = 'margin:0;background:#fff;font:13px sans-serif';
      frames.forEach((f, i) => {
        const vp = document.createElement('div');
        vp.style.cssText = `position:absolute;left:${i * cell}px;top:0;width:${cell}px;height:${cell}px;overflow:hidden;border-right:1px solid #ccc`;
        const inner = document.createElement('div');
        inner.style.cssText = `position:absolute;left:0;top:0;width:${w}px;height:${h}px;transform-origin:0 0;transform:scale(${k}) translate(${-bx}px,${-by}px)`;
        vp.appendChild(inner);
        const a = document.createElement('div');
        a.style.cssText = `width:${w}px;height:${h}px`;
        inner.appendChild(a);
        if (over) inner.insertAdjacentHTML('beforeend', `<svg style="position:absolute;left:0;top:0" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${over}</svg>`);
        const tag = document.createElement('div');
        tag.textContent = `frame ${f}`;
        tag.style.cssText = 'position:absolute;left:4px;bottom:4px;color:#555;background:rgba(255,255,255,.8);padding:0 3px';
        vp.appendChild(tag);
        document.body.appendChild(vp);
        const anim = window.lottie.loadAnimation({ container: a, renderer: 'svg', loop: false, autoplay: false, animationData: JSON.parse(data) });
        anim.goToAndStop(f, true);
      });
      if (legend.length) {
        const l = document.createElement('div');
        l.style.cssText = `position:absolute;left:4px;top:${cell + 4}px`;
        l.innerHTML = legend.map(([nm, c]) => `<span style="color:rgb(${c.map((v) => Math.round(v * 255)).join(',')});margin-right:12px">■ ${nm}</span>`).join('');
        document.body.appendChild(l);
      }
    }, { frames, cell, k, bx, by, w, h, over, legend, data: JSON.stringify(lottie) });
    await page.screenshot({ path: out, clip: { x: 0, y: 0, width: W, height: H } });
  });
  return out;
}

module.exports = { poses, tint };
