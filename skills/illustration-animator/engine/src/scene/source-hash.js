// Fingerprint of a scene's inputs (scene JSON text + its SVG text): make records it, batch compares it.
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

// null when a file cannot be read: make then reports the real error itself
function sourceHash(sceneFile) {
  try {
    const text = fs.readFileSync(sceneFile, 'utf8');
    const svg = fs.readFileSync(path.resolve(path.dirname(sceneFile), JSON.parse(text).svg), 'utf8');
    return crypto.createHash('sha1').update(text).update('\0').update(svg).digest('hex');
  } catch (e) {
    return null;
  }
}

module.exports = { sourceHash };
