const fs = require('fs');
const path = require('path');
const { HOME } = require('./deps');

const TOOLS_FILE = path.join(HOME, 'tools.json');

function loadTools() {
  if (!fs.existsSync(TOOLS_FILE)) throw new Error('Setup not done: run node engine/bin/setup.js');
  return JSON.parse(fs.readFileSync(TOOLS_FILE, 'utf8'));
}

function saveTools(tools) {
  fs.mkdirSync(HOME, { recursive: true });
  fs.writeFileSync(TOOLS_FILE, JSON.stringify(tools, null, 2));
}

module.exports = { loadTools, saveTools, TOOLS_FILE };
