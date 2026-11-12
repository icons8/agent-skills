// usage: node engine/bin/pair.js <A video> <B video> --out <dir> — the packet for the blind judge of a pair, in both
// orders: <dir>/AB and <dir>/BA, each with X-frames.png, X-motion.png, X-legs.png, Y-frames.png, Y-motion.png, Y-legs.png, stats.json (the
// numbers of X and Y) and order.json (which of A/B is X). The judge must see both orders.
//        node engine/bin/pair.js --combine <AB answer.json> <BA answer.json> — the pair's winner (A, B or tie) from the two answers.
const fs = require('fs');
const path = require('path');
const { loadTools } = require('../src/setup');
const { pairPacket } = require('../src/render/pair');
const { legSheetFromVideo } = require('../src/render/sheet');

const args = process.argv.slice(2);
if (args[0] === '--combine') {
  if (args.length < 3) { console.error('Usage: node engine/bin/pair.js --combine <AB answer.json> <BA answer.json>'); process.exit(1); }
  const { combine } = require('../src/render/pair');
  console.log(combine(...args.slice(1, 3).map((f) => JSON.parse(fs.readFileSync(f, 'utf8')))));
  process.exit(0);
}
const i = args.indexOf('--out');
if (args.length < 4 || i < 0) {
  console.error('Usage: node engine/bin/pair.js <A video> <B video> --out <folder>');
  process.exit(1);
}
const out = path.resolve(args[i + 1]);
const videos = [path.resolve(args[0]), path.resolve(args[1])];
const tools = loadTools();
const ab = path.join(out, 'AB'), ba = path.join(out, 'BA');
fs.mkdirSync(ab, { recursive: true });
fs.mkdirSync(ba, { recursive: true });
const stats = videos.map((v, k) => pairPacket(tools, v, ab, ['X', 'Y'][k]));
videos.forEach((v, k) => legSheetFromVideo(tools, v, path.join(ab, `${['X', 'Y'][k]}-legs.png`)));
const swap = { X: 'Y', Y: 'X' };
for (const L of ['X', 'Y']) for (const kind of ['frames', 'motion', 'legs']) fs.copyFileSync(path.join(ab, `${L}-${kind}.png`), path.join(ba, `${swap[L]}-${kind}.png`));
fs.writeFileSync(path.join(ab, 'stats.json'), JSON.stringify({ X: stats[0], Y: stats[1] }, null, 1));
fs.writeFileSync(path.join(ba, 'stats.json'), JSON.stringify({ X: stats[1], Y: stats[0] }, null, 1));
fs.writeFileSync(path.join(ab, 'order.json'), JSON.stringify({ X: 'A', Y: 'B' }));
fs.writeFileSync(path.join(ba, 'order.json'), JSON.stringify({ X: 'B', Y: 'A' }));
console.log(JSON.stringify(stats));
