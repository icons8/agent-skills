const fs = require('fs');
const path = require('path');

// Newest year first; folders without a 4-digit year go last.
const year = (name) => { const m = name.match(/(\d{4})/); return m ? Number(m[1]) : -1; };
const newestFirst = (names) => names.filter((d) => d.startsWith('Adobe After Effects')).sort((a, b) => year(b) - year(a));

// ANIMATOR_AE (path to AfterFX.exe / the .app) wins on both platforms.
function findAfterEffects({ platform = process.platform, env = process.env, readdir = fs.readdirSync, exists = fs.existsSync } = {}) {
  if (env.ANIMATOR_AE) {
    if (!exists(env.ANIMATOR_AE)) throw new Error(`ANIMATOR_AE points to a file that does not exist: ${env.ANIMATOR_AE}`);
    return env.ANIMATOR_AE;
  }
  const list = (dir) => { try { return readdir(dir); } catch { return []; } };
  if (platform === 'win32') {
    if (!env.PROGRAMFILES) return null;
    const root = path.win32.join(env.PROGRAMFILES, 'Adobe');
    for (const d of newestFirst(list(root))) {
      const exe = path.win32.join(root, d, 'Support Files', 'AfterFX.exe');
      if (exists(exe)) return exe;
    }
    return null;
  }
  if (platform === 'darwin') {
    for (const d of newestFirst(list('/Applications'))) {
      const app = `/Applications/${d}/${d}.app`;
      if (exists(app)) return app;
    }
  }
  return null;
}

module.exports = { findAfterEffects };
