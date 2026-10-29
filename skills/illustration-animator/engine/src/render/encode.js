// PNG frames with alpha → GIF, MOV (ProRes 4444), and on macOS MP4 (HEVC with alpha layer). No background.
const path = require('path');
const { execFileSync, spawnSync } = require('child_process');

const formatsFor = (tools) => (tools.hevc ? ['gif', 'mov', 'mp4'] : ['gif', 'mov']);

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

const ff = (tools, args) => execFileSync(tools.ffmpeg, ['-y', '-loglevel', 'error', ...args]);

function encodeAll(framesDir, outBase, { fr, tools, formats = formatsFor(tools) }) {
  const input = path.join(framesDir, 'f%04d.png');
  return formats.map((f) => {
    if (f === 'mp4' && !tools.hevc) throw new Error('MP4 is built on Mac only');
    const out = `${outBase}.${f}`;
    ff(tools, encodeArgs(f, { fr, input, out }));
    return out;
  });
}

// On a Mac: MP4 from an existing MOV (made on another machine, e.g. Windows).
function mp4FromMov(tools, movFile) {
  if (!tools.hevc) throw new Error('MP4 is built on Mac only');
  const out = movFile.replace(/\.mov$/, '.mp4');
  ff(tools, encodeArgs('mp4', { input: movFile, out }));
  return out;
}

// Preview for the user: the scene's MOV over white, H.264, at the scene's own frame rate.
// Never resampled: an output at another rate drops or repeats frames and breaks the loop seam (a 96-frame loop becomes 77).
function probeVideo(tools, file) {
  const r = execFileSync(tools.ffprobe, ['-v', 'error', '-select_streams', 'v:0', '-count_frames',
    '-show_entries', 'stream=r_frame_rate,width,height,nb_read_frames', '-of', 'json', file]).toString();
  const s = JSON.parse(r).streams[0];
  const [n, d] = s.r_frame_rate.split('/').map(Number);
  return { fps: n / (d || 1), width: s.width, height: s.height, frames: Number(s.nb_read_frames) };
}

// What a preview must be, from the scene's frame rate and loop length and what the MOV actually holds.
function checkPreviewSource({ fr, op }, probe) {
  if (Math.abs(probe.fps - fr) > 1e-6) throw new Error(`MOV is ${probe.fps} fps, the scene is ${fr}: the preview is not resampled, rebuild the MOV`);
  if (probe.frames !== op) throw new Error(`MOV has ${probe.frames} frames, the loop is ${op}: the seam would break, rebuild the MOV`);
}

function whitePreviewArgs({ fr, input, width, height, out }) {
  return ['-f', 'lavfi', '-i', `color=c=white:s=${width}x${height}:r=${fr}`, '-i', input,
    '-filter_complex', '[0][1]overlay=shortest=1:format=auto,format=yuv420p',
    '-r', String(fr), '-c:v', 'libx264', '-crf', '14', '-preset', 'slow',
    '-movflags', '+faststart', out];
}

function whitePreview(tools, movFile, { fr, op }, out = movFile.replace(/.mov$/, '.white.mp4')) {
  const probe = probeVideo(tools, movFile);
  checkPreviewSource({ fr, op }, probe);
  ff(tools, whitePreviewArgs({ fr, input: movFile, width: probe.width, height: probe.height, out }));
  const made = probeVideo(tools, out);
  checkPreviewSource({ fr, op }, made);
  return out;
}

// First frame as raw RGBA (GIF, MOV). The ffmpeg HEVC decoder drops the alpha layer, see hevcHasAlpha.
function firstFrameRGBA(tools, file, size) {
  return execFileSync(tools.ffmpeg, ['-loglevel', 'error', '-i', file, '-frames:v', '1',
    '-vf', `scale=${size}:${size}`, '-f', 'rawvideo', '-pix_fmt', 'rgba', '-'], { maxBuffer: 256 * 1024 * 1024 });
}

// HEVC alpha = a second layer (nuh_layer_id 1) plus the Alpha Channel Information SEI.
function hevcHasAlpha(tools, file) {
  const r = spawnSync(tools.ffmpeg, ['-hide_banner', '-i', file, '-frames:v', '1', '-c:v', 'copy',
    '-bsf:v', 'trace_headers', '-f', 'null', '-'], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  const log = r.stderr || '';
  if (r.error || r.status !== 0) {
    const tail = log.trim().split(/\r?\n/).slice(-5).join('\n');
    throw new Error(`Could not read HEVC headers in ${file}: ${r.error ? r.error.message : `ffmpeg exited with code ${r.status}`}\n${tail}`);
  }
  return /nuh_layer_id\s+\S+\s*=\s*1\b/.test(log) && log.includes('Alpha Channel Information');
}

module.exports = { formatsFor, encodeArgs, encodeAll, mp4FromMov, probeVideo, checkPreviewSource, whitePreviewArgs, whitePreview, firstFrameRGBA, hevcHasAlpha };
