const fs = require('fs');
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

function ffmpegCandidates(platform, env) {
  const c = [];
  if (env.ANIMATOR_FFMPEG) c.push(env.ANIMATOR_FFMPEG);
  if (platform === 'win32' && env.LOCALAPPDATA) c.push(path.win32.join(env.LOCALAPPDATA, 'Microsoft', 'WinGet', 'Links', 'ffmpeg.exe'));
  if (platform === 'darwin') c.push('/opt/homebrew/bin/ffmpeg', '/usr/local/bin/ffmpeg');
  return c;
}

function findFfmpeg({ platform = process.platform, env = process.env, exists = fs.existsSync } = {}) {
  const hit = ffmpegCandidates(platform, env).find((p) => exists(p));
  if (hit) return hit;
  const r = spawnSync(platform === 'win32' ? 'where' : 'which', ['ffmpeg'], { encoding: 'utf8' });
  return r.status === 0 ? r.stdout.split(/\r?\n/)[0].trim() : null;
}

const readEncoders = (ffmpeg) =>
  parseEncoders(spawnSync(ffmpeg, ['-hide_banner', '-encoders'], { encoding: 'utf8' }).stdout || '');

const INSTALL = {
  win32: 'winget install --id Gyan.FFmpeg -e --accept-source-agreements --accept-package-agreements',
  darwin: 'brew install ffmpeg',
};

module.exports = { parseEncoders, hevcEncoder, missingEncoders, findFfmpeg, readEncoders, INSTALL };
