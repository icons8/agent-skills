// PNG frames with alpha → GIF, MOV (ProRes 4444), and on macOS MP4 (HEVC with alpha layer). No background.
const path = require('path');
const { execFileSync, spawnSync } = require('child_process');

const formatsFor = (env) => (env.hevc ? ['gif', 'mov', 'mp4'] : ['gif', 'mov']);

function encodeArgs(format, { fr, input, out }) {
  const src = input.endsWith('.mov') ? ['-i', input] : ['-framerate', String(fr), '-i', input];
  switch (format) {
    case 'gif':
      return [...src, '-filter_complex',
        'split[a][b];[a]palettegen=reserve_transparent=1:max_colors=255[p];[b][p]paletteuse=alpha_threshold=128:dither=none',
        '-loop', '0', out];
    case 'mov':
      return [...src, '-c:v', 'prores_ks', '-profile:v', '4444', '-pix_fmt', 'yuva444p10le',
        '-vendor', 'apl0', out];
    case 'mp4':
      return [...src, '-c:v', 'hevc_videotoolbox', '-alpha_quality', '0.75', '-pix_fmt', 'bgra',
        '-q:v', '65', '-tag:v', 'hvc1', '-movflags', '+faststart', out];
    default:
      throw new Error(`Unknown format: ${format}`);
  }
}

const ff = (env, args) => execFileSync(env.ffmpeg, ['-y', '-loglevel', 'error', ...args]);

function exportAll(framesDir, outBase, { fr, env, formats = formatsFor(env) }) {
  const input = path.join(framesDir, 'f%04d.png');
  return formats.map((f) => {
    if (f === 'mp4' && !env.hevc) throw new Error('MP4 is built on Mac only');
    const out = `${outBase}.${f}`;
    ff(env, encodeArgs(f, { fr, input, out }));
    return out;
  });
}

// On a Mac: MP4 from an existing MOV (the style folder is shared via Yandex.Disk).
function mp4FromMov(env, movFile) {
  if (!env.hevc) throw new Error('MP4 is built on Mac only');
  const out = movFile.replace(/\.mov$/, '.mp4');
  ff(env, encodeArgs('mp4', { input: movFile, out }));
  return out;
}

// First frame as raw RGBA (GIF, MOV). The ffmpeg HEVC decoder drops the alpha layer, see hevcHasAlpha.
function firstFrameRGBA(env, file, size) {
  return execFileSync(env.ffmpeg, ['-loglevel', 'error', '-i', file, '-frames:v', '1',
    '-vf', `scale=${size}:${size}`, '-f', 'rawvideo', '-pix_fmt', 'rgba', '-'], { maxBuffer: 256 * 1024 * 1024 });
}

// HEVC alpha = a second layer (nuh_layer_id 1) plus the Alpha Channel Information SEI.
function hevcHasAlpha(env, file) {
  const r = spawnSync(env.ffmpeg, ['-hide_banner', '-i', file, '-frames:v', '1', '-c:v', 'copy',
    '-bsf:v', 'trace_headers', '-f', 'null', '-'], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  const log = r.stderr || '';
  if (r.error || r.status !== 0) {
    const tail = log.trim().split(/\r?\n/).slice(-5).join('\n');
    throw new Error(`Could not read HEVC headers in ${file}: ${r.error ? r.error.message : `ffmpeg exited with code ${r.status}`}\n${tail}`);
  }
  return /nuh_layer_id\s+\S+\s*=\s*1\b/.test(log) && log.includes('Alpha Channel Information');
}

module.exports = { formatsFor, encodeArgs, exportAll, mp4FromMov, firstFrameRGBA, hevcHasAlpha };
