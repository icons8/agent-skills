const fs = require('fs');
const path = require('path');
const { HOME } = require('./deps');

const ENV_FILE = path.join(HOME, 'env.json');

function loadEnv() {
  if (!fs.existsSync(ENV_FILE)) throw new Error('Environment not ready: run node engine/bin/setup.js');
  return JSON.parse(fs.readFileSync(ENV_FILE, 'utf8'));
}

function saveEnv(env) {
  fs.mkdirSync(HOME, { recursive: true });
  fs.writeFileSync(ENV_FILE, JSON.stringify(env, null, 2));
}

module.exports = { loadEnv, saveEnv, ENV_FILE };
