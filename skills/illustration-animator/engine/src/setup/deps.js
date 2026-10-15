// npm dependencies live outside the skill folder, in ~/.animator/deps: exact versions from deps/package.json,
// installed by npm ci from deps/package-lock.json, install scripts off.
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');
const { createRequire } = require('module');

const HOME = path.join(os.homedir(), '.animator');
const DEPS = path.join(HOME, 'deps');
const PIN = path.join(__dirname, '..', '..', 'deps');
const pinned = () => require(path.join(PIN, 'package.json')).dependencies;

// a package counts as missing when it is not installed or its version differs from the pinned one
const missingDeps = () => Object.entries(pinned()).filter(([n, v]) => {
  try { return JSON.parse(fs.readFileSync(path.join(DEPS, 'node_modules', ...n.split('/'), 'package.json'), 'utf8')).version !== v; } catch { return true; }
}).map(([n, v]) => `${n}@${v}`);

function installDeps() {
  fs.mkdirSync(DEPS, { recursive: true });
  for (const f of ['package.json', 'package-lock.json']) fs.copyFileSync(path.join(PIN, f), path.join(DEPS, f));
  const args = ['ci', '--prefix', DEPS, '--no-audit', '--no-fund', '--ignore-scripts'];
  // npm's own script next to this node, run by node with an argument list: no shell, no quoting of the path
  const bin = path.dirname(process.execPath);
  const cli = [path.join(bin, 'node_modules', 'npm', 'bin', 'npm-cli.js'), path.join(bin, '..', 'lib', 'node_modules', 'npm', 'bin', 'npm-cli.js')].find((f) => fs.existsSync(f));
  if (cli) execFileSync(process.execPath, [cli, ...args], { stdio: 'inherit' });
  else if (process.platform === 'win32') execFileSync('npm.cmd', args.map((a) => `"${a}"`), { stdio: 'inherit', shell: true });
  else execFileSync('npm', args, { stdio: 'inherit' });
}

const local = () => createRequire(path.join(DEPS, 'index.js'));
const req = (name) => local()(name);
const resolve = (name) => local().resolve(name);

module.exports = { HOME, DEPS, missingDeps, installDeps, req, resolve };
