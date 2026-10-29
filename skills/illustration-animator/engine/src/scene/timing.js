// out/<scene>.timing.json — the minutes ledger.js reads. make.js adds its own part on every run (builds, minutes of builds,
// the stop reason); what an agent wrote there (scenario_min, look_min, cost_usd, ...) stays.
const fs = require('fs');

function addTiming(file, minutes, stopReason) {
  let t = {};
  try { t = JSON.parse(fs.readFileSync(file, 'utf8')); } catch (e) { /* the first run */ }
  t.builds = (t.builds || 0) + 1;
  t.build_min = Math.round(((t.build_min || 0) + minutes) * 100) / 100;
  if (stopReason) t.engine_stop = stopReason;
  fs.writeFileSync(file, JSON.stringify(t, null, 2));
}

module.exports = { addTiming };
