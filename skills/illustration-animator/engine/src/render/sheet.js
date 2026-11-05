// For the visual judge: a 4×4 contact sheet on white and motion-blur frames, from a Lottie or a video; for a scene also
// the first frame of the loop large, ghosts of the loop with the path of every moving part, and the speed of each part.
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');
const { renderFrames: renderChrome, withPage } = require('./frames');
const skottie = require('./skottie');
const { worldMatrix, apply } = require('../lottie/evaluate');
const { valueAt } = require('../lottie/keys');
const { weights, pose, deformPoint } = require('../bones/skin');
const { speedSeries } = require('../check/motion');

// Frames of a sheet: Skottie when canvaskit-wasm is installed (no browser, ~0.15 s a frame), otherwise lottie-web in Chrome.
// Both draw the same picture (PSNR 46–59 dB on the Black Chalk scenes), so a sheet looks the same either way.
async function renderFrames(lottie, tools, opts) {
  if (await skottie.available()) {
    try { return await skottie.renderFramesSkottie(lottie, opts); } catch (e) { console.error(`Skottie failed (${e.message}), drawing through Chrome`); }
  }
  return renderChrome(lottie, tools, opts);
}

const ff = (tools, args) => execFileSync(tools.ffmpeg, ['-y', '-loglevel', 'error', ...args]);
const pick = (total, n) => [...Array(n).keys()].map((i) => Math.floor((i * total) / n));
const tmpDir = () => fs.mkdtempSync(path.join(os.tmpdir(), 'animator-sheet-'));

// <dir>/f0000.png … f00NN.png → one sheet of n cells on white
function tile(tools, dir, out, n) {
  const cols = Math.round(Math.sqrt(n)), cell = 1200 / cols;
  ff(tools, ['-framerate', '1', '-i', path.join(dir, 'f%04d.png'), '-f', 'lavfi', '-i', 'color=c=white:s=1200x1200',
    '-filter_complex', `[0:v]scale=${cell}:${cell},tile=${cols}x${cols}[t];[1:v][t]overlay=format=auto,format=rgb24`,
    '-frames:v', '1', out]);
  return out;
}

async function sheetFromLottie(lottie, tools, out, { n = 16 } = {}) {
  const frames = pick(lottie.op - lottie.ip, n).map((f) => f + lottie.ip);
  const dir = await renderFrames(lottie, tools, { frames });
  try { return tile(tools, dir, out, n); } finally { fs.rmSync(dir, { recursive: true, force: true }); }
}

// The legs large: <dir>/f*.png cropped to box = [x, y, w, h] (frame pixels) and tiled 4 per row, 400 px a cell.
// A leg on the 16-frame sheet is a quarter of its size: which way a knee bends and where a foot points cannot be read there.
function tileCrop(tools, dir, out, n, [x, y, w, h]) {
  const cw = 400, ch = Math.round((h * cw) / w), rows = Math.ceil(n / 4);
  ff(tools, ['-framerate', '1', '-i', path.join(dir, 'f%04d.png'), '-f', 'lavfi', '-i', `color=c=white:s=${4 * cw}x${rows * ch}`,
    '-filter_complex', `[0:v]crop=${w}:${h}:${x}:${y},scale=${cw}:${ch},drawbox=x=0:y=0:w=iw:h=ih:color=gray@0.6:t=2,tile=4x${rows}[t];[1:v][t]overlay=format=auto,format=rgb24`,
    '-frames:v', '1', out]);
  return out;
}

const LEG = /^(?:[LR]?LEG(?:_\w+|\d*)|THIGH|SHIN|KNEE|BOOT|FOOT|SHOE|PAW)(?:_\w+)?$/i;

// where the legs are: the box round the joints of the leg parts over the loop, down to the bottom edge
function legBox(inner, model) {
  const { w, h, op } = model;
  const pts = [];
  for (const p of Object.values(model.parts)) {
    if (!LEG.test(String(p.name).split('·')[0])) continue;
    for (let k = 0; k < op; k += 4) pts.push(trackPoint(inner, p, k));
  }
  if (!pts.length) return null;
  const xs = pts.map((q) => q[0]), ys = pts.map((q) => q[1]);
  const x0 = Math.max(0, Math.min(...xs) - 0.2 * w), x1 = Math.min(w, Math.max(...xs) + 0.2 * w);
  const y0 = Math.max(0, Math.min(...ys) - 0.05 * h);
  return [Math.round(x0), Math.round(y0), Math.round(x1 - x0), Math.round(h - y0)].map((v, i) => (i > 1 ? v - (v % 2) : v));
}

// legs.png for a scene with leg parts; null when there are none
async function legSheet(lottie, inner, model, tools, out, { n = 16 } = {}) {
  const box = legBox(inner, model);
  if (!box) return null;
  const frames = pick(lottie.op - lottie.ip, n).map((f) => f + lottie.ip);
  const dir = await renderFrames(lottie, tools, { frames });
  try {
    // render on white first: the frames are transparent
    const white = tmpDir();
    try {
      ff(tools, ['-framerate', '1', '-i', path.join(dir, 'f%04d.png'), '-f', 'lavfi', '-i', `color=c=white:s=${lottie.w}x${lottie.h}:r=1`,
        '-filter_complex', '[1:v][0:v]overlay=format=auto:shortest=1,format=rgb24', '-start_number', '0', path.join(white, 'f%04d.png')]);
      return tileCrop(tools, white, out, n, box);
    } finally { fs.rmSync(white, { recursive: true, force: true }); }
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
}

// the lower part of a video (default: below `from` of the height) as the same 4-per-row sheet — the legs of a pair
function legSheetFromVideo(tools, video, out, { n = 16, from = 0.5 } = {}) {
  const all = tmpDir(), dir = tmpDir();
  try {
    const probe = JSON.parse(execFileSync(tools.ffprobe, ['-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=width,height,codec_name,r_frame_rate', '-of', 'json', video]).toString()).streams[0];
    const dec = { vp9: ['-c:v', 'libvpx-vp9'], vp8: ['-c:v', 'libvpx'] }[probe.codec_name] || [];
    ff(tools, [...dec, '-i', video, '-f', 'lavfi', '-i', `color=c=white:s=${probe.width}x${probe.height}:r=${probe.r_frame_rate}`,
      '-filter_complex', '[1:v][0:v]overlay=format=auto:shortest=1,format=rgb24', path.join(all, 'a%05d.png')]);
    const files = fs.readdirSync(all).sort();
    if (!files.length) throw new Error(`Video has no frames: ${video}`);
    pick(files.length, n).forEach((k, i) => fs.copyFileSync(path.join(all, files[k]), path.join(dir, `f${String(i).padStart(4, '0')}.png`)));
    const y = Math.round(probe.height * from), h = probe.height - y;
    return tileCrop(tools, dir, out, n, [0, y, probe.width, h - (h % 2)]);
  } finally {
    fs.rmSync(all, { recursive: true, force: true });
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

function sheetFromVideo(tools, video, out, { n = 16 } = {}) {
  const all = tmpDir(), dir = tmpDir();
  try {
    // libvpx decoders keep the webm alpha; pick the one matching the stream (Icons8 previews are VP8)
    const codec = execFileSync(tools.ffprobe, ['-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=codec_name', '-of', 'csv=p=0', video]).toString().trim();
    const dec = { vp9: ['-c:v', 'libvpx-vp9'], vp8: ['-c:v', 'libvpx'] }[codec] || [];
    ff(tools, [...dec, '-i', video, path.join(all, 'a%05d.png')]);
    const files = fs.readdirSync(all).sort();
    if (!files.length) throw new Error(`Video has no frames: ${video}`);
    pick(files.length, n).forEach((k, i) => fs.copyFileSync(path.join(all, files[k]), path.join(dir, `f${String(i).padStart(4, '0')}.png`)));
    return tile(tools, dir, out, n);
  } finally {
    fs.rmSync(all, { recursive: true, force: true });
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

// setpts: ffmpeg 9 keeps the timestamp of the 5th frame, so overlay would never see the blur layer without it.
// n moments evenly over the loop; each is `span` neighbouring frames averaged
async function blurFrames(lottie, tools, outDir, { n = 4, span = 5 } = {}) {
  const op = lottie.op - lottie.ip;
  const out = [];
  for (let i = 0; i < n; i++) {
    const c = Math.floor((i * op) / n + op / (2 * n));
    const frames = [...Array(span).keys()].map((k) => lottie.ip + ((((c - (span >> 1) + k) % op) + op) % op));
    const dir = await renderFrames(lottie, tools, { frames });
    const file = path.join(outDir, `blur-${i + 1}.png`);
    try {
      ff(tools, ['-framerate', '30', '-i', path.join(dir, 'f%04d.png'), '-f', 'lavfi', '-i', `color=c=white:s=${lottie.w}x${lottie.h}`,
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

// SVG markup → transparent PNG of the same size, drawn by Chrome as an <img> from a data: URL, never as page markup:
// an image runs no scripts or handlers and loads nothing external
async function svgToPng(tools, svg, [W, H], out) {
  await withPage(tools, [W, H], async (page) => {
    const src = `data:image/svg+xml;base64,${Buffer.from(svg, 'utf8').toString('base64')}`;
    await page.setContent(`<html><body style="margin:0;background:transparent"><img id="i" src="${src}" width="${W}" height="${H}" style="display:block"></body></html>`);
    await page.waitForFunction(() => document.getElementById('i').complete);
    await page.screenshot({ path: out, clip: { x: 0, y: 0, width: W, height: H }, omitBackground: true });
  });
  return out;
}

// lines, dots and labels as primitives (see skottie.js): CanvasKit draws them, Chrome is the fallback
async function overlayPng(tools, prims, size, out) {
  if (await skottie.available()) {
    try { return await skottie.overlayPngSkottie(prims, size, out); } catch (e) { console.error(`Skottie overlay failed (${e.message}), drawing through Chrome`); }
  }
  return svgToPng(tools, skottie.toSvg(prims, size), size, out);
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
async function motionSheets(lottie, inner, model, tools, outDir) {
  const { w, h, op } = model;
  const start = (op - model.keyFrame) % op; // authoring frame shown at output frame 0
  const onWhite = (src, out) => ff(tools, ['-i', src, '-f', 'lavfi', '-i', `color=c=white:s=${w}x${h}`,
    '-filter_complex', '[1:v][0:v]overlay=format=auto,scale=1200:1200,format=rgb24', '-frames:v', '1', out]);

  const one = await renderFrames(lottie, tools, { frames: [lottie.ip] });
  try { onWhite(path.join(one, 'f0000.png'), path.join(outDir, 'first.png')); } finally { fs.rmSync(one, { recursive: true, force: true }); }

  // seam.png — the last frame of the loop, the first frame and their difference: the step the eye makes when the loop restarts
  const lastF = lottie.op - 1;
  const two = await renderFrames(lottie, tools, { frames: [lastF, lottie.ip] });
  try {
    ff(tools, ['-i', path.join(two, 'f0000.png'), '-i', path.join(two, 'f0001.png'), '-f', 'lavfi', '-i', `color=c=white:s=${w}x${h}`,
      '-filter_complex', '[2:v]split[w1][w2];[w1][0:v]overlay=format=auto[a];[w2][1:v]overlay=format=auto[b];[a]split[a1][a2];[b]split[b1][b2];[a2][b2]blend=all_mode=difference,negate[d];[a1][b1][d]hstack=inputs=3,scale=1800:-1,format=rgb24',
      '-frames:v', '1', path.join(outDir, 'seam.png')]);
  } finally { fs.rmSync(two, { recursive: true, force: true }); }

  // the parts that travel most, with their paths in output order
  const paths = Object.values(model.parts).map((p) => {
    const pts = [];
    for (let k = 0; k <= op; k++) pts.push(trackPoint(inner, p, (start + k) % op));
    const len = pts.slice(1).reduce((s, q, k) => s + Math.hypot(q[0] - pts[k][0], q[1] - pts[k][1]), 0);
    return { name: p.name, pts, len };
  }).filter((x) => x.len > 3).sort((a, b) => b.len - a.len).slice(0, COLORS.length);
  paths.forEach((x, i) => { x.color = COLORS[i]; });

  const frames = pick(op, 16);
  const ghostDir = await renderFrames(lottie, tools, { frames: frames.map((f) => f + lottie.ip) });
  const blend = path.join(ghostDir, 'blend.png'), lines = path.join(ghostDir, 'lines.png');
  try {
    // average of 16 frames on white: still parts stay solid, moving ones turn into ghosts
    ff(tools, ['-framerate', '16', '-i', path.join(ghostDir, 'f%04d.png'), '-f', 'lavfi', '-i', `color=c=white:s=${w}x${h}`,
      '-filter_complex', '[1:v][0:v]overlay=format=auto:shortest=1,tmix=frames=16,select=eq(n\\,15),setpts=PTS-STARTPTS,format=rgb24',
      '-frames:v', '1', blend]);
    const prims = paths.flatMap((x) => {
      const [sx, sy] = x.pts[0];
      return [{ t: 'poly', pts: x.pts, stroke: x.color, width: 3, opacity: 0.85 },
        ...frames.map((k) => ({ t: 'circle', cx: +x.pts[k][0].toFixed(1), cy: +x.pts[k][1].toFixed(1), r: 5, fill: x.color })),
        { t: 'circle', cx: sx, cy: sy, r: 11, stroke: x.color, width: 4 },
        { t: 'text', x: sx + 14, y: sy - 10, s: x.name, size: 26, bold: true, fill: x.color, halo: true }];
    });
    await overlayPng(tools, prims, [w, h], lines);
    ff(tools, ['-i', blend, '-i', lines, '-filter_complex', '[0:v][1:v]overlay=format=auto,scale=1200:1200,format=rgb24', '-frames:v', '1', path.join(outDir, 'ghosts.png')]);
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
  // the whole frame: every animated property of every part together (black, thick)
  const whole = [...Array(op).keys()].map((k) => series.reduce((s, x) => s + x.s[(start + k) % op], 0));
  const vmax = Math.max(1, ...curves.flatMap((x) => x.v), ...whole);
  const X = (k) => L + (k / op) * (W - L - R), Y = (v) => H - B - (v / vmax) * (H - T - B);
  const ticks = [...Array(Math.floor(op / 10) + 1).keys()].map((n) => n * 10);
  const text = (x, y, t, anchor, fill = '#555') => ({ t: 'text', x, y, s: String(t), size: 16, fill, anchor });
  const chart = [{ t: 'rect', x: 0, y: 0, w: W, h: H, fill: 'white' },
    ...ticks.flatMap((k) => [{ t: 'line', x1: X(k), y1: T, x2: X(k), y2: H - B, stroke: '#e5e5e5' }, text(X(k), H - B + 24, k, 'middle')]),
    { t: 'line', x1: L, y1: H - B, x2: W - R, y2: H - B, stroke: '#333' }, { t: 'line', x1: L, y1: T, x2: L, y2: H - B, stroke: '#333' },
    text(L - 10, T + 6, vmax.toFixed(0), 'end'), text(L - 10, H - B, 0, 'end'),
    text((W - R + L) / 2, H - 12, 'loop frame → · speed, px/frame ↑', 'middle'),
    { t: 'poly', pts: whole.map((v, k) => [X(k + 0.5), Y(v)]), stroke: '#000', width: 6, opacity: 0.35 },
    { t: 'rect', x: W - R + 20, y: H - B - 24, w: 18, h: 18, fill: '#000' }, text(W - R + 46, H - B - 9, 'whole frame', undefined, '#222'),
    ...curves.flatMap((x, i) => [{ t: 'poly', pts: x.v.map((v, k) => [X(k + 0.5), Y(v)]), stroke: x.color, width: 3 },
      { t: 'rect', x: W - R + 20, y: T + i * 30, w: 18, h: 18, fill: x.color }, text(W - R + 46, T + i * 30 + 15, x.name, undefined, '#222')])];
  await overlayPng(tools, chart, [W, H], path.join(outDir, 'speed.png'));
  return ['first.png', 'seam.png', 'ghosts.png', 'speed.png'].map((f) => path.join(outDir, f));
}

module.exports = { sheetFromLottie, sheetFromVideo, blurFrames, motionSheets, legSheet, legSheetFromVideo };
