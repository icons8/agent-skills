// Any Chrome / Chromium / Edge; downloads Chrome for Testing when none is installed — the build puppeteer-core
// (deps/package.json) is made for, not the latest.
const fs = require('fs');
const os = require('os');
const path = require('path');

// Standard install places only; the engine reads no environment variables (home: the user's home folder).
function chromeCandidates(platform = process.platform, home = os.homedir()) {
  if (platform === 'win32') {
    const roots = ['C:\\Program Files', 'C:\\Program Files (x86)', path.win32.join(home, 'AppData', 'Local')];
    return roots.flatMap((r) => [
      path.win32.join(r, 'Google', 'Chrome', 'Application', 'chrome.exe'),
      path.win32.join(r, 'Chromium', 'Application', 'chrome.exe'),
      path.win32.join(r, 'Microsoft', 'Edge', 'Application', 'msedge.exe'),
    ]);
  }
  if (platform === 'darwin') {
    const dirs = ['/Applications', path.posix.join(home, 'Applications')];
    return dirs.flatMap((d) => [
      `${d}/Google Chrome.app/Contents/MacOS/Google Chrome`,
      `${d}/Chromium.app/Contents/MacOS/Chromium`,
      `${d}/Microsoft Edge.app/Contents/MacOS/Microsoft Edge`,
    ]);
  }
  return ['/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser'];
}

function findChrome({ platform = process.platform, home = os.homedir(), exists = fs.existsSync } = {}) {
  return chromeCandidates(platform, home).find((p) => exists(p)) || null;
}

const CHROME_BUILD = '155.0.8059.79'; // PUPPETEER_REVISIONS.chrome of puppeteer-core 25.14.0

// SHA-256 of the Chrome for Testing archive of CHROME_BUILD, by @puppeteer/browsers platform: a changed or broken
// download is refused. A new build needs new hashes.
const CHROME_SHA256 = {
  linux: 'bcd9a79130d7e44d70f93be87042e9bcee7fe0f0b3898e06b8c9bed5fb619dcd',
  linux_arm: '6ba365c60cb1cff5e742caaa1e8b6f2c019f93f7a644fa42ea0bcfcf029d7e67',
  mac: '11c407e24d7d98cacaec055a4d9ab2f33023db2478d30544c24e829d81022096',
  mac_arm: 'e141a7cbf948780bb7d381860bd5a7944c6736f79b9918b9826fccb199d28ea4',
  win32: '26d33d14d0f3074443fc1297ed12a4f24c06c21d486a1c54bfaf8b12d3753c0e',
  win64: '4966d9df2c8ed9be606ff0fc8877b2e800def164fbad63fed6a1d93222ad9dbf',
};

async function downloadChrome(cacheDir) {
  const b = require('./deps').req('@puppeteer/browsers');
  const platform = b.detectBrowserPlatform();
  const expectedHash = CHROME_SHA256[platform];
  if (!expectedHash) throw new Error(`Chrome for Testing: no checksum for platform ${platform}; install Chrome or Chromium yourself`);
  const installed = await b.install({ browser: b.Browser.CHROME, buildId: CHROME_BUILD, cacheDir, platform, expectedHash });
  return installed.executablePath;
}

module.exports = { chromeCandidates, findChrome, downloadChrome, CHROME_BUILD, CHROME_SHA256 };
