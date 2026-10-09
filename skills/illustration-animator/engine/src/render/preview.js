// Still render of an SVG for the agent: the whole picture (optionally with element indices),
// or chosen elements over a faded rest — to check that a part's pieces belong together.
const fs = require('fs');
const path = require('path');
const { parseSvg } = require('../svg/parse');
const { buildLottie } = require('../lottie/build');
const { applySplit } = require('../scene/split');
const { withPage, load } = require('./frames');

const BOX_H = 16, CHAR_W = 9, MERGE = 10;
const boxOf = (t) => ({ x0: t.x - (CHAR_W * t.text.length) / 2, x1: t.x + (CHAR_W * t.text.length) / 2, y0: t.y - BOX_H / 2, y1: t.y + BOX_H / 2 });
const hit = (a, b) => a.x0 < b.x1 && b.x0 < a.x1 && a.y0 < b.y1 && b.y0 < a.y1;

// Index tags for the elements: those centred within 10 px merge into one tag (a fill + outline pair reads "4·5"),
// the rest are pushed down until no two tag boxes overlap.
function labelTags(els, chosen = null) {
  const groups = [];
  for (const e of els) {
    if (chosen && !chosen.has(e.i)) continue;
    const x = (e.bbox[0] + e.bbox[2]) / 2, y = (e.bbox[1] + e.bbox[3]) / 2;
    const g = groups.find((q) => Math.hypot(q.x - x, q.y - y) <= MERGE);
    if (g) g.ids.push(e);
    else groups.push({ x, y, ids: [e] });
  }
  const placed = [];
  for (const g of groups) {
    const t = { text: g.ids.sort((a, b) => a.i - b.i).map((e) => e.from ?? e.i).join('·'), x: g.x, y: g.y };
    while (placed.some((q) => hit(boxOf(t), boxOf(q)))) t.y += BOX_H;
    placed.push(t);
  }
  return placed;
}

// els: element numbers, or "N.j" for contour group j of a compound element N (shown on its own).
async function preview(svgFile, env, out, { els: pickEls, labels = false } = {}) {
  fs.mkdirSync(path.dirname(out), { recursive: true });
  const parsed = parseSvg(svgFile);
  const { w, h } = parsed;
  const split = {};
  for (const r of pickEls || []) {
    const m = /^(\d+)\.\d+$/.exec(String(r));
    if (m && parsed.els[Number(m[1])]) split[m[1]] = parsed.els[Number(m[1])].paths.map((_, j) => [j]);
  }
  const sp = applySplit(parsed.els, split);
  const els = sp.els;
  const chosen = pickEls ? new Set(pickEls.map((r) => sp.ref(r, 'preview'))) : null;
  const shown = els.map((e) => (chosen && !chosen.has(e.i) ? { ...e, opacity: e.opacity * 0.15 } : e));
  const lottie = buildLottie({ w, h, fr: 30, op: 1, els: shown, layers: [{ name: 'ALL', els: shown.map((e) => e.i), pivot: [w / 2, h / 2] }] });
  const tags = labels ? labelTags(els, chosen) : [];
  await withPage(env, [w, h], async (page) => {
    await load(page, lottie);
    await page.evaluate((tags) => {
      document.body.style.background = '#fff';
      window.anim.goToAndStop(0, true);
      for (const t of tags) {
        const s = document.createElement('div');
        s.textContent = t.text;
        Object.assign(s.style, {
          position: 'absolute', left: `${t.x}px`, top: `${t.y}px`, transform: 'translate(-50%,-50%)',
          font: 'bold 14px/16px sans-serif', color: '#d00', background: 'rgba(255,255,255,.8)', padding: '0 3px',
        });
        document.body.appendChild(s);
      }
    }, tags);
    await page.screenshot({ path: out, clip: { x: 0, y: 0, width: w, height: h } });
  });
  return out;
}

module.exports = { preview, labelTags };
