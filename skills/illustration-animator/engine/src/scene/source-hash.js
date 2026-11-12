// Fingerprint of a scene's inputs (scene JSON text + its SVG text + pose SVGs): make records it, batch compares it.
const crypto = require('crypto');
const fs = require('fs');
const { sceneSvg } = require('./svg-path');

// null when a file cannot be read: make then reports the real error itself
function sourceHash(sceneFile) {
  try {
    const text = fs.readFileSync(sceneFile, 'utf8');
    const scene = JSON.parse(text);
    const svg = fs.readFileSync(sceneSvg(sceneFile, scene.svg), 'utf8');
    const h = crypto.createHash('sha1').update(text).update('\0').update(svg);
    // pose SVGs (morph) are inputs too: an edited pose rebuilds the scene
    for (const p of Object.values(scene.poses || {})) h.update('\0').update(fs.readFileSync(sceneSvg(sceneFile, p), 'utf8'));
    return h.digest('hex');
  } catch (e) {
    return null;
  }
}

module.exports = { sourceHash };
