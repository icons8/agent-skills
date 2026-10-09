// Make the animator-* skills visible to every agent on the machine: a link per skill
// (junction on Windows, symlink elsewhere) in each agent's global skills folder, pointing back
// into this repo — so lessons written by the skills stay in one place.
const fs = require('fs');
const os = require('os');
const path = require('path');

const AGENT_DIRS = ['.agents/skills', '.claude/skills', '.pi/agent/skills', '.hermes/skills'];

const skillDirs = (root) => {
  const dir = path.join(root, '.claude', 'skills');
  if (!fs.existsSync(dir)) return []; // installed as one skill: the agent already sees it
  return fs.readdirSync(dir).filter((d) => d.startsWith('animator-') && fs.existsSync(path.join(dir, d, 'SKILL.md')))
    .map((d) => path.join(dir, d));
};

const same = (a, b) => path.resolve(a).toLowerCase() === path.resolve(b).toLowerCase();

// Returns lines describing what happened, one per skill and agent folder.
function linkSkills(root, { home = os.homedir(), platform = process.platform } = {}) {
  const out = [];
  for (const rel of AGENT_DIRS) {
    const base = path.join(home, rel);
    if (!fs.existsSync(base)) continue;
    // a folder that is itself a link into another agent's folder is covered there
    const real = fs.realpathSync(base);
    if (!same(real, base) && AGENT_DIRS.some((o) => o !== rel && same(real, path.join(home, o)))) continue;
    for (const src of skillDirs(root)) {
      const dst = path.join(base, path.basename(src));
      let target = null;
      try { target = fs.realpathSync(dst); } catch { target = null; }
      if (target && same(target, src)) { out.push(`exists: ${dst}`); continue; }
      if (fs.existsSync(dst) || target) { out.push(`skipped, a different folder is already there: ${dst}`); continue; }
      try { fs.lstatSync(dst); fs.unlinkSync(dst); } catch { /* no dangling link */ }
      fs.symlinkSync(src, dst, platform === 'win32' ? 'junction' : 'dir');
      out.push(`linked: ${dst}`);
    }
  }
  return out;
}

module.exports = { linkSkills, AGENT_DIRS };
