// npm dependencies live outside the project (it syncs via Yandex.Disk).
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execSync } = require('child_process');
const { createRequire } = require('module');

const HOME = process.env.ANIMATOR_HOME || path.join(os.homedir(), '.animator');
const DEPS = path.join(HOME, 'deps');
const pkg = require('../../package.json');

const missingDeps = () =>
  Object.keys(pkg.animatorDeps).filter((n) => !fs.existsSync(path.join(DEPS, 'node_modules', ...n.split('/'))));

function installDeps() {
  fs.mkdirSync(DEPS, { recursive: true });
  const specs = Object.entries(pkg.animatorDeps).map(([n, v]) => `"${n}@${v}"`).join(' ');
  execSync(`npm install --prefix "${DEPS}" --no-audit --no-fund ${specs}`, { stdio: 'inherit' });
}

const local = () => createRequire(path.join(DEPS, 'index.js'));
const req = (name) => local()(name);
const resolve = (name) => local().resolve(name);

module.exports = { HOME, DEPS, missingDeps, installDeps, req, resolve };
