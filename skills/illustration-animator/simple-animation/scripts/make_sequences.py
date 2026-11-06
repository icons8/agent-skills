#!/usr/bin/env python3
"""make_sequences.py — export a Lottie as PNG sequences: one with real alpha, one for GIF.

    python make_sequences.py name_loop.json outdir [--width 1200] [--frames all|0,24,..] [--skip lit]

outdir/<name>_alpha/<name>_0000.png ...   transparent background, textures keep their semi-transparency
outdir/<name>_gif/<name>_0000.png ...     same, but every textured image layer gets a WHITE underlay of its own
                                          silhouette (solid white under the body of the texture only; the feathered rim, vector shapes and the
                                          empty space outside / inside outlines stay transparent, no light fringe) — so the semi-transparent
                                          texture is baked onto white and survives GIF's 1-bit transparency.
Layers whose name matches --skip (default 'lit': overlay copies of a base layer) get no underlay of their own.
Needs: numpy, opencv-python-headless, pillow, node + canvaskit (see the tools command of the skill).
"""
import argparse, base64, copy, io, json, os, re, subprocess, sys
import numpy as np, cv2
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))

def white_underlay_asset(asset, lo=0.30, rim=1, max_hole=3000):
    """White silhouette under the texture, built so no light bumps/fringe show on dark backgrounds:
      * body: pixels of the texture plus its small see-through grain/wash patches (holes < max_hole px) -> solid white,
        eroded by `rim` px so the white never reaches the feathered/antialiased edge;
      * rim: NO white — edge pixels keep their own ink colour (a pixel at 60% coverage composited on white would
        be a light dot against a dark background).
    Big empty areas (inside outlines, outside the drawing) stay transparent."""
    from scipy import ndimage as ndi
    raw = base64.b64decode(asset['p'].split(',', 1)[1])
    a = np.array(Image.open(io.BytesIO(raw)).convert('RGBA'))[..., 3].astype(np.float32) / 255
    P = rim + 3; H0, W0 = a.shape; a = np.pad(a, P)      # pad so erosion also works where the texture touches the crop edge
    S = cv2.morphologyEx((a > lo).astype(np.uint8), cv2.MORPH_CLOSE, np.ones((5, 5), np.uint8))
    lab, n = ndi.label(1 - S)                                   # empty regions; fill only the small enclosed ones
    sizes = ndi.sum(1 - S, lab, range(1, n + 1)); border = set(lab[0]) | set(lab[-1]) | set(lab[:, 0]) | set(lab[:, -1])
    for i, sz in enumerate(sizes, 1):
        if sz < max_hole and i not in border: S[lab == i] = 1
    body = cv2.erode(S, np.ones((2 * rim + 1, 2 * rim + 1), np.uint8)).astype(np.float32)
    w = body[P:P + H0, P:P + W0]
    out = np.zeros(w.shape + (4,), np.uint8); out[..., :3] = 255; out[..., 3] = np.round(w * 255).astype(np.uint8)
    buf = io.BytesIO(); Image.fromarray(out).save(buf, 'PNG', optimize=True)
    return "data:image/png;base64," + base64.b64encode(buf.getvalue()).decode()

def with_white_underlay(doc, skip_re):
    d = copy.deepcopy(doc); assets = {a['id']: a for a in d['assets']}
    used = {l['ind'] for l in d['layers']}; nxt = max(used) + 1; new_assets = {}; out = []
    def process(layers):
        nonlocal nxt
        res = []
        for l in layers:
            res.append(l)
            if l.get('ty') == 2 and not re.search(skip_re, l.get('nm', ''), re.I) and not l.get('hasMask'):
                ref = l['refId']
                if ref not in new_assets:
                    A = assets[ref]
                    new_assets[ref] = dict(A, id=ref + '_w', p=white_underlay_asset(A))
                u = copy.deepcopy(l); u['ind'] = nxt; nxt += 1; u['nm'] = l['nm'] + ' white'; u['refId'] = ref + '_w'
                u['ks']['o'] = copy.deepcopy(l['ks']['o'])
                res.append(u)       # directly below the textured layer (children of it keep following the original)
        return res
    d['layers'] = process(d['layers']); d['assets'] = d['assets'] + list(new_assets.values())
    return d

def render(json_path, outdir, width, frames):
    os.makedirs(outdir, exist_ok=True)
    subprocess.run(['node', os.path.join(HERE, 'render.js'), '--transparent', json_path, outdir, str(width)] + frames, check=True)

def main():
    ap = argparse.ArgumentParser(); ap.add_argument('json'); ap.add_argument('outdir')
    ap.add_argument('--width', type=int, default=1200); ap.add_argument('--frames', default='all')
    ap.add_argument('--skip', default='lit')
    a = ap.parse_args()
    name = os.path.basename(a.json).replace('.json', '')
    doc = json.load(open(a.json, encoding='utf-8')); frames = a.frames.split(',') if a.frames != 'all' else ['all']
    tmp = os.path.join(a.outdir, '_tmp'); os.makedirs(tmp, exist_ok=True)
    wj = os.path.join(tmp, name + '_white.json'); json.dump(with_white_underlay(doc, a.skip), open(wj, 'w', encoding='utf-8', newline=''), separators=(',', ':'))
    for kind, src in (('alpha', a.json), ('gif', wj)):
        d = os.path.join(a.outdir, f'{name}_{kind}'); render(src, d, a.width, frames)
        for f in sorted(os.listdir(d)):                       # f012.png -> name_0012.png
            m = re.match(r'f(\d+)\.png', f)
            if m: os.replace(os.path.join(d, f), os.path.join(d, f'{name}_{int(m.group(1)):04d}.png'))
    print('done ->', a.outdir)

if __name__ == '__main__':
    main()
