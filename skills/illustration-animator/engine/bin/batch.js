// usage: node engine/bin/batch.js <style dir> [--force] [--limit N] [--jobs N]
// make every scene in <style dir>/scenes that is not done yet (or whose scene/SVG changed since it was made)
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const { sourceHash } = require('../src/scene/source-hash');

const args = process.argv.slice(2);
const dir = args[0] && path.resolve(args[0]);
if (!dir || !fs.existsSync(path.join(dir, 'scenes'))) {
  console.error('Usage: node engine/bin/batch.js <style folder> [--force] [--limit N] [--jobs N] (scenes/ folder required)');
  process.exit(1);
}
const num = (k, d) => { const i = args.indexOf(k); return i >= 0 ? Math.max(1, parseInt(args[i + 1], 10) || d) : d; };
const force = args.includes('--force');
const limit = num('--limit', Infinity);
const jobs = num('--jobs', 1);
const TIMEOUT = Number(process.env.ANIMATOR_MAKE_TIMEOUT_MS) || 10 * 60 * 1000;
const scenes = path.join(dir, 'scenes');
const out = path.join(dir, 'out');
const MAKE = path.join(__dirname, 'make.js');
const STATE = { 0: 'done', 2: 'failed' };
// tried: failed/error scenes that have not changed since — make would only fail the same way again (verify handles them)
const counts = { done: 0, failed: 0, error: 0, skipped: 0, remaining: 0, tried: 0 };
const RETRYABLE = /Environment not ready|did not finish within/;

// a damaged or missing status counts as "not made"
function readStatus(name) {
  try {
    return JSON.parse(fs.readFileSync(path.join(out, `${name}.status.json`), 'utf8'));
  } catch (e) {
    return null;
  }
}

const todo = [];
for (const f of fs.readdirSync(scenes).filter((x) => x.endsWith('.json')).sort()) {
  const name = path.basename(f, '.json');
  const file = path.join(scenes, f);
  const st = readStatus(name);
  const hash = sourceHash(file);
  if (!force && st && st.state === 'done' && !st.lottieOnly && st.source === hash) { counts.skipped++; continue; }
  if (!force && st && (st.state === 'failed' || st.state === 'error') && st.source === hash && !(st.state === 'error' && RETRYABLE.test(st.error || ''))) { counts.tried++; continue; }
  // another make is on it: do not start a second one
  if (!force && st && st.state === 'running' && Date.now() - Date.parse(st.at) < TIMEOUT) { counts.remaining++; continue; }
  todo.push({ name, file, hash });
}
const batch = todo.slice(0, limit);
counts.remaining += todo.length - batch.length;

function makeOne(job) {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [MAKE, job.file, '--out', out], { stdio: ['ignore', 'ignore', 'pipe'] });
    let err = '';
    let timedOut = false;
    child.stderr.on('data', (d) => { err += d; });
    const timer = setTimeout(() => { timedOut = true; child.kill(); }, TIMEOUT);
    child.on('close', (code) => {
      clearTimeout(timer);
      if (timedOut) {
        fs.mkdirSync(out, { recursive: true });
        const error = 'make did not finish within 10 min';
        fs.writeFileSync(path.join(out, `${job.name}.status.json`), JSON.stringify({ name: job.name, at: new Date().toISOString(), ...(job.hash ? { source: job.hash } : {}), state: 'error', error }, null, 2));
        resolve({ state: 'error', note: error });
        return;
      }
      const state = STATE[code] || 'error';
      const last = err.split(/\r?\n/).map((l) => l.trim()).filter(Boolean).pop();
      resolve({ state, note: state === 'error' ? last : undefined });
    });
    child.on('error', (e) => { clearTimeout(timer); resolve({ state: 'error', note: e.message }); });
  });
}

(async () => {
  let next = 0;
  const worker = async () => {
    while (next < batch.length) {
      const job = batch[next++];
      const r = await makeOne(job);
      counts[r.state]++;
      console.log(r.state, job.name, ...(r.note ? [r.note] : []));
    }
  };
  await Promise.all(Array.from({ length: Math.min(jobs, batch.length) }, worker));
  console.log(JSON.stringify(counts));
})();
