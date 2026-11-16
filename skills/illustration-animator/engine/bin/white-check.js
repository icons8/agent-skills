// usage: node engine/bin/white-check.js <lottie.json> [--src <source.png|svg>] [--frames] [--step N]
// A style without a paper colour (Tint) must not get painted-in white or any colour its source does not have. Without --frames the
// Lottie is only read (fills, strokes, solid layers, raster pieces); with --frames its frames are drawn and counted too, and frame 0
// is compared with the source PNG. Exit 0 = clean, 1 = findings, 2 = bad usage. Run it before hand-over (animator-verify).
const fs = require('fs');
const path = require('path');
const W = require('../src/check/white');

const args = process.argv.slice(2);
const flag = (n) => (args.includes(n) ? args[args.indexOf(n) + 1] : undefined);
if (!args[0] || args[0].startsWith('--')) {
  console.error('Usage: node engine/bin/white-check.js <lottie.json> [--src <source.png|svg>] [--frames] [--step N]');
  process.exit(2);
}

(async () => {
  const lottie = JSON.parse(fs.readFileSync(path.resolve(args[0]), 'utf8'));
  const source = flag('--src') ? W.sourceInfo(path.resolve(flag('--src'))) : null;
  let tools = null;
  if (args.includes('--frames')) { try { tools = require('../src/setup').loadTools(); } catch (e) { tools = null; } }
  const found = await W.checkLottie(lottie, { source, frames: args.includes('--frames'), step: Number(flag('--step') || 1), tools });
  const hard = found.filter((x) => x.hard);
  for (const x of found.slice(0, 12)) console.log(`${x.hard ? 'WHITE' : 'WARN'}: ${x.where}: ${x.what}`);
  if (found.length > 12) console.log(`… and ${found.length - 12} more`);
  console.log(hard.length ? `white-check: ${hard.length} finding(s)\n${W.HINT}` : 'white-check: clean');
  process.exit(hard.length ? 1 : 0);
})().catch((e) => { console.error(e.message); process.exit(2); });
