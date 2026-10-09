// For the visual judge: a 4×4 contact sheet on white and motion-blur frames, from a Lottie or a video; for a scene also
// the first frame of the loop large, ghosts of the loop with the path of every moving part, and the speed of each part.
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');
const { renderFrames, withPage } = require('./frames');
const { worldMatrix, apply } = require('../lottie/evaluate');
const { valueAt } = require('../lottie/keys');
const { weights, pose, deformPoint } = require('../bones/skin');
const { speedSeries } = require('../check/motion');

const ff = (env, args) => execFileSync(env.ffmpeg, ['-y', '-loglevel', 'error', ...args]);
const pick = (total, n) => [...Array(n).keys()].map((i) => Math.floor((i * total) / n));
const tmpDir = () => fs.mkdtempSync(path.join(os.tmpdir(), 'animator-sheet-'));

// <dir>/f0000.png … f00NN.png → one sheet of n cells on white
function tile(env, dir, out, n) {
  const cols = Math.round(Math.sqrt(n)), cell = 1200 / cols;
  ff(env, ['-framerate', '1', '-i', path.join(dir, 'f%04d.png'), '-f', 'lavfi', '-i', 'color=c=white:s=1200x1200',
    '-filter_complex', `[0:v]scale=${cell}:${cell},tile=${cols}x${cols}[t];[1:v][t]overlay=format=auto,format=rgb24`,
    '-frames:v', '1', out]);
  return out;
}

async function sheetFromLottie(lottie, env, out, { n = 16 } = {}) {
  const frames = pick(lottie.op - lottie.ip, n).map((f) => f + lottie.ip);
  const dir = await renderFrames(lottie, env, { frames });
  try { return tile(env, dir, out, n); } finally { fs.rmSync(dir, { recursive: true, force: true }); }
}

function sheetFromVideo(env, video, out, { n = 16 } = {}) {
  const all = tmpDir(), dir = tmpDir();
  try {
    // libvpx decoders keep the webm alpha; pick the one matching the stream (Icons8 previews are VP8)
    const codec = execFileSync(env.ffprobe, ['-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=codec_name', '-of', 'csv=p=0', video]).toString().trim();
    const dec = { vp9: ['-c:v', 'libvpx-vp9'], vp8: ['-c:v', 'libvpx'] }[codec] || [];
    ff(env, [...dec, '-i', video, path.join(all, 'a%05d.png')]);
    const files = fs.readdirSync(all).sort();
    if (!files.length) throw new Error(`Video has no frames: ${video}`);
    pick(files.length, n).forEach((k, i) => fs.copyFileSync(path.join(all, files[k]), path.join(dir, `f${String(i).padStart(4, '0')}.png`)));
    return tile(env, dir, out, n);
  } finally {
    fs.rmSync(all, { recursive: true, force: true });
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

// setpts: ffmpeg 9 keeps the timestamp of the 5th frame, so overlay would never see the blur layer without it.
// n moments evenly over the loop; each is `span` neighbouring frames averaged
async function blurFrames(lottie, env, outDir, { n = 4, span = 5 } = {}) {
  const op = lottie.op - lottie.ip;
  const out = [];
  for (let i = 0; i < n; i++) {
    const c = Math.floor((i * op) / n + op / (2 * n));
    const frames = [...Array(span).keys()].map((k) => lottie.ip + ((((c - (span >> 1) + k) % op) + op) % op));
    const dir = await renderFrames(lottie, env, { frames });
    const file = path.join(outDir, `blur-${i + 1}.png`);
    try {
      ff(env, ['-framerate', '30', '-i', path.join(dir, 'f%04d.png'), '-f', 'lavfi', '-i', `color=c=white:s=${lottie.w}x${lottie.h}`,
        '-filter_complex', `[0:v]tmix=frames=${span},select=eq(n\\,${span - 1}),setpts=PTS-STARTPTS[b];[1:v][b]overlay=format=auto:shortest=1,scale=1200:1200,format=rgb24`,
        '-frames:v', '1', file]);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
    out.push(file);
  }
  return out;
}


const COLORS = ['#e6194b', '#3cb44b', '#4363d8', '#f58231', '#911eb4', '#0aa5a5', '#c71585', '#808000'];
const esc = (t) => String(t).replace(/[<>&"]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;' }[c]));

// SVG markup → transparent PNG of the same size, drawn by Chrome
async function svgToPng(env, svg, [W, H], out) {
  await withPage(env, [W, H], async (page) => {
    await page.setContent(`<html><body style="margin:0;background:transparent">${svg}</body></html>`);
    await page.screenshot({ path: out, clip: { x: 0, y: 0, width: W, height: H }, omitBackground: true });
  });
  return out;
}

// Where a part is at authoring frame t: its pivot, or for a bent part the end of its bone chain.
function trackPoint(inner, p, t) {
  let local = p.pivot;
  if (p.bones && p.bendProp) {
    const J = p.bones.joints, end = J[J.length - 1];
    local = deformPoint(end, weights(end, J), J, pose(J, valueAt(p.bendProp, t)));
  }
  return apply(worldMatrix(inner, p.name, t), local);
}

// first.png — frame 0 of the output loop on white; ghosts.png — 16 frames of the loop at once with the path of every
// moving part (dots every 1/16 of the loop, a ring on the first frame); speed.png — speed of each part over the loop.
async function motionSheets(lottie, inner, model, env, outDir) {
  const { w, h, op } = model;
  const start = (op - model.keyFrame) % op; // authoring frame shown at output frame 0
  const onWhite = (src, out) => ff(env, ['-i', src, '-f', 'lavfi', '-i', `color=c=white:s=${w}x${h}`,
    '-filter_complex', '[1:v][0:v]overlay=format=auto,scale=1200:1200,format=rgb24', '-frames:v', '1', out]);

  const one = await renderFrames(lottie, env, { frames: [lottie.ip] });
  try { onWhite(path.join(one, 'f0000.png'), path.join(outDir, 'first.png')); } finally { fs.rmSync(one, { recursive: true, force: true }); }

  // the parts that travel most, with their paths in output order
  const paths = Object.values(model.parts).map((p) => {
    const pts = [];
    for (let k = 0; k <= op; k++) pts.push(trackPoint(inner, p, (start + k) % op));
    const len = pts.slice(1).reduce((s, q, k) => s + Math.hypot(q[0] - pts[k][0], q[1] - pts[k][1]), 0);
    return { name: p.name, pts, len };
  }).filter((x) => x.len > 3).sort((a, b) => b.len - a.len).slice(0, COLORS.length);
  paths.forEach((x, i) => { x.color = COLORS[i]; });

  const frames = pick(op, 16);
  const ghostDir = await renderFrames(lottie, env, { frames: frames.map((f) => f + lottie.ip) });
  const blend = path.join(ghostDir, 'blend.png'), lines = path.join(ghostDir, 'lines.png');
  try {
    // average of 16 frames on white: still parts stay solid, moving ones turn into ghosts
    ff(env, ['-framerate', '16', '-i', path.join(ghostDir, 'f%04d.png'), '-f', 'lavfi', '-i', `color=c=white:s=${w}x${h}`,
      '-filter_complex', '[1:v][0:v]overlay=format=auto:shortest=1,tmix=frames=16,select=eq(n\\,15),setpts=PTS-STARTPTS,format=rgb24',
      '-frames:v', '1', blend]);
    const svg = paths.map((x) => {
      const poly = x.pts.map((q) => q.map((v) => v.toFixed(1)).join(',')).join(' ');
      const dots = frames.map((k) => `<circle cx="${x.pts[k][0].toFixed(1)}" cy="${x.pts[k][1].toFixed(1)}" r="5" fill="${x.color}"/>`).join('');
      const [sx, sy] = x.pts[0];
      return `<polyline points="${poly}" fill="none" stroke="${x.color}" stroke-width="3" stroke-opacity="0.85"/>${dots}`
        + `<circle cx="${sx}" cy="${sy}" r="11" fill="none" stroke="${x.color}" stroke-width="4"/>`
        + `<text x="${sx + 14}" y="${sy - 10}" font-family="Arial" font-size="26" font-weight="bold" fill="${x.color}" stroke="white" stroke-width="5" paint-order="stroke">${esc(x.name)}</text>`;
    }).join('');
    await svgToPng(env, `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">${svg}</svg>`, [w, h], lines);
    ff(env, ['-i', blend, '-i', lines, '-filter_complex', '[0:v][1:v]overlay=format=auto,scale=1200:1200,format=rgb24', '-frames:v', '1', path.join(outDir, 'ghosts.png')]);
  } finally {
    fs.rmSync(ghostDir, { recursive: true, force: true });
  }

  // speed of the same parts (all their properties together), px per frame over the output loop
  const series = speedSeries(inner, model);
  const speedOf = (name) => {
    const own = series.filter((x) => x.part === name);
    return [...Array(op).keys()].map((k) => own.reduce((s, x) => s + x.s[(start + k) % op], 0));
  };
  const W = 1200, H = 600, L = 70, R = 220, T = 30, B = 60;
  const curves = paths.map((x) => ({ ...x, v: speedOf(x.name) }));
  const vmax = Math.max(1, ...curves.flatMap((x) => x.v));
  const X = (k) => L + (k / op) * (W - L - R), Y = (v) => H - B - (v / vmax) * (H - T - B);
  const ticks = [...Array(Math.floor(op / 10) + 1).keys()].map((n) => n * 10);
  const text = (x, y, t, more = '') => `<text x="${x}" y="${y}" font-family="Arial" font-size="16" fill="#555" ${more}>${t}</text>`;
  const chart = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}"><rect width="${W}" height="${H}" fill="white"/>`
    + ticks.map((k) => `<line x1="${X(k)}" y1="${T}" x2="${X(k)}" y2="${H - B}" stroke="#e5e5e5"/>${text(X(k), H - B + 24, k, 'text-anchor="middle"')}`).join('')
    + `<line x1="${L}" y1="${H - B}" x2="${W - R}" y2="${H - B}" stroke="#333"/><line x1="${L}" y1="${T}" x2="${L}" y2="${H - B}" stroke="#333"/>`
    + text(L - 10, T + 6, vmax.toFixed(0), 'text-anchor="end"') + text(L - 10, H - B, 0, 'text-anchor="end"')
    + text((W - R + L) / 2, H - 12, 'loop frame → · speed, px/frame ↑', 'text-anchor="middle"')
    + curves.map((x, i) => `<polyline points="${x.v.map((v, k) => `${X(k + 0.5).toFixed(1)},${Y(v).toFixed(1)}`).join(' ')}" fill="none" stroke="${x.color}" stroke-width="3"/>`
      + `<rect x="${W - R + 20}" y="${T + i * 30}" width="18" height="18" fill="${x.color}"/>${text(W - R + 46, T + i * 30 + 15, esc(x.name), 'fill="#222"')}`).join('')
    + '</svg>';
  await svgToPng(env, chart, [W, H], path.join(outDir, 'speed.png'));
  return ['first.png', 'ghosts.png', 'speed.png'].map((f) => path.join(outDir, f));
}

module.exports = { sheetFromLottie, sheetFromVideo, blurFrames, motionSheets };
