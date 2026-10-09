// usage: node engine/bin/skills.js — link the animator-* skills into every agent's global skills folder
const path = require('path');
const { linkSkills } = require('../src/env/skills');

for (const line of linkSkills(path.resolve(__dirname, '..', '..'))) console.log(line);
