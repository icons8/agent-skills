// "No painted-in white": a style without a paper colour (Tint: transparent paper, ink #0E43B3 and watercolour #089EFF only) must not
// get white, pale or any other colour its source does not have. A white body under a moving part hides what is behind it, and
// on the white preview it is invisible; on a grey or coloured background it is a white blot of the part's shape. Under a
// translucent watercolour the same white reads as an OPAQUE PALE BLUE, so the alpha is checked against the source too.
// What hides the back piece instead: an inverted alpha matte of the front piece (a layer with td=1, the target with tt:2).
//   lintLottie(lottie, source)   no render: fills, strokes and solid layers, raster assets
//   checkFrames(files, source)   transparent PNG frames of the Lottie (what the hand-over shows), frame 0 against the source PNG
// source = sourceInfo(<svg|png>) — what colours the source has; null/undefined = the Tint pair of inks.
const fs = require('fs');
const zlib = require('zlib');

const PAPERLESS_STYLES = new Set(['tint']);   // styles whose paper is transparent: no white anywhere, grey sheets for the judge
const isPaperless = (style) => PAPERLESS_STYLES.has(String(style || '').toLowerCase());
const INK = ['#0e43b3', '#089eff'];       // DARK and LIGHT of tools/raster-source/rs.py: the only two colours a Tint source has
const WHITE_FRAC = 0.0002;                // a frame: more than ~300 px of 1200x1200 is a finding (the analyst's threshold)
const RASTER_FRAC = 0.001;                // a raster asset: more than 0.1 % of its pixels
const ALPHA_MIN = 25;                     // a semi-transparent white glow is white too (the watercolour keeps its blue RGB at any alpha)
const WHITE_MIN = 235;                    // min(R,G,B) of white
const PALE_MIN = 140;                     // Tint inks are dark (min RGB ~11) and saturated blue (~8) at ANY alpha: an OPAQUE pixel above this is paper colour
const SOLID_ALPHA = 200;

// ---- PNG: 8/16 bit, grey / RGB / palette / grey+alpha / RGBA, not interlaced → RGBA bytes ----
function decodePng(buf) {
  if (buf.length < 33 || buf.readUInt32BE(0) !== 0x89504e47) throw new Error('not a PNG');
  let pos = 8, w = 0, h = 0, depth = 8, type = 6, interlace = 0, plte = null, trns = null;
  const idat = [];
  while (pos + 8 <= buf.length) {
    const len = buf.readUInt32BE(pos), kind = buf.toString('latin1', pos + 4, pos + 8), body = buf.subarray(pos + 8, pos + 8 + len);
    if (kind === 'IHDR') { w = body.readUInt32BE(0); h = body.readUInt32BE(4); depth = body[8]; type = body[9]; interlace = body[12]; }
    else if (kind === 'PLTE') plte = body;
    else if (kind === 'tRNS') trns = body;
    else if (kind === 'IDAT') idat.push(body);
    else if (kind === 'IEND') break;
    pos += 12 + len;
  }
  if (interlace) throw new Error('interlaced PNG is not supported');
  if (depth !== 8 && depth !== 16) throw new Error(`PNG bit depth ${depth} is not supported`);
  const ch = { 0: 1, 2: 3, 3: 1, 4: 2, 6: 4 }[type];
  if (!ch) throw new Error(`PNG colour type ${type} is not supported`);
  const bpp = ch * (depth / 8), stride = w * bpp;
  const raw = zlib.inflateSync(Buffer.concat(idat));
  const px = Buffer.alloc(h * stride);
  for (let y = 0; y < h; y++) {
    const f = raw[y * (stride + 1)], src = y * (stride + 1) + 1, dst = y * stride;
    for (let x = 0; x < stride; x++) {
      const a = x >= bpp ? px[dst + x - bpp] : 0, b = y ? px[dst - stride + x] : 0, c = x >= bpp && y ? px[dst - stride + x - bpp] : 0;
      let v = raw[src + x];
      if (f === 1) v += a; else if (f === 2) v += b; else if (f === 3) v += (a + b) >> 1;
      else if (f === 4) { const p = a + b - c, pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c); v += pa <= pb && pa <= pc ? a : pb <= pc ? b : c; }
      px[dst + x] = v & 255;
    }
  }
  const out = new Uint8Array(w * h * 4), step = depth / 8;
  for (let i = 0; i < w * h; i++) {
    const o = i * ch * step, q = i * 4;
    const g = (k) => px[o + k * step];            // 16 bit: the high byte
    if (type === 6) { out[q] = g(0); out[q + 1] = g(1); out[q + 2] = g(2); out[q + 3] = g(3); }
    else if (type === 2) { out[q] = g(0); out[q + 1] = g(1); out[q + 2] = g(2); out[q + 3] = 255; }
    else if (type === 0) { out[q] = out[q + 1] = out[q + 2] = g(0); out[q + 3] = 255; }
    else if (type === 4) { out[q] = out[q + 1] = out[q + 2] = g(0); out[q + 3] = g(1); }
    else { const k = g(0); out[q] = plte[k * 3]; out[q + 1] = plte[k * 3 + 1]; out[q + 2] = plte[k * 3 + 2]; out[q + 3] = trns && k < trns.length ? trns[k] : 255; }
  }
  return { w, h, data: out };
}

// ---- the source ----
const NAMED = { white: '#ffffff', black: '#000000' };
function parseColor(s) {
  s = String(s).trim().toLowerCase();
  if (NAMED[s]) return NAMED[s];
  let m = s.match(/^#([0-9a-f]{3})$/);
  if (m) return '#' + [...m[1]].map((c) => c + c).join('');
  m = s.match(/^#([0-9a-f]{6})/);
  if (m) return '#' + m[1];
  m = s.match(/^rgba?\(\s*(\d+)[\s,]+(\d+)[\s,]+(\d+)/);
  if (m) return '#' + [m[1], m[2], m[3]].map((v) => Number(v).toString(16).padStart(2, '0')).join('');
  return null;
}
const light = (hex) => Math.min(parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16));

// An SVG: the colours of its fills, strokes and gradient stops. A PNG: how light its opaque pixels get and its alpha (for frame 0).
function sourceInfo(file) {
  if (!file) return null;
  if (/\.svg$/i.test(file)) {
    const svg = fs.readFileSync(file, 'utf8');
    const colors = new Set();
    for (const m of svg.matchAll(/(?:fill|stroke|stop-color)\s*[=:]\s*["']?\s*(#[0-9a-fA-F]{3,6}|rgba?\([^)]*\)|[a-zA-Z]+)/g)) {
      const c = parseColor(m[1]);
      if (c) colors.add(c);
    }
    // a path without any fill attribute is black
    return { kind: 'svg', colors: [...colors], lightest: Math.max(0, ...[...colors].map(light)), gradient: /<(?:linear|radial)Gradient/.test(svg) };
  }
  const img = decodePng(fs.readFileSync(file));
  const hist = new Uint32Array(256);
  let opaque = 0;
  for (let i = 0; i < img.w * img.h; i++) {
    const q = i * 4;
    if (img.data[q + 3] > SOLID_ALPHA) { hist[Math.min(img.data[q], img.data[q + 1], img.data[q + 2])]++; opaque++; }
  }
  let acc = 0, lightest = 0;
  for (let v = 255; v >= 0; v--) { acc += hist[v]; if (acc > opaque * 0.001) { lightest = v; break; } }   // the 99.9th percentile: a lone AA pixel does not count
  return { kind: 'png', colors: INK, lightest, gradient: false, w: img.w, h: img.h, alpha: Uint8Array.from({ length: img.w * img.h }, (_, i) => img.data[i * 4 + 3]) };
}

// thresholds for a source: white is checked only when the source has none; pale is "lighter than anything the source has" (never below PALE_MIN)
function limits(source) {
  const lightest = source ? source.lightest : 0;
  return { white: lightest < WHITE_MIN, pale: Math.max(PALE_MIN, Math.min(WHITE_MIN, lightest + 30)) };
}

// ---- no render: the Lottie itself ----
const hexOf = (c) => '#' + c.slice(0, 3).map((v) => Math.max(0, Math.min(255, Math.round(Number(v) * 255))).toString(16).padStart(2, '0')).join('');
const near = (a, b) => [1, 3, 5].every((i) => Math.abs(parseInt(a.substr(i, 2), 16) - parseInt(b.substr(i, 2), 16)) <= 3);

function walkShapes(items, where, ok, lim, found, gradient) {
  for (const it of items || []) {
    if (it.ty === 'gr') walkShapes(it.it, where, ok, lim, found, gradient);
    else if (it.ty === 'gf' || it.ty === 'gs') { if (!gradient) found.push({ where, what: `${it.ty === 'gf' ? 'fill' : 'stroke'} gradient (the source has none)`, hard: true }); }
    else if (it.ty === 'fl' || it.ty === 'st') {
      const c = it.c && it.c.k, op = it.o ? it.o.k : 100;
      if (Array.isArray(c) && typeof c[0] === 'number') {
        if (typeof op === 'number' && op <= 0) continue;
        const h = hexOf(c);
        if (!ok.some((k) => near(h, k))) {
          const white = lim.white && light(h) >= WHITE_MIN;
          found.push({ where, what: `${it.ty === 'fl' ? 'fill' : 'stroke'} colour ${h}${white ? '' : ' (not in the source, not white)'}`, hard: white });
        }
      } else if (Array.isArray(c)) found.push({ where, what: `${it.ty === 'fl' ? 'fill' : 'stroke'} with animated colour`, hard: false });
    }
  }
}

function lintLottie(lottie, source) {
  const ok = source ? source.colors : INK, lim = limits(source), found = [];
  const all = [...lottie.layers];
  const visit = (layers, tag) => {
    for (const L of layers) {
      if (L.td === 1 || L.hd) continue;                // a matte layer is never seen itself
      const where = tag + (L.nm || '?');
      if (L.ty === 4) walkShapes(L.shapes, where, ok, lim, found, source && source.gradient);
      if (L.ty === 1) {
        const h = String(L.sc || '').toLowerCase();
        if (!ok.some((k) => near(h, k))) found.push({ where, what: `solid layer colour ${h}`, hard: lim.white && /^#[0-9a-f]{6}$/.test(h) && light(h) >= WHITE_MIN });
      }
    }
  };
  visit(lottie.layers, '');
  for (const a of lottie.assets || []) if (a.layers) { visit(a.layers, `${a.id}/`); all.push(...a.layers); }
  for (const a of lottie.assets || []) {
    if (!/^data:image\/png/.test(a.p || '')) continue;
    const users = all.filter((L) => L.refId === a.id);
    if (users.length && users.every((L) => L.td === 1 || L.hd)) continue;   // only a matte uses it
    let img;
    try { img = decodePng(Buffer.from(a.p.split(',', 2)[1], 'base64')); } catch (e) { continue; }
    let n = 0;
    for (let i = 0; i < img.w * img.h; i++) { const q = i * 4; if (isWhite(img.data, q, lim)) n++; }
    if (n / (img.w * img.h) > RASTER_FRAC) found.push({ where: users.map((L) => L.nm).join(',') || a.id, what: `raster piece has ${(100 * n / (img.w * img.h)).toFixed(1)}% painted-in white or opaque pale pixels`, hard: true });
  }
  return found;
}

// white (even translucent) or opaque pale
function isWhite(d, q, lim) {
  const m = Math.min(d[q], d[q + 1], d[q + 2]);
  return (lim.white && d[q + 3] > ALPHA_MIN && m >= WHITE_MIN) || (d[q + 3] > SOLID_ALPHA && m > lim.pale);
}

// ---- the rendered frames: transparent PNG files, in order ----
function checkFrames(files, source) {
  const lim = limits(source), found = [];
  if (!files.length) return [{ where: '-', what: 'no frames to check', hard: true }];
  files.forEach((f, i) => {
    const img = decodePng(fs.readFileSync(f));
    const n = img.w * img.h;
    let white = 0;
    for (let p = 0; p < n; p++) if (isWhite(img.data, p * 4, lim)) white++;
    const name = require('path').basename(f);
    if (white / n > WHITE_FRAC) found.push({ where: name, what: `white or opaque pale ${(100 * white / n).toFixed(2)}% of the frame`, hard: true });
    if (i === 0 && source && source.alpha) {
      // frame 0 must be the source: opaque pixels where the source is empty, or opaque pale where the source watercolour is translucent
      const k = Math.min(img.w / source.w, img.h / source.h), dx = (img.w - source.w * k) / 2, dy = (img.h - source.h * k) / 2;
      let extra = 0, solid = 0;
      for (let y = 0; y < img.h; y++) {
        const sy = Math.floor((y - dy) / k);
        for (let x = 0; x < img.w; x++) {
          const sx = Math.floor((x - dx) / k), q = (y * img.w + x) * 4;
          const sa = sy >= 0 && sy < source.h && sx >= 0 && sx < source.w ? source.alpha[sy * source.w + sx] : 0;
          if (img.data[q + 3] > SOLID_ALPHA && sa < 20) extra++;
          else if (img.data[q + 3] > 230 && sa > 20 && sa < 170 && Math.min(img.data[q], img.data[q + 1], img.data[q + 2]) > lim.pale) solid++;
        }
      }
      if (extra / n > WHITE_FRAC) found.push({ where: name, what: `frame 0: ${(100 * extra / n).toFixed(2)}% opaque where the source PNG is transparent`, hard: true });
      if (solid / n > WHITE_FRAC) found.push({ where: name, what: `frame 0: ${(100 * solid / n).toFixed(2)}% opaque pale where the source watercolour is translucent`, hard: true });
    }
  });
  return found;
}

// lint + (with frames) the rendered frames of a Lottie object. Skottie when installed, otherwise Chrome; every `step`-th frame.
async function checkLottie(lottie, { source = null, frames = false, step = 1, tools = null } = {}) {
  const found = lintLottie(lottie, source);
  if (!frames) return found;
  const os = require('os'), path = require('path');
  const list = [];
  for (let f = lottie.ip; f < lottie.op; f += Math.max(1, step)) list.push(f);
  const skottie = require('../render/skottie');
  let dir = null;
  if (await skottie.available()) {
    try { dir = await skottie.renderFramesSkottie(lottie, { frames: list }); } catch (e) { dir = null; }
  }
  if (!dir) dir = await require('../render/frames').renderFrames(lottie, tools, { frames: list });
  try {
    const files = fs.readdirSync(dir).filter((x) => /^f\d+\.png$/.test(x)).sort().map((x) => path.join(dir, x));
    // the name of a finding is the frame number of the Lottie, not the file order
    const named = checkFrames(files, source).map((x) => ({ ...x, where: x.where.replace(/^f0*(\d+)\.png$/, (m, n) => `frame ${list[Number(n)] ?? n}`) }));
    return found.concat(named);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
}

const HINT = 'Paper of this style is transparent: remove the painted-in white. Hide what is behind a moving part by cutting the back piece with an inverted alpha matte of the front piece (layer td=1, target tt:2); never cover it with a white fill.';

module.exports = { checkLottie, PAPERLESS_STYLES, isPaperless, decodePng, sourceInfo, limits, lintLottie, checkFrames, HINT, INK, WHITE_FRAC, RASTER_FRAC };
