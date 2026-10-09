// usage: node engine/bin/preview.js <file.svg> [--els 3,4,5] [--labels] [--out file.png]
const os = require('os');
const path = require('path');
const { loadEnv } = require('../src/env');
const { preview } = require('../src/render/preview');

const args = process.argv.slice(2);
const opt = (k) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : undefined; };
if (!args[0]) {
  console.error('Usage: node engine/bin/preview.js <file.svg> [--els 3,4,5] [--labels] [--out file.png]');
  process.exit(1);
}
const els = opt('--els') ? opt('--els').split(',').map((x) => (/^\d+$/.test(x) ? Number(x) : x)) : undefined;
const name = path.basename(args[0], '.svg') + (els ? `-els-${els.join('-')}` : '');
const out = path.resolve(opt('--out') || path.join(os.tmpdir(), `${name}.png`));

preview(path.resolve(args[0]), loadEnv(), out, { els, labels: args.includes('--labels') })
  .then((f) => console.log(f))
  .catch((e) => { console.error(e.message); process.exit(1); });
