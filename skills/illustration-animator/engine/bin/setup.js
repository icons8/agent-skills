// usage: node engine/bin/setup.js [--yes] [--ffmpeg <path>]
// One-time setup → ~/.animator/tools.json. Without --yes it only prints what it would install and changes nothing:
// show the plan to the user and re-run with --yes once they agree. It installs only what is missing: the pinned npm
// dependencies (npm ci from deps/package-lock.json, install scripts off) into ~/.animator/deps and Chrome for Testing
// (a pinned build, checked by SHA-256) into ~/.animator/chrome when no Chrome, Chromium or Edge is installed.
// ffmpeg is never installed here: when there is none with the needed encoders, setup prints the command for the user
// to run themselves (licence prompts stay theirs); --ffmpeg names one in a non-standard place.
// Agents' skill folders are not touched.
const path = require('path');
const { HOME, DEPS, missingDeps, installDeps } = require('../src/setup/deps');
const { findChrome, downloadChrome, CHROME_BUILD } = require('../src/setup/chrome');
const { findFfmpeg, readEncoders, missingEncoders, hevcEncoder, INSTALL } = require('../src/setup/ffmpeg');
const { saveTools, TOOLS_FILE } = require('../src/setup');

const ROOT = path.resolve(__dirname, '..', '..');
const args = process.argv.slice(2);
const yes = args.includes('--yes');
const given = args.includes('--ffmpeg') ? path.resolve(args[args.indexOf('--ffmpeg') + 1]) : null;
const NODE_MIN = [22, 12];

(async () => {
  const [major, minor] = process.versions.node.split('.').map(Number);
  if (major < NODE_MIN[0] || (major === NODE_MIN[0] && minor < NODE_MIN[1])) throw new Error(`Node.js ${NODE_MIN.join('.')} or newer is needed, this is ${process.versions.node}`);

  const ffmpeg = findFfmpeg({ given });
  if (given && ffmpeg !== given) throw new Error(`--ffmpeg: no file at ${given}`);
  const ffMissing = ffmpeg ? missingEncoders(process.platform, readEncoders(ffmpeg)) : null;
  if (!ffmpeg || ffMissing.length) {
    const need = ffmpeg ? `ffmpeg at ${ffmpeg} lacks the encoders ${ffMissing.join(', ')}` : 'no ffmpeg found';
    const cmd = INSTALL[process.platform] || 'the package manager of the system';
    console.log(`${need}. Setup does not install it: ask the user to install it with "${cmd}" themselves (or their own way), then run setup again (an ffmpeg elsewhere: --ffmpeg <path>). Nothing was changed.`);
    process.exit(3);
  }

  const deps = missingDeps();
  const chrome = findChrome();
  const plan = [
    deps.length && `npm ci into ${DEPS}: ${deps.join(', ')}`,
    !chrome && `download Chrome for Testing ${CHROME_BUILD} into ${path.join(HOME, 'chrome')} (no Chrome, Chromium or Edge found)`,
  ].filter(Boolean);
  if (plan.length && !yes) {
    console.log(`Setup would:\n${plan.map((p) => `- ${p}`).join('\n')}\nNothing was changed. Ask the user, then run again with --yes.`);
    process.exit(2);
  }

  if (deps.length) installDeps();
  const browser = chrome || (await downloadChrome(path.join(HOME, 'chrome')));
  const enc = readEncoders(ffmpeg);
  const ffprobe = path.join(path.dirname(ffmpeg), 'ffprobe' + (process.platform === 'win32' ? '.exe' : ''));
  saveTools({ root: ROOT, chrome: browser, ffmpeg, ffprobe, hevc: hevcEncoder(process.platform, enc) });
  console.log('Setup done:', TOOLS_FILE);
  console.log({ root: ROOT, chrome: browser, ffmpeg, hevc: hevcEncoder(process.platform, enc) });
})().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
