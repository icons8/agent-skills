#!/usr/bin/env python3
"""PNG (with alpha) -> SVG the rest of the skill can animate, plus the PNG's own texture washes.

usage: python trace_png.py art.png art.svg [--colors N] [--wash-dir DIR]

- Colours are found over all drawn pixels (k-means, --colors or auto); a colour whose median alpha is high
  is ink, a translucent one is a wash. Ink (alpha > 128) is split per colour into connected components, and every component is traced with vtracer into its OWN <path> — one path per drawn part,
  so inspect_svg / grp() can address parts by index.
- Wash colours (watercolour, marker tint; the ink's own translucent rim stays ink by colour) are closed, tucked under the ink's inner half and traced too, with fill-opacity = their median alpha
  (lot.py keeps it). They come FIRST in the SVG (painted under the ink).
- For every wash region it also writes <wash-dir>/wash_<i>.png (constant RGB, full 8-bit alpha = the grain)
  and wash.json [{file, x, y, w, h, path_index}] — embed them with Doc.image_layer() behind the part's
  outline instead of the flat fill when the texture matters (style-notes Principle 18).
Needs: vtracer==0.6.15, scipy, pillow, numpy (the `tools` command of the adapter prints the pinned pip command)
"""
import argparse, json, os, re, tempfile
import numpy as np
from PIL import Image
from scipy import ndimage as nd
import vtracer

ap = argparse.ArgumentParser()
ap.add_argument('png'); ap.add_argument('svg')
ap.add_argument('--colors', type=int, default=0, help='number of colours incl. washes (0 = auto, up to 5)')
ap.add_argument('--wash-dir', default=None)
a_ = ap.parse_args()
wash_dir = a_.wash_dir or os.path.dirname(os.path.abspath(a_.svg))

A = np.array(Image.open(a_.png).convert('RGBA'))
rgb, al = A[..., :3].astype(float), A[..., 3].astype(int)
H, W = al.shape

def kmeans(X, k, it=20):
    rng = np.random.default_rng(0)
    C = X[rng.choice(len(X), k, replace=False)]
    for _ in range(it):
        lab = ((X[:, None] - C[None]) ** 2).sum(-1).argmin(1)
        C = np.array([X[lab == j].mean(0) if (lab == j).any() else C[j] for j in range(k)])
    return C

def palette(mask, k):
    X = rgb[mask]
    if len(X) > 60000: X = X[np.random.default_rng(1).choice(len(X), 60000, replace=False)]
    if k: return kmeans(X, k)
    C = kmeans(X, 5)                       # auto: start from 5 and merge centres closer than 45 (RGB units)
    keep = []
    for c in C[np.argsort(-np.array([((X - c) ** 2).sum(1).__lt__(45 ** 2).sum() for c in C]))]:
        if all(np.linalg.norm(c - q) > 45 for q in keep): keep.append(c)
    return np.array(keep)

def assign(mask, C):
    lab = np.full(mask.shape, -1)
    d = ((rgb[mask][:, None] - C[None]) ** 2).sum(-1)
    lab[mask] = d.argmin(1)
    return lab

def clean(m, mn):
    lab, n = nd.label(m)
    if n == 0: return m
    s = nd.sum(m, lab, range(1, n + 1))
    keep = np.isin(lab, 1 + np.where(s >= mn)[0])
    hl, hn = nd.label(~keep); hs = nd.sum(~keep, hl, range(1, hn + 1))
    return keep | np.isin(hl, 1 + np.where(hs < 30)[0])

def comps(m, mn):
    lab, n = nd.label(m); sl = nd.find_objects(lab)
    out = [(lab == i + 1) for i in range(n) if nd.sum(m, lab, i + 1) >= mn]
    return sorted(out, key=lambda c: tuple(np.argwhere(c)[0]))

def trace(m):
    # vtracer: ink = black on white, drawn at twice the size (finer curves), settings tuned for smooth, light paths.
    # The settings go in by position: the package's keyword form crashes on some Python builds.
    big = nd.gaussian_filter(nd.zoom(m.astype(float), 2, order=1), 1.0) > 0.5      # smooth x2: no pixel staircase
    with tempfile.TemporaryDirectory() as d:
        src, dst = os.path.join(d, 'm.png'), os.path.join(d, 'm.svg')
        Image.fromarray(np.where(big, 0, 255).astype(np.uint8)).convert('RGB').save(src)
        vtracer.convert_image_to_svg_py(src, dst, 'binary', 'stacked', 'spline',
                                        16, 5, 24, 90, 8.0, 2, 70, 1)
        svg = open(dst, encoding='utf-8').read()
    out = []
    for tag in re.findall(r'<path\b[^>]*>', svg):
        d = re.search(r' d="([^"]*)"', tag).group(1)
        tr = re.search(r'translate\(([-\d.]+)[ ,]+([-\d.]+)\)', tag)
        tx, ty = (float(tr.group(1)), float(tr.group(2))) if tr else (0.0, 0.0)
        nums = iter(float(v) for v in re.findall(r'-?\d+(?:\.\d+)?', d))
        cmds = re.findall(r'[MLCZ]', d)
        parts = []
        for c in cmds:
            k = {'M': 1, 'L': 1, 'C': 3, 'Z': 0}[c]
            pts = [f'{(next(nums) + tx) / 2:.1f} {(next(nums) + ty) / 2:.1f}' for _ in range(k)]
            parts.append(c + ' '.join(pts))
        out.append(''.join(parts))
    return ' '.join(out)

hx = lambda c: '#%02X%02X%02X' % tuple(int(round(v)) for v in c)

# ---- colours of everything drawn; each colour's ROLE comes from its median alpha:
# opaque colours are ink (outlines, solid shapes), translucent colours are washes (watercolour, tint)
drawn = al > 15
C = palette(drawn, a_.colors)
lab = assign(drawn, C)
role = []
for j in range(len(C)):
    role.append('ink' if np.median(al[lab == j]) > 170 else 'wash')
    core = (lab == j) & (al >= np.percentile(al[lab == j], 60))     # the colour itself = median of its densest pixels
    C[j] = np.median(rgb[core], 0)
Ci = [C[j] for j in range(len(C)) if role[j] == 'ink']
inks = [clean((lab == j) & (al > 128), 40) for j in range(len(C)) if role[j] == 'ink']
ink_all = np.zeros_like(drawn)
for m in inks: ink_all |= m

paths, washes = [], []
for j, c in enumerate(C):
    if role[j] != 'wash': continue
    f = (lab == j)
    fz = nd.binary_closing(f, iterations=3) | f
    fz = nd.binary_dilation(fz, iterations=4) & (fz | ink_all)       # tuck under the inner half of the outline
    fz = clean(fz, 300)
    op = float(np.median(al[f])) / 255
    for m in comps(fz, 300):
        paths.append(f'<path d="{trace(m)}" fill="{hx(c)}" fill-opacity="{op:.3f}" fill-rule="evenodd"/>')
        mm = nd.binary_dilation(m, iterations=3)
        ys, xs = np.where(mm); y0, y1, x0, x1 = ys.min(), ys.max() + 1, xs.min(), xs.max() + 1
        crop = np.zeros((y1 - y0, x1 - x0, 4), np.uint8)
        keep = mm[y0:y1, x0:x1] & ~ink_all[y0:y1, x0:x1]
        crop[..., :3] = np.round(c).astype(np.uint8)
        crop[..., 3] = np.where(keep, A[y0:y1, x0:x1, 3], 0)
        fn = f'wash_{len(washes)}.png'
        Image.fromarray(crop).save(os.path.join(wash_dir, fn), optimize=True)
        washes.append({'file': fn, 'x': int(x0), 'y': int(y0), 'w': int(x1 - x0), 'h': int(y1 - y0),
                       'path_index': len(paths) - 1})

for j, c in enumerate(Ci):
    for m in comps(inks[j], 40):
        paths.append(f'<path d="{trace(m)}" fill="{hx(c)}" fill-rule="evenodd"/>')

open(a_.svg, 'w', encoding='utf-8', newline='\n').write(f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" width="{W}" height="{H}">\n'
                        + '\n'.join(paths) + '\n</svg>\n')
if washes:
    json.dump(washes, open(os.path.join(wash_dir, 'wash.json'), 'w', encoding='utf-8', newline='\n'), indent=1)
print(f'{a_.svg}: {len(paths)} paths ({len(washes)} washes, ink colours {[hx(c) for c in Ci]})')
