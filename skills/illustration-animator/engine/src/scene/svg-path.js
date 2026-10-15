// The SVG a scene names, resolved from the scene file and kept inside its style folder (the folder that holds
// scenes/): a path that leads out of it, by .. or as an absolute path or through a link, is refused.
const fs = require('fs');
const path = require('path');

// real path of p; for a file that does not exist yet — the real path of its nearest existing folder plus the rest
function real(p) {
  const abs = path.resolve(p);
  try { return fs.realpathSync(abs); } catch {
    const up = path.dirname(abs);
    return up === abs ? abs : path.join(real(up), path.basename(abs));
  }
}

function sceneSvg(sceneFile, svg) {
  const root = path.dirname(path.dirname(path.resolve(sceneFile)));
  const file = path.resolve(path.dirname(path.resolve(sceneFile)), svg);
  const rel = path.relative(real(root), real(file));
  if (!rel || rel === '..' || rel.startsWith(`..${path.sep}`) || path.isAbsolute(rel)) throw new Error(`Scene: svg ${svg} is outside the style folder ${root}`);
  return file;
}

module.exports = { sceneSvg };
