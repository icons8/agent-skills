// SVG -> flat list of filled elements in output space (fit into size×size, centred).
const fs = require('fs');
const { req } = require('../env/deps');

const I = [1, 0, 0, 1, 0, 0];
const mul = (m, n) => [
  m[0] * n[0] + m[2] * n[1], m[1] * n[0] + m[3] * n[1],
  m[0] * n[2] + m[2] * n[3], m[1] * n[2] + m[3] * n[3],
  m[0] * n[4] + m[2] * n[5] + m[4], m[1] * n[4] + m[3] * n[5] + m[5],
];

function parseTransform(str) {
  let m = I;
  if (!str) return m;
  const re = /(\w+)\s*\(([^)]*)\)/g;
  let t;
  while ((t = re.exec(str))) {
    const a = t[2].trim().split(/[\s,]+/).map(Number);
    let n = I;
    switch (t[1]) {
      case 'translate': n = [1, 0, 0, 1, a[0], a[1] || 0]; break;
      case 'scale': n = [a[0], 0, 0, a[1] ?? a[0], 0, 0]; break;
      case 'matrix': n = a; break;
      case 'rotate': {
        const r = (a[0] * Math.PI) / 180, c = Math.cos(r), s = Math.sin(r);
        n = [c, s, -s, c, 0, 0];
        if (a.length === 3) n = mul(mul([1, 0, 0, 1, a[1], a[2]], n), [1, 0, 0, 1, -a[1], -a[2]]);
        break;
      }
    }
    m = mul(m, n);
  }
  return m;
}

const attrs = (s) => {
  const o = {};
  s.replace(/([\w:-]+)\s*=\s*"([^"]*)"/g, (_, k, v) => (o[k] = v));
  return o;
};

function toPathD(tag, a) {
  const n = (k, d = 0) => (a[k] !== undefined ? parseFloat(a[k]) : d);
  if (tag === 'path') return a.d;
  if (tag === 'rect') {
    const x = n('x'), y = n('y'), w = n('width'), h = n('height');
    let rx = n('rx', NaN), ry = n('ry', NaN);
    if (isNaN(rx)) rx = isNaN(ry) ? 0 : ry;
    if (isNaN(ry)) ry = rx;
    rx = Math.min(rx, w / 2); ry = Math.min(ry, h / 2);
    if (!rx) return `M${x} ${y}H${x + w}V${y + h}H${x}Z`;
    return `M${x + rx} ${y}H${x + w - rx}A${rx} ${ry} 0 0 1 ${x + w} ${y + ry}V${y + h - ry}A${rx} ${ry} 0 0 1 ${x + w - rx} ${y + h}H${x + rx}A${rx} ${ry} 0 0 1 ${x} ${y + h - ry}V${y + ry}A${rx} ${ry} 0 0 1 ${x + rx} ${y}Z`;
  }
  if (tag === 'polygon' || tag === 'polyline') {
    const n = (a.points || '').trim().split(/[\s,]+/).map(Number);
    if (n.length < 4) return null;
    return 'M' + n.join(' ') + (tag === 'polygon' ? 'Z' : '');
  }
  if (tag === 'circle' || tag === 'ellipse') {
    const cx = n('cx'), cy = n('cy');
    const rx = tag === 'circle' ? n('r') : n('rx'), ry = tag === 'circle' ? n('r') : n('ry');
    return `M${cx + rx} ${cy}A${rx} ${ry} 0 0 1 ${cx} ${cy + ry}A${rx} ${ry} 0 0 1 ${cx - rx} ${cy}A${rx} ${ry} 0 0 1 ${cx} ${cy - ry}A${rx} ${ry} 0 0 1 ${cx + rx} ${cy}Z`;
  }
  return null;
}

// Absolute cubic-only path -> Lottie subpaths [{c, v, i, o}]
function toLottiePaths(d, m) {
  const svgpath = req('svgpath');
  const p = svgpath(d).abs().matrix(m).unarc().unshort().round(3);
  const subs = [];
  let cur = null, x = 0, y = 0, sx = 0, sy = 0;
  const start = (X, Y) => { cur = { c: false, v: [[X, Y]], i: [[0, 0]], o: [[0, 0]] }; subs.push(cur); };
  const lineTo = (X, Y) => { cur.v.push([X, Y]); cur.i.push([0, 0]); cur.o.push([0, 0]); };
  const cubic = (x1, y1, x2, y2, X, Y) => {
    const k = cur.v.length - 1;
    cur.o[k] = [x1 - cur.v[k][0], y1 - cur.v[k][1]];
    cur.v.push([X, Y]); cur.i.push([x2 - X, y2 - Y]); cur.o.push([0, 0]);
  };
  p.iterate((s) => {
    const c = s[0];
    if (c === 'M') { start(s[1], s[2]); x = sx = s[1]; y = sy = s[2]; return; }
    if (!cur) start(x, y);
    if (c === 'L') { lineTo(s[1], s[2]); x = s[1]; y = s[2]; }
    else if (c === 'H') { lineTo(s[1], y); x = s[1]; }
    else if (c === 'V') { lineTo(x, s[1]); y = s[1]; }
    else if (c === 'C') { cubic(s[1], s[2], s[3], s[4], s[5], s[6]); x = s[5]; y = s[6]; }
    else if (c === 'Q') {
      const [qx, qy, X, Y] = s.slice(1);
      cubic(x + (2 / 3) * (qx - x), y + (2 / 3) * (qy - y), X + (2 / 3) * (qx - X), Y + (2 / 3) * (qy - Y), X, Y);
      x = X; y = Y;
    } else if (c === 'Z' || c === 'z') {
      cur.c = true;
      const n = cur.v.length - 1;
      if (n > 0 && Math.hypot(cur.v[n][0] - cur.v[0][0], cur.v[n][1] - cur.v[0][1]) < 0.01) {
        cur.i[0] = cur.i[n];
        cur.v.pop(); cur.i.pop(); cur.o.pop();
      }
      x = sx; y = sy; cur = null;
    }
  });
  return subs.filter((s) => s.v.length > 1);
}

const styleObj = (str) => Object.fromEntries(str.split(';').map((p) => p.split(':').map((x) => x.trim())).filter((p) => p.length === 2 && p[0]));

const apply = (m, [x, y]) => [m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5]];

const NAMED = { black: '#000000', white: '#ffffff' };
function color(str) {
  const s = String(str).trim().toLowerCase();
  if (NAMED[s]) return color(NAMED[s]);
  let m = s.match(/^#([0-9a-f]{3})$/);
  if (m) return [...m[1]].map((c) => parseInt(c + c, 16) / 255);
  m = s.match(/^#([0-9a-f]{6})$/);
  if (m) return [0, 2, 4].map((k) => parseInt(m[1].slice(k, k + 2), 16) / 255);
  m = s.match(/^rgba?\(([^)]+)\)$/);
  if (m) return m[1].split(/[\s,]+/).slice(0, 3).map((v) => (v.endsWith('%') ? parseFloat(v) / 100 : parseFloat(v) / 255));
  throw new Error(`Unknown color: ${str}`);
}

const num = (v, d) => (v === undefined || v === '' ? d : parseFloat(v));

const UNSUPPORTED_TAGS = { use: '<use>', text: 'text', image: 'image', line: 'line (stroke)' };

// Extremes of one cubic coordinate: endpoints plus roots of the derivative.
function cubicRange(p0, p1, p2, p3) {
  let lo = Math.min(p0, p3), hi = Math.max(p0, p3);
  const a = -p0 + 3 * p1 - 3 * p2 + p3, b = 2 * (p0 - 2 * p1 + p2), c = p1 - p0; // derivative / 3
  const ts = [];
  if (Math.abs(a) < 1e-12) { if (Math.abs(b) > 1e-12) ts.push(-c / b); } else {
    const D = b * b - 4 * a * c;
    if (D >= 0) { const s = Math.sqrt(D); ts.push((-b + s) / (2 * a), (-b - s) / (2 * a)); }
  }
  for (const t of ts) {
    if (t <= 0 || t >= 1) continue;
    const u = 1 - t, v = u * u * u * p0 + 3 * u * u * t * p1 + 3 * u * t * t * p2 + t * t * t * p3;
    lo = Math.min(lo, v); hi = Math.max(hi, v);
  }
  return [lo, hi];
}

// True bounds of Lottie subpaths (curve extremes, not just anchor points).
function pathsBBox(paths) {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  const seg = (p, q, o, i) => {
    const [ax, bx] = cubicRange(p[0], p[0] + o[0], q[0] + i[0], q[0]);
    const [ay, by] = cubicRange(p[1], p[1] + o[1], q[1] + i[1], q[1]);
    x0 = Math.min(x0, ax); x1 = Math.max(x1, bx); y0 = Math.min(y0, ay); y1 = Math.max(y1, by);
  };
  for (const { c, v, i, o } of paths) {
    for (let k = 0; k + 1 < v.length; k++) seg(v[k], v[k + 1], o[k], i[k + 1]);
    if (c) seg(v[v.length - 1], v[0], o[v.length - 1], i[0]);
    else if (v.length === 1) seg(v[0], v[0], [0, 0], [0, 0]);
  }
  return [x0, y0, x1, y1];
}

function parseSvgString(src, { size = 1200 } = {}) {
  const stack = [{ m: I, fill: '#000', op: 1, ids: [], rule: 'nonzero' }];
  const els = [], grads = {}, css = {}, warnings = [];
  let srcSize = null;
  for (const [, body] of src.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g))
    for (const [, sels, decl] of body.matchAll(/([^{}]+)\{([^}]*)\}/g))
      for (const sel of sels.split(',')) {
        const k = sel.trim().replace(/^\./, '');
        css[k] = { ...css[k], ...styleObj(decl) };
      }
  const tagAttrs = (rest) => {
    const a = attrs(rest);
    for (const c of (a.class || '').split(/\s+/).filter(Boolean)) Object.assign(a, css[c]);
    return Object.assign(a, styleObj(a.style || ''));
  };
  const label = (tag, a) => `${tag}${a.id ? '#' + a.id : ''}`;
  const warnClipAndStroke = (tag, a) => {
    if (a['clip-path'] && a['clip-path'] !== 'none') warnings.push(`element ${label(tag, a)}: clipping (clip-path) is not carried over`);
    if (a.mask && a.mask !== 'none') warnings.push(`element ${label(tag, a)}: mask is not carried over`);
    if (a.stroke && a.stroke !== 'none' && num(a['stroke-width'], 1) > 0) warnings.push(`element ${label(tag, a)}: stroke is not carried over`);
  };
  // First pass: gradients can be defined after their use (Figma puts <defs> at the end).
  {
    const gre = /<(\/?)(\w+)\b([^>]*?)(\/?)>/g;
    let g, cur = null;
    while ((g = gre.exec(src))) {
      const [, close, tag, rest, self] = g;
      if (close) { if (tag === 'linearGradient' || tag === 'radialGradient') cur = null; continue; }
      if (tag === 'linearGradient' || tag === 'radialGradient') {
        const a = tagAttrs(rest);
        grads[a.id] = { a, stops: [], radial: tag === 'radialGradient' };
        if (!self) cur = grads[a.id];
      } else if (tag === 'stop' && cur) {
        const a = tagAttrs(rest);
        const off = String(a.offset || 0);
        cur.stops.push([off.endsWith('%') ? parseFloat(off) / 100 : parseFloat(off), ...color(a['stop-color'] || '#000')]);
      }
    }
  }
  const re = /<(\/?)(\w+)\b([^>]*?)(\/?)>/g;
  let t, depthSvg = 0, inDefs = 0;
  while ((t = re.exec(src))) {
    const [, close, tag, rest, self] = t;
    if (close) {
      if (tag === 'g' || tag === 'svg') stack.pop();
      if (tag === 'defs' || tag === 'clipPath' || tag === 'mask') inDefs--;
      continue;
    }
    const a = tagAttrs(rest);
    if (tag === 'defs' || tag === 'clipPath' || tag === 'mask') { if (!self) inDefs++; continue; }
    if (tag === 'linearGradient' || tag === 'radialGradient' || tag === 'stop') continue; // collected in the first pass
    const top = stack[stack.length - 1];
    if (tag === 'svg' || tag === 'g') {
      let m = top.m;
      if (tag === 'svg') {
        const vb = a.viewBox && a.viewBox.split(/[\s,]+/).map(Number);
        if (depthSvg++ === 0) {
          const W = vb ? vb[2] : parseFloat(a.width), H = vb ? vb[3] : parseFloat(a.height);
          srcSize = [W, H];
          const k = size / Math.max(W, H);
          const ox = vb ? vb[0] : 0, oy = vb ? vb[1] : 0;
          m = [k, 0, 0, k, (size - W * k) / 2 - ox * k, (size - H * k) / 2 - oy * k];
        } else {
          m = mul(m, [1, 0, 0, 1, parseFloat(a.x || 0), parseFloat(a.y || 0)]);
          if (vb && a.width) m = mul(m, [a.width / vb[2], 0, 0, a.height / vb[3], -vb[0] * a.width / vb[2], -vb[1] * a.height / vb[3]]);
        }
      }
      m = mul(m, parseTransform(a.transform));
      if (!inDefs) warnClipAndStroke(tag, a);
      if (!self) stack.push({ m, fill: a.fill || top.fill, op: top.op * num(a.opacity, 1), ids: a.id ? [...top.ids, a.id] : top.ids, rule: a['fill-rule'] || top.rule });
      continue;
    }
    if (inDefs) continue;
    if (UNSUPPORTED_TAGS[tag]) { warnings.push(`element ${label(tag, a)}: ${UNSUPPORTED_TAGS[tag]} is not carried over`); continue; }
    const d = toPathD(tag, a);
    if (!d) continue;
    const m = mul(top.m, parseTransform(a.transform));
    const fill = a.fill || top.fill;
    warnClipAndStroke(tag, a);
    if (fill === 'none') continue;
    const paths = toLottiePaths(d, m);
    if (!paths.length) continue;
    const el = {
      i: els.length, tag, id: a.id || null, groups: top.ids, paths,
      bbox: pathsBBox(paths),
      opacity: top.op * num(a.opacity, 1) * num(a['fill-opacity'], 1),
      rule: (a['fill-rule'] || top.rule) === 'evenodd' ? 2 : 1,
    };
    const ref = fill.match(/url\(#([^)]+)\)/);
    if (ref) {
      let g = grads[ref[1]];
      if (!g) throw new Error(`Gradient not found: #${ref[1]}`);
      let ga = { ...g.a }, stops = g.stops;
      while (ga['xlink:href'] || ga.href) {
        const base = grads[(ga['xlink:href'] || ga.href).slice(1)];
        delete ga['xlink:href']; delete ga.href;
        ga = { ...base.a, ...ga };
        if (!stops.length) stops = base.stops;
      }
      const user = ga.gradientUnits === 'userSpaceOnUse';
      const n = (k, d) => (ga[k] !== undefined ? parseFloat(ga[k]) * (String(ga[k]).endsWith('%') ? 0.01 : 1) : d);
      let gm = mul(m, parseTransform(ga.gradientTransform));
      if (!user) {
        // objectBoundingBox: map unit square onto the element's own bbox (pre-transform approximation)
        const [bx, by, bx1, by1] = pathsBBox(toLottiePaths(d, I));
        gm = mul(m, mul([bx1 - bx, 0, 0, by1 - by, bx, by], parseTransform(ga.gradientTransform)));
      }
      el.grad = g.radial
        ? { radial: true, s: apply(gm, [n('cx', 0.5), n('cy', 0.5)]), e: apply(gm, [n('cx', 0.5) + n('r', 0.5), n('cy', 0.5)]), stops }
        : { s: apply(gm, [n('x1', 0), n('y1', 0)]), e: apply(gm, [n('x2', 1), n('y2', 0)]), stops };
      el.color = stops[0].slice(1);
    } else el.color = color(fill);
    els.push(el);
  }
  return { w: size, h: size, src: srcSize, els, warnings };
}

const parseSvg = (file, opts) => parseSvgString(fs.readFileSync(file, 'utf8'), opts);

module.exports = { parseSvg, parseSvgString, color, pathsBBox };
