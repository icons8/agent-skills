// usage: node engine/bin/optimize.js <in.json> [out.json] [--tol <px>] [--vertex <px>] [--dec <n>]   (no out: written over <in>)
// Lightens a Lottie that is already built (the same pass make.js runs): shorter numbers, thinned bake keys, dropped vertices of dense
// outlines, rigid parts moved by group transforms. --tol: how far a thinned key may stray, px of the 1200 canvas (0.6); --vertex: the same
// for a dropped vertex (0.25); --dec: decimals of path points (1). Check the result with bin/lottie-psnr.js.
const fs = require('fs');
const { optimizeLottie } = require('../src/lottie/optimize');

const args = process.argv.slice(2);
const opt = (k) => { const i = args.indexOf(k); return i >= 0 ? Number(args[i + 1]) : undefined; };
const files = args.filter((x, i) => !x.startsWith('--') && !(args[i - 1] || '').startsWith('--'));
if (!files[0]) { console.error('Usage: optimize.js <in.json> [out.json] [--tol <px>] [--vertex <px>] [--dec <n>]'); process.exit(2); }
const o = {};
for (const [flag, name] of [['--tol', 'shape'], ['--vertex', 'vertex'], ['--dec', 'dec']]) if (opt(flag) !== undefined) o[name] = opt(flag);
const raw = fs.readFileSync(files[0], 'utf8');
const out = JSON.stringify(optimizeLottie(JSON.parse(raw), o));
fs.writeFileSync(files[1] || files[0], out);
console.log(`${files[0]}: ${(raw.length / 1e3).toFixed(0)} KB → ${(out.length / 1e3).toFixed(0)} KB`);
