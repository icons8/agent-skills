// For the blind judge of a pair of animations: per video a 4×4 sheet of the loop, a motion sheet (where the picture
// moves, the trail of all positions, the motion energy per frame) and numbers (how much of the drawing is alive, how
// jerky). Plain ffmpeg + a hand-made PNG writer — no image libraries.
const fs = require('fs');
const zlib = require('zlib');
const { execFileSync } = require('child_process');
const { sheetFromVideo } = require('./sheet');

const W = 300; // working width of a frame
const STILL = 0.35; // motion energy per frame below this = the picture stands still

// --- PNG (8-bit RGB) ---
const crcTable = [...Array(256).keys()].map((n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
const crc = (buf) => { let c = 0xffffffff; for (const b of buf) c = crcTable[(c ^ b) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
const chunk = (type, data) => {
  const head = Buffer.alloc(8); head.writeUInt32BE(data.length); head.write(type, 4);
  const tail = Buffer.alloc(4); tail.writeUInt32BE(crc(Buffer.concat([head.subarray(4), data])));
  return Buffer.concat([head, data, tail]);
};
function writePng(file, w, h, rgb) {
  const raw = Buffer.alloc((w * 3 + 1) * h);
  for (let y = 0; y < h; y++) rgb.copy(raw, y * (w * 3 + 1) + 1, y * w * 3, (y + 1) * w * 3);
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(w); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 2;
  fs.writeFileSync(file, Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]));
}

// all frames of the video on white, scaled to W wide, as raw RGB
function decode(tools, video) {
  const probe = JSON.parse(execFileSync(tools.ffprobe, ['-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=width,height,r_frame_rate', '-of', 'json', video]).toString()).streams[0];
  const h = Math.round((probe.height * W) / probe.width);
  const [num, den] = probe.r_frame_rate.split('/').map(Number);
  const codec = execFileSync(tools.ffprobe, ['-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=codec_name', '-of', 'csv=p=0', video]).toString().trim();
  const dec = { vp9: ['-c:v', 'libvpx-vp9'], vp8: ['-c:v', 'libvpx'] }[codec] || [];
  const buf = execFileSync(tools.ffmpeg, ['-v', 'error', ...dec, '-i', video, '-f', 'lavfi', '-i', `color=c=white:s=${probe.width}x${probe.height}`,
    '-filter_complex', `[1:v][0:v]overlay=format=auto:shortest=1,scale=${W}:${h},format=rgb24`, '-f', 'rawvideo', '-'], { maxBuffer: 1 << 30 });
  const size = W * h * 3;
  return { w: W, h, fps: num / den, n: Math.floor(buf.length / size), frame: (i) => buf.subarray(i * size, (i + 1) * size) };
}

const gray = (f, i) => (f[i * 3] * 77 + f[i * 3 + 1] * 150 + f[i * 3 + 2] * 29) >> 8;

// per-pixel range of gray over the loop, mean frame-to-frame change per frame (cyclic), the union of all positions
function analyse(v) {
  const px = v.w * v.h, lo = new Uint8Array(px).fill(255), hi = new Uint8Array(px), union = Buffer.alloc(px * 3, 255);
  const energy = [];
  let prev = v.frame(v.n - 1);
  for (let t = 0; t < v.n; t++) {
    const f = v.frame(t);
    let e = 0;
    for (let i = 0; i < px; i++) {
      const g = gray(f, i);
      if (g < lo[i]) lo[i] = g;
      if (g > hi[i]) hi[i] = g;
      e += Math.abs(g - gray(prev, i));
      for (let c = 0; c < 3; c++) if (f[i * 3 + c] < union[i * 3 + c]) union[i * 3 + c] = f[i * 3 + c];
    }
    energy.push(e / px);
    prev = f;
  }
  return { range: hi.map((x, i) => x - lo[i]), union, energy, lo };
}

// numbers for the judge: how much of the drawing moves, how jerky the motion is, how much of the loop it stands still
function stats(v, a) {
  const px = v.w * v.h;
  let ink = 0, alive = 0;
  for (let i = 0; i < px; i++) {
    if (a.lo[i] < 235) ink++;
    if (a.lo[i] < 235 && a.range[i] >= 40) alive++;
  }
  const sm = a.energy.map((_, t, e) => (e[(t + e.length - 1) % e.length] + e[t] + e[(t + 1) % e.length]) / 3);
  const peak = Math.max(...sm, 1e-6), floor = peak * 0.12;
  // direction changes of the motion energy that are bigger than 12% of its peak: one big swing is 2, a shake is many
  let rev = 0, last = 0;
  for (let t = 0; t < sm.length; t++) {
    const d = sm[(t + 1) % sm.length] - sm[t];
    if (Math.abs(d) < floor / 4) continue;
    const dir = Math.sign(d);
    if (last && dir !== last) rev++;
    last = dir;
  }
  const sec = v.n / v.fps;
  return {
    frames: v.n, fps: v.fps, seconds: +sec.toFixed(2),
    alive_pct: Math.round((100 * alive) / Math.max(ink, 1)),
    mean_motion: +(a.energy.reduce((s, x) => s + x, 0) / a.energy.length).toFixed(2),
    peak_motion: +peak.toFixed(2),
    still_pct: Math.round((100 * a.energy.filter((e) => e < STILL).length) / a.energy.length),
    direction_changes_per_s: +(rev / sec).toFixed(1),
  };
}

// 1200×800: left — where it moves (the first frame faded, moving pixels in red, brighter = bigger move); right — the
// trail (every position of every part at once); bottom — motion energy per frame on an absolute scale (8 = full height)
function motionSheet(v, a, out) {
  const OW = 1200, OH = 800, S = 2, H = v.h * S, buf = Buffer.alloc(OW * OH * 3, 255);
  const put = (x, y, r, g, b) => { if (x >= 0 && x < OW && y >= 0 && y < OH) { const o = (y * OW + x) * 3; buf[o] = r; buf[o + 1] = g; buf[o + 2] = b; } };
  const first = v.frame(0);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < v.w * S; x++) {
      const i = Math.floor(y / S) * v.w + Math.floor(x / S);
      const m = Math.min(1, a.range[i] / 120);
      const base = (c) => 255 - (255 - first[i * 3 + c]) * 0.3;
      put(x, y, Math.round(base(0)), Math.round(base(1) * (1 - m)), Math.round(base(2) * (1 - m)));
      put(x + 600, y, a.union[i * 3], a.union[i * 3 + 1], a.union[i * 3 + 2]);
    }
  }
  const top = 640, hgt = 140;
  for (let x = 0; x < OW; x++) { put(x, top - 1, 200, 200, 200); put(x, top + hgt, 200, 200, 200); }
  for (const lvl of [2, 4, 6]) for (let x = 0; x < OW; x += 4) put(x, top + hgt - Math.round((lvl / 8) * hgt), 225, 225, 225);
  a.energy.forEach((e, t) => {
    const x0 = Math.round((t * OW) / v.n), x1 = Math.max(x0 + 1, Math.round(((t + 1) * OW) / v.n) - 1);
    const y = top + hgt - Math.min(hgt, Math.round((e / 8) * hgt));
    for (let x = x0; x < x1; x++) for (let yy = y; yy < top + hgt; yy++) put(x, yy, 70, 90, 200);
  });
  writePng(out, OW, OH, buf);
}

// <outDir>/<name>-frames.png, <name>-motion.png → numbers
function pairPacket(tools, video, outDir, name) {
  sheetFromVideo(tools, video, `${outDir}/${name}-frames.png`);
  const v = decode(tools, video), a = analyse(v);
  motionSheet(v, a, `${outDir}/${name}-motion.png`);
  return stats(v, a);
}

// the answers of the judge in the two packets (AB: A is X, BA: A is Y) → "A", "B" or "tie"; a winner must be the same
// in both orders, otherwise the pair is a tie
function combine(ab, ba) {
  const who = { AB: { X: 'A', Y: 'B' }, BA: { X: 'B', Y: 'A' } };
  const pick = (answer, order) => (answer.better === 'X' || answer.better === 'Y' ? who[order][answer.better] : 'tie');
  const first = pick(ab, 'AB'), second = pick(ba, 'BA');
  return first === second ? first : 'tie';
}

module.exports = { pairPacket, writePng, decode, analyse, stats, combine };
