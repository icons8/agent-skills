// One-time setup: npm deps, a Chrome, ffmpeg with the needed encoders → ~/.animator/env.json (with the repo root),
// and links to the animator-* skills in every agent's global skills folder.
const path = require('path');
const { execSync } = require('child_process');
const { HOME, missingDeps, installDeps } = require('../src/env/deps');
const { findChrome, downloadChrome } = require('../src/env/chrome');
const { findFfmpeg, readEncoders, missingEncoders, hevcEncoder, INSTALL } = require('../src/env/ffmpeg');
const { saveEnv, ENV_FILE } = require('../src/env');
const { linkSkills } = require('../src/env/skills');

const ROOT = path.resolve(__dirname, '..', '..');

(async () => {
  if (missingDeps().length) installDeps();

  const chrome = findChrome() || (await downloadChrome(path.join(HOME, 'chrome')));

  let ffmpeg = findFfmpeg();
  if (!ffmpeg || missingEncoders(process.platform, readEncoders(ffmpeg)).length) {
    const cmd = INSTALL[process.platform];
    if (!cmd) throw new Error('Install ffmpeg manually and set its path in ANIMATOR_FFMPEG');
    console.log('Installing ffmpeg:', cmd);
    execSync(cmd, { stdio: 'inherit' });
    ffmpeg = findFfmpeg();
  }
  if (!ffmpeg) throw new Error('ffmpeg not found after install');
  const enc = readEncoders(ffmpeg);
  const miss = missingEncoders(process.platform, enc);
  if (miss.length) throw new Error(`ffmpeg lacks encoders: ${miss.join(', ')}`);

  const ffprobe = path.join(path.dirname(ffmpeg), 'ffprobe' + (process.platform === 'win32' ? '.exe' : ''));
  saveEnv({ root: ROOT, chrome, ffmpeg, ffprobe, hevc: hevcEncoder(process.platform, enc) });
  console.log('Environment ready:', ENV_FILE);
  console.log({ root: ROOT, chrome, ffmpeg, hevc: hevcEncoder(process.platform, enc) });
  for (const line of linkSkills(ROOT)) console.log('skill', line);
})().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
