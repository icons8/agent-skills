// Any Chrome / Chromium / Edge; downloads Chrome for Testing when none is installed.
const fs = require('fs');
const os = require('os');
const path = require('path');

function chromeCandidates(platform = process.platform, env = process.env) {
  if (platform === 'win32') {
    const roots = [env.PROGRAMFILES, env['PROGRAMFILES(X86)'], env.LOCALAPPDATA].filter(Boolean);
    return roots.flatMap((r) => [
      path.win32.join(r, 'Google', 'Chrome', 'Application', 'chrome.exe'),
      path.win32.join(r, 'Chromium', 'Application', 'chrome.exe'),
      path.win32.join(r, 'Microsoft', 'Edge', 'Application', 'msedge.exe'),
    ]);
  }
  if (platform === 'darwin') {
    const dirs = ['/Applications', path.posix.join(env.HOME || os.homedir(), 'Applications')];
    return dirs.flatMap((d) => [
      `${d}/Google Chrome.app/Contents/MacOS/Google Chrome`,
      `${d}/Chromium.app/Contents/MacOS/Chromium`,
      `${d}/Microsoft Edge.app/Contents/MacOS/Microsoft Edge`,
    ]);
  }
  return ['/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser'];
}

function findChrome({ platform = process.platform, env = process.env, exists = fs.existsSync } = {}) {
  return chromeCandidates(platform, env).find((p) => exists(p)) || null;
}

async function downloadChrome(cacheDir) {
  const b = require('./deps').req('@puppeteer/browsers');
  const platform = b.detectBrowserPlatform();
  const buildId = await b.resolveBuildId(b.Browser.CHROME, platform, 'stable');
  const installed = await b.install({ browser: b.Browser.CHROME, buildId, cacheDir });
  return installed.executablePath;
}

module.exports = { chromeCandidates, findChrome, downloadChrome };
