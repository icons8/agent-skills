const { valueAt } = require('./keys');

const mul = (m, n) => [
  m[0] * n[0] + m[2] * n[1], m[1] * n[0] + m[3] * n[1],
  m[0] * n[2] + m[2] * n[3], m[1] * n[2] + m[3] * n[3],
  m[0] * n[4] + m[2] * n[5] + m[4], m[1] * n[4] + m[3] * n[5] + m[5],
];
const apply = (m, [x, y]) => [m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5]];

function localMatrix(ks, t) {
  const p = valueAt(ks.p, t), a = valueAt(ks.a, t), s = valueAt(ks.s, t);
  const r = (valueAt(ks.r, t)[0] * Math.PI) / 180, c = Math.cos(r), sn = Math.sin(r);
  let m = [1, 0, 0, 1, p[0], p[1]];
  m = mul(m, [c, sn, -sn, c, 0, 0]);
  m = mul(m, [s[0] / 100, 0, 0, s[1] / 100, 0, 0]);
  return mul(m, [1, 0, 0, 1, -a[0], -a[1]]);
}

function worldMatrix(lottie, name, t) {
  const L = lottie.layers.find((l) => l.nm === name);
  if (!L) throw new Error(`no layer ${name}`);
  let m = localMatrix(L.ks, t);
  let par = L.parent;
  while (par) {
    const P = lottie.layers.find((l) => l.ind === par);
    m = mul(localMatrix(P.ks, t), m);
    par = P.parent;
  }
  return m;
}

const invert = (m) => {
  const d = m[0] * m[3] - m[1] * m[2];
  return [m[3] / d, -m[1] / d, -m[2] / d, m[0] / d, (m[2] * m[5] - m[3] * m[4]) / d, (m[1] * m[4] - m[0] * m[5]) / d];
};

module.exports = { worldMatrix, localMatrix, apply, mul, invert };
