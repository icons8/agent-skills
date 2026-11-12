// usage: node engine/bin/lottie-psnr.js <before.json> <after.json> [--frames N]
// PSNR (dB) of two Lotties on white, rendered by lottie-web in Chrome on N frames spread over the loop (default 12): the check that
// a lighter Lottie (bin/optimize.js) still draws the same. Prints the worst frame and the mean; 40 dB and up is not visible.
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');
const { loadTools } = require('../src/setup');
const { renderFrames, killBrowsers } = require('../src/render/frames');

const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
const [a, b] = args.filter((x, i) => !x.startsWith('--') && args[i - 1] !== '--frames');
if (!a || !b) { console.error('Usage: lottie-psnr.js <before.json> <after.json> [--frames N]'); process.exit(2); }

(async () => {
  const tools = loadTools();
  const A = JSON.parse(fs.readFileSync(a, 'utf8')), B = JSON.parse(fs.readFileSync(b, 'utf8'));
  const n = Math.max(1, parseInt(opt('--frames', '12'), 10));
  const len = A.op - A.ip;
  const frames = [...new Set([...Array(n).keys()].map((k) => A.ip + Math.floor((k * len) / n)))];
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'lottie-psnr-'));
  try {
    const da = path.join(tmp, 'a'), db = path.join(tmp, 'b');
    fs.mkdirSync(da); fs.mkdirSync(db);
    await renderFrames(A, tools, { dir: da, frames });
    await renderFrames(B, tools, { dir: db, frames });
    killBrowsers();
    const sz = `${A.w}x${A.h}`;
    const f = `color=white:s=${sz}[bg1];color=white:s=${sz}[bg2];[bg1][0:v]overlay=shortest=1[x];[bg2][1:v]overlay=shortest=1[y];[x][y]psnr=stats_file=${path.join(tmp, 'p.txt')}`;
    const r = spawnSync(tools.ffmpeg, ['-v', 'error', '-framerate', '1', '-i', path.join(da, 'f%04d.png'), '-framerate', '1', '-i', path.join(db, 'f%04d.png'), '-filter_complex', f, '-f', 'null', '-'], { encoding: 'utf8' });
    if (r.status !== 0) throw new Error(r.stderr);
    const vals = fs.readFileSync(path.join(tmp, 'p.txt'), 'utf8').trim().split('\n').map((l) => Number(/psnr_avg:(\S+)/.exec(l)[1]));
    const fin = vals.map((v) => (v === Infinity || !Number.isFinite(v) ? 99 : v));
    console.log(`frames ${frames.length}  min ${Math.min(...fin).toFixed(1)} dB  mean ${(fin.reduce((x, y) => x + y, 0) / fin.length).toFixed(1)} dB`);
  } finally { fs.rmSync(tmp, { recursive: true, force: true }); }
})().catch((e) => { console.error(e.message); killBrowsers(); process.exit(1); });
