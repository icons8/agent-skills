const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

function parseEncoders(text) {
  const s = new Set();
  for (const line of text.split(/\r?\n/)) {
    const m = line.match(/^\s[VAS][A-Z.]{5}\s+([\w-]+)\s/);
    if (m) s.add(m[1]);
  }
  return s;
}

// MP4 with alpha is made on macOS only (Apple encoder); Windows exports Lottie, MOV, GIF.
const hevcEncoder = (platform, enc) => (platform === 'darwin' && enc.has('hevc_videotoolbox') ? 'hevc_videotoolbox' : null);

function missingEncoders(platform, enc) {
  const miss = ['prores_ks', 'gif'].filter((n) => !enc.has(n));
  if (platform === 'darwin' && !hevcEncoder(platform, enc)) miss.push('hevc_videotoolbox');
  return miss;
}

// given: a path the user named (setup --ffmpeg); then standard install places; the engine reads no environment variables
function ffmpegCandidates(platform, home, given) {
  const c = [];
  if (given) c.push(given);
  if (platform === 'win32') c.push(path.win32.join(home, 'AppData', 'Local', 'Microsoft', 'WinGet', 'Links', 'ffmpeg.exe'));
  if (platform === 'darwin') c.push('/opt/homebrew/bin/ffmpeg', '/usr/local/bin/ffmpeg');
  return c;
}

function findFfmpeg({ platform = process.platform, home = os.homedir(), given = null, exists = fs.existsSync } = {}) {
  const hit = ffmpegCandidates(platform, home, given).find((p) => exists(p));
  if (hit) return hit;
  const r = spawnSync(platform === 'win32' ? 'where' : 'which', ['ffmpeg'], { encoding: 'utf8' });
  return r.status === 0 ? r.stdout.split(/\r?\n/)[0].trim() : null;
}

const readEncoders = (ffmpeg) =>
  parseEncoders(spawnSync(ffmpeg, ['-hide_banner', '-encoders'], { encoding: 'utf8' }).stdout || '');

// shown to the user, never run by setup: winget asks them to accept the licences itself
const INSTALL = {
  win32: 'winget install --id Gyan.FFmpeg -e',
  darwin: 'brew install ffmpeg',
  linux: 'sudo apt install ffmpeg',
};

module.exports = { parseEncoders, hevcEncoder, missingEncoders, findFfmpeg, readEncoders, INSTALL };
