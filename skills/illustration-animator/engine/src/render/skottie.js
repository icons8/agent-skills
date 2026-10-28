// Frames for the judge's sheets drawn by Skia Skottie (canvaskit-wasm) instead of lottie-web in Chrome: no browser to start,
// ~30 ms a frame. Everything here is optional: when canvaskit-wasm is not installed (or a Lottie does not parse) the caller
// falls back to Chrome. Sheets are for the eye of the judge; the delivered GIF/MOV and the frame-0 check stay with lottie-web.
const fs = require('fs');
const os = require('os');
const path = require('path');
const { req, resolve } = require('../setup/deps');

let kit = null;
async function canvasKit() {
  if (kit) return kit;
  const js = resolve('canvaskit-wasm/full');
  kit = await req('canvaskit-wasm/full')({ locateFile: (f) => path.join(path.dirname(js), f) });
  return kit;
}

// true when the package is installed and starts
async function available() {
  try { await canvasKit(); return true; } catch { return false; }
}

// Skottie seeks in frames of the composition, so the Lottie's own `ip` offset is already part of `frame`
async function renderFramesSkottie(lottie, { dir, frames } = {}) {
  const CK = await canvasKit();
  dir = dir || fs.mkdtempSync(path.join(os.tmpdir(), 'animator-'));
  const list = frames || [...Array(lottie.op - lottie.ip).keys()].map((f) => f + lottie.ip);
  const anim = CK.MakeManagedAnimation(JSON.stringify(lottie), {});
  if (!anim) throw new Error('Skottie could not parse the Lottie');
  const { w, h } = lottie;
  const surf = CK.MakeSurface(w, h);
  if (!surf) throw new Error('Skottie could not make a surface');
  try {
    const c = surf.getCanvas();
    for (const [n, f] of list.entries()) {
      c.clear(CK.TRANSPARENT);
      anim.seekFrame(f);
      anim.render(c, CK.LTRBRect(0, 0, w, h));
      surf.flush();
      const img = surf.makeImageSnapshot();
      fs.writeFileSync(path.join(dir, `f${String(n).padStart(4, '0')}.png`), img.encodeToBytes());
      img.delete();
    }
  } finally {
    surf.delete();
    anim.delete();
  }
  return dir;
}

// ---- overlays: lines, dots and labels of ghosts.png and speed.png ----
// A drawing is a list of primitives; the same list becomes SVG for Chrome or paths for CanvasKit.
//   {t:'rect',x,y,w,h,fill} {t:'line',x1,y1,x2,y2,stroke,width} {t:'poly',pts,stroke,width,opacity}
//   {t:'circle',cx,cy,r,fill|stroke,width} {t:'text',x,y,s,size,fill,anchor,bold,halo}
const esc = (t) => String(t).replace(/[<>&"]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;' }[c]));

function toSvg(prims, [W, H]) {
  const body = prims.map((p) => {
    if (p.t === 'rect') return `<rect x="${p.x}" y="${p.y}" width="${p.w}" height="${p.h}" fill="${p.fill}"/>`;
    if (p.t === 'line') return `<line x1="${p.x1}" y1="${p.y1}" x2="${p.x2}" y2="${p.y2}" stroke="${p.stroke}"${p.width ? ` stroke-width="${p.width}"` : ''}/>`;
    if (p.t === 'poly') return `<polyline points="${p.pts.map((q) => q.map((v) => v.toFixed(1)).join(',')).join(' ')}" fill="none" stroke="${p.stroke}" stroke-width="${p.width}"${p.opacity ? ` stroke-opacity="${p.opacity}"` : ''}/>`;
    if (p.t === 'circle') return `<circle cx="${p.cx}" cy="${p.cy}" r="${p.r}" fill="${p.fill || 'none'}"${p.stroke ? ` stroke="${p.stroke}" stroke-width="${p.width}"` : ''}/>`;
    // one fill attribute only: a duplicate makes the SVG invalid XML and Chrome draws a broken-image icon
    return `<text x="${p.x}" y="${p.y}" font-family="Arial" font-size="${p.size}"${p.bold ? ' font-weight="bold"' : ''} fill="${p.fill}"`
      + `${p.anchor ? ` text-anchor="${p.anchor}"` : ''}${p.halo ? ' stroke="white" stroke-width="5" paint-order="stroke"' : ''}>${esc(p.s)}</text>`;
  }).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">${body}</svg>`;
}

// A TrueType font that is already on the machine: CanvasKit has none of its own. null → the caller draws through Chrome.
function systemFont() {
  const win = 'C:\\Windows';
  const list = [
    path.join(win, 'Fonts', 'arial.ttf'), path.join(win, 'Fonts', 'segoeui.ttf'),
    '/System/Library/Fonts/Supplemental/Arial.ttf', '/Library/Fonts/Arial.ttf',
    '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf', '/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf', '/usr/share/fonts/dejavu/DejaVuSans.ttf',
  ];
  return list.find((f) => fs.existsSync(f)) || null;
}

async function overlayPngSkottie(prims, [W, H], out) {
  const font = systemFont();
  if (!font && prims.some((p) => p.t === 'text')) throw new Error('No system font for the labels');
  const CK = await canvasKit();
  const surf = CK.MakeSurface(W, H);
  if (!surf) throw new Error('Could not make a surface');
  const face = font ? CK.Typeface.MakeFreeTypeFaceFromData(fs.readFileSync(font).buffer.slice(0)) : null;
  try {
    const c = surf.getCanvas();
    c.clear(CK.TRANSPARENT);
    const paint = (color, style, width = 1, alpha = 1) => {
      const p = new CK.Paint();
      p.setAntiAlias(true);
      p.setStyle(style === 'stroke' ? CK.PaintStyle.Stroke : CK.PaintStyle.Fill);
      p.setStrokeWidth(width);
      p.setStrokeJoin(CK.StrokeJoin.Round);
      p.setStrokeCap(CK.StrokeCap.Round);
      const col = CK.parseColorString(color);
      col[3] = alpha;
      p.setColor(col);
      return p;
    };
    for (const p of prims) {
      if (p.t === 'rect') { const k = paint(p.fill, 'fill'); c.drawRect(CK.XYWHRect(p.x, p.y, p.w, p.h), k); k.delete(); }
      else if (p.t === 'line') { const k = paint(p.stroke, 'stroke', p.width || 1); c.drawLine(p.x1, p.y1, p.x2, p.y2, k); k.delete(); }
      else if (p.t === 'poly') {
        const k = paint(p.stroke, 'stroke', p.width, p.opacity || 1);
        const line = new CK.PathBuilder().addPolygon(p.pts.flat(), false).detach();
        c.drawPath(line, k);
        line.delete(); k.delete();
      } else if (p.t === 'circle') {
        if (p.fill) { const k = paint(p.fill, 'fill'); c.drawCircle(p.cx, p.cy, p.r, k); k.delete(); }
        if (p.stroke) { const k = paint(p.stroke, 'stroke', p.width); c.drawCircle(p.cx, p.cy, p.r, k); k.delete(); }
      } else if (p.t === 'text') {
        const f = new CK.Font(face, p.size);
        if (p.bold) f.setEmbolden(true);
        let x = p.x;
        if (p.anchor) {
          const w = f.getGlyphWidths(f.getGlyphIDs(p.s)).reduce((s, v) => s + v, 0);
          x -= p.anchor === 'middle' ? w / 2 : p.anchor === 'end' ? w : 0;
        }
        if (p.halo) { const k = paint('#ffffff', 'stroke', 5); c.drawText(p.s, x, p.y, k, f); k.delete(); }
        const k = paint(p.fill, 'fill');
        c.drawText(p.s, x, p.y, k, f);
        k.delete(); f.delete();
      }
    }
    surf.flush();
    const img = surf.makeImageSnapshot();
    fs.writeFileSync(out, img.encodeToBytes());
    img.delete();
  } finally {
    surf.delete();
    if (face) face.delete();
  }
  return out;
}

module.exports = { available, renderFramesSkottie, toSvg, overlayPngSkottie };
