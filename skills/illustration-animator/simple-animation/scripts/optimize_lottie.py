#!/usr/bin/env python3
"""optimize_lottie.py — make a Lottie lighter without changing a single rendered pixel.

    python optimize_lottie.py in.json out.json [--verify]

  1. every embedded PNG is recompressed losslessly with oxipng (max level + zopfli; the oxipng program),
     then checked pixel-for-pixel against the original (aborts if any pixel differs);
  2. keyframes that repeat the same value as both neighbours are removed (first/last of every hold stay);
  3. canvas larger than 1200 px is shrunk to 1200 (textures resampled, one root null; --no-fit to skip);
  4. numbers that are whole (12.0) are written as ints, no spaces in the JSON.
--verify renders both files with Skottie (run through the skill, which finds the renderer) and reports the max frame difference.
"""
import sys, json, base64, io, subprocess, tempfile, os, shutil
import numpy as np
from PIL import Image

def recompress(b64png):
    raw = base64.b64decode(b64png.split(',', 1)[1])
    with tempfile.TemporaryDirectory() as d:
        src = os.path.join(d, 'a.png'); open(src, 'wb').write(raw)
        subprocess.run(['oxipng', '-o', 'max', '--zopfli', '--strip', 'all', '-q', src], check=True)
        new = open(src, 'rb').read()
    A = np.array(Image.open(io.BytesIO(raw)).convert('RGBA')); B = np.array(Image.open(io.BytesIO(new)).convert('RGBA'))
    assert A.shape == B.shape and (A == B).all(), 'oxipng changed pixels'
    return 'data:image/png;base64,' + base64.b64encode(new).decode() if len(new) < len(raw) else b64png

def tidy(o):
    if isinstance(o, float) and o == int(o) and abs(o) < 1e9: return int(o)
    if isinstance(o, list): return [tidy(x) for x in o]
    if isinstance(o, dict): return {k: tidy(v) for k, v in o.items()}
    return o

def prune_keys(o, stats):
    """Drop a keyframe whose value equals both neighbours (a hold of 3+ identical keys): the first and the last of the
    run stay, so timing and values are unchanged. Works on numbers, vectors and animated shape paths."""
    if isinstance(o, dict):
        k = o.get('k')
        if o.get('a') == 1 and isinstance(k, list) and len(k) > 2 and all(isinstance(x, dict) and 't' in x for x in k):
            keep = [k[0]]
            for i in range(1, len(k) - 1):
                if k[i].get('s') is not None and k[i].get('s') == k[i - 1].get('s') == k[i + 1].get('s') and not k[i].get('h'):
                    stats[0] += 1; continue
                keep.append(k[i])
            keep.append(k[-1]); o['k'] = keep
        for v in o.values(): prune_keys(v, stats)
    elif isinstance(o, list):
        for v in o: prune_keys(v, stats)

def _is_lin(kf):
    o, i = kf.get('o'), kf.get('i')
    return (isinstance(o, dict) and isinstance(i, dict) and all(v == 0 for v in o.get('x', [1]) + o.get('y', [1]))
            and all(v == 1 for v in i.get('x', [0]) + i.get('y', [0])))

def _vec(sv):
    if isinstance(sv[0], dict):
        p = sv[0]; return np.array([c for key in ('v', 'i', 'o') for pt in p[key] for c in pt], float)
    return np.array(sv, float)

def thin_keys(o, stats, tol_shape=0.05, tol_num=0.02):
    """LOSSY (invisible): among LINEARLY eased keyframes drop those that lie within tol of the straight line between the
    kept neighbours (shape points/tangents within tol_shape px, numbers within tol_num). First and last key always stay."""
    if isinstance(o, dict):
        k = o.get('k')
        if o.get('a') == 1 and isinstance(k, list) and len(k) > 2 and all(isinstance(x, dict) and 't' in x and 's' in x for x in k):
            tol = tol_shape if isinstance(k[0]['s'][0], dict) else tol_num
            vec = [_vec(x['s']) for x in k]; keep = [0]; a = 0
            while a < len(k) - 1:
                b = a + 1
                while b + 1 < len(k) and all(_is_lin(k[j]) for j in range(a, b + 1)):
                    ok = True
                    for j in range(a + 1, b + 1):
                        f = (k[j]['t'] - k[a]['t']) / (k[b + 1]['t'] - k[a]['t'])
                        if np.abs(vec[a] + (vec[b + 1] - vec[a]) * f - vec[j]).max() > tol: ok = False; break
                    if not ok: break
                    b += 1
                keep.append(b); a = b
            stats[0] += len(k) - len(keep); o['k'] = [k[j] for j in keep]
        for v in o.values(): thin_keys(v, stats, tol_shape, tol_num)
    elif isinstance(o, list):
        for v in o: thin_keys(v, stats, tol_shape, tol_num)

def fit_canvas(j, size=1200):
    """Delivery size is max 1200x1200. Shrinks the comp to `size` px: the textures are resampled (alpha only,
    constant colour kept) and one invisible root null scales everything; nothing else in the file changes.
    No-op when the canvas is already <= size."""
    W = j['w']
    if W <= size and j['h'] <= size: return
    k = size / max(W, j['h'])
    ref = {}
    for a in j.get('assets', []):
        if not a.get('p', '').startswith('data:image/png'): continue
        im = Image.open(io.BytesIO(base64.b64decode(a['p'].split(',', 1)[1]))).convert('RGBA'); arr = np.array(im)
        nw, nh = max(1, round(im.width * k)), max(1, round(im.height * k))
        vis = arr[..., 3] > 0
        if len(np.unique(arr[..., :3][vis].reshape(-1, 3), axis=0)) <= 2:      # constant colour: grain lives in alpha
            al = np.array(Image.fromarray(arr[..., 3]).resize((nw, nh), Image.LANCZOS))
            out = np.zeros((nh, nw, 4), np.uint8); out[..., :3] = arr[..., :3][vis][0]; out[..., 3] = al
        else:                                                                   # general case: premultiplied resize
            f = arr.astype(np.float32); f[..., :3] *= f[..., 3:] / 255
            r = np.array(Image.fromarray(f.astype(np.uint8)).resize((nw, nh), Image.LANCZOS)).astype(np.float32)
            r[..., :3] = np.where(r[..., 3:] > 0, r[..., :3] * 255 / np.maximum(r[..., 3:], 1), 0); out = np.clip(r, 0, 255).astype(np.uint8)
        buf = io.BytesIO(); Image.fromarray(out).save(buf, 'PNG')
        ref[a['id']] = (im.width / nw)    # layer scale that cancels the resampling (net 1 bitmap px = 1 canvas px of the shrunk comp)
        a['w'], a['h'], a['p'] = nw, nh, 'data:image/png;base64,' + base64.b64encode(buf.getvalue()).decode()
    def mul(prop, f):
        if prop.get('a') == 1:
            for kf in prop['k']:
                if 's' in kf: kf['s'] = [v * f for v in kf['s']]
        else: prop['k'] = [v * f for v in prop['k']]
    for L in j['layers']:
        if L.get('ty') == 2 and L.get('refId') in ref:
            f = ref[L['refId']]; mul(L['ks']['s'], f); mul(L['ks']['a'], 1 / f)
            for mk in L.get('masksProperties', []):      # masks live in the layer's own (resampled) pixel space
                pt = mk['pt']; shapes = [kf['s'][0] for kf in pt['k']] if pt.get('a') == 1 else [pt['k']]
                for sh in shapes:
                    for key in ('v', 'i', 'o'): sh[key] = [[round(x / f, 2), round(y / f, 2)] for x, y in sh[key]]
    root = max(L['ind'] for L in j['layers']) + 1
    for L in j['layers']:
        if 'parent' not in L: L['parent'] = root
    j['layers'].append({"ddd": 0, "ind": root, "ty": 3, "nm": "Fit to %d" % size, "sr": 1, "ip": 0, "op": j['op'], "st": 0, "bm": 0,
                        "ks": {"a": {"a": 0, "k": [0, 0, 0]}, "p": {"a": 0, "k": [0, 0, 0]}, "s": {"a": 0, "k": [k * 100, k * 100, 100]},
                               "r": {"a": 0, "k": 0}, "o": {"a": 0, "k": 100}}})
    j['w'] = round(W * k); j['h'] = round(j['h'] * k)

def main():
    src, dst = sys.argv[1], sys.argv[2]
    j = json.load(open(src, encoding='utf-8'))
    inds = {L['ind'] for L in j['layers']}
    assert all(L.get('parent') in inds | {None} for L in j['layers']), 'a layer points to a parent that does not exist'
    before = os.path.getsize(src)
    if '--no-fit' not in sys.argv: fit_canvas(j, 1200)          # first shrink, then recompress the new bitmaps
    for a in j.get('assets', []):
        if a.get('p', '').startswith('data:image/png'): a['p'] = recompress(a['p'])
    j = tidy(j)
    if '--lossy' in sys.argv:
        st2 = [0]; thin_keys(j, st2); print('thinned keys (lossy, invisible):', st2[0])
    stats = [0]; prune_keys(j, stats); print('redundant keys removed:', stats[0])
    json.dump(j, open(dst, 'w', encoding='utf-8', newline=''), separators=(',', ':'))
    after = os.path.getsize(dst)
    print(f'{os.path.basename(src)}: {before//1024} KB -> {after//1024} KB ({100*(before-after)/before:.0f}% lighter)')
    if '--verify' in sys.argv:
        here = os.path.dirname(os.path.abspath(__file__)); out = tempfile.mkdtemp()
        for tag, f in (('a', src), ('b', dst)):
            subprocess.run(['node', os.path.join(here, 'render.js'), f, os.path.join(out, tag), '600', 'all'], check=True, stdout=subprocess.DEVNULL)
        worst = 0
        for n in sorted(os.listdir(os.path.join(out, 'a'))):
            x = np.array(Image.open(os.path.join(out, 'a', n)).convert('RGB'), int); y = np.array(Image.open(os.path.join(out, 'b', n)).convert('RGB'), int)
            worst = max(worst, np.abs(x - y).max())
        print('max pixel difference over all frames:', worst); shutil.rmtree(out)
main()
