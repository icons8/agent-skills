import sys, math; sys.path.insert(0, __import__('os').path.join(__import__('os').path.dirname(__import__('os').path.abspath(__file__)), '..', 'scripts'))
from lot import *
import numpy as np, cv2
SRC = 'globe.svg'
P = load_paths(SRC); W, H = svg_size(SRC); OP = 150; K = 2
D = Doc('Spinning globe loop', OP, w=W, h=H)

def smooth(u):
    u = min(1.0, max(0.0, u)); return u * u * (3 - 2 * u)

cx, cy, RS = 738.4, 811.7, 432.0        # globe centre / radius at the outer edge of the drawn surface
SPIN = 180.0                            # deg per loop: the back half carries a copy of the front -> seamless
BAND = 10.0                             # longitude strips (a strip never straddles the back of the globe)

# ---- surface ink (continents + polar cap), cut into longitude strips
surf = np.zeros((H * K, W * K), bool)
for i in (2, 3, 5, 6): surf |= ink_mask((W, H), P[i][0], K)      # continents (the polar cap stays: spinning doesn't change it)
yy, xx = np.mgrid[0:H * K, 0:W * K] / K
# the hand-drawn continents are squeezed hard at the rim; a true hemisphere would blow them up ~3x when they
# turn to face us. So the drawn disc is treated as the front cap (+-PHMAX) of a slightly bigger sphere:
# at most ~1.8x stretch, and things slip behind the rim when they pass PHMAX. Frame 0 is still the drawing.
PHMAX = 56.0; KS = math.sin(math.radians(PHMAX))
rr = np.sqrt(np.maximum(1.0, RS * RS - (yy - cy) ** 2))
LON = np.degrees(np.arcsin(np.clip((xx - cx) / rr * KS, -1, 1)))

def lon(x, y):
    w = math.sqrt(max(1.0, RS * RS - (y - cy) ** 2))
    return math.degrees(math.asin(max(-1.0, min(1.0, (x - cx) / w * KS)))), w / KS

def strip_group(name, mask, pc, extra, step=3, mirror=False):
    paths = mask_to_paths(mask, K, tol=1.6)
    def shift(t):
        c = pc + SPIN * t / OP + extra
        return ((c + 180) % 360 - 180) - pc
    def shape(p, t):
        d = shift(t); v2 = []
        for x, y in p["v"]:
            ph, r = lon(x, y)
            if mirror: ph = 2 * MIRROR[min(len(MIRROR) - 1, int(round(y * K)))] - ph
            ph = max(-PHMAX, min(PHMAX, ph + d))
            v2.append([round(cx + r * math.sin(math.radians(ph)), 1), y])
        return {"c": True, "v": v2, "i": p["i"], "o": p["o"]}
    visible = lambda t: abs(pc + shift(t)) < PHMAX + BAND
    frames = list(range(0, OP + 1, step))
    if frames[-1] != OP: frames.append(OP)
    it = []
    for p in paths:
        ks = []
        for n_, t in enumerate(frames):
            vis = visible(t) or (n_ + 1 < len(frames) and visible(frames[n_ + 1])) or (n_ > 0 and visible(frames[n_ - 1]))
            if not vis and ks and ks[-1].get("h"):
                continue
            k = {"t": t, "s": [shape(p, t)]}
            if not vis: k["h"] = 1                       # hidden behind: jump, never sweep across the front
            else: k["o"] = {"x": [0], "y": [0]}; k["i"] = {"x": [1], "y": [1]}
            ks.append(k)
        if ks[-1]["t"] != OP: ks.append({"t": OP, "s": [shape(p, OP)]})
        for key in ("o", "i", "h"): ks[-1].pop(key, None)
        it.append({"ty": "sh", "ks": {"a": 1, "k": ks}})
    it.append({"ty": "fl", "c": {"a": 0, "k": [0, 0, 0, 1]}, "o": {"a": 0, "k": 100}, "r": 2})
    # a hairline stroke seals the joins between strips (no white cracks as they stretch)
    it.append({"ty": "st", "c": {"a": 0, "k": [0, 0, 0, 1]}, "o": {"a": 0, "k": 100}, "w": {"a": 0, "k": 4}, "lc": 2, "lj": 2})
    it.append({"ty": "tr", "p": {"a": 0, "k": [0, 0]}, "a": {"a": 0, "k": [0, 0]}, "s": {"a": 0, "k": [100, 100]},
               "r": {"a": 0, "k": 0}, "o": {"a": 0, "k": 100}})
    return {"ty": "gr", "nm": name, "it": it}

afr = np.zeros(surf.shape, bool)
for i in (3, 6): afr |= ink_mask((W, H), P[i][0], K)
# close the hairline gap between Africa and the rim stroke, so the mirrored half joins without a crack
inside = np.hypot(xx - cx, yy - cy) <= RS
afr = (cv2.morphologyEx(afr.astype(np.uint8), cv2.MORPH_CLOSE, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (21, 21))) > 0) & inside
# mirror line per row: where Africa touches the rim, mirror at its own edge (no crack); elsewhere at the rim
rmax = np.where(afr, LON, -999.0).max(axis=1)
MIRROR = np.where(rmax >= 49, rmax, PHMAX)
MIRROR = np.convolve(np.pad(MIRROR, 6, mode='edge'), np.ones(13) / 13, mode='valid')     # no steps between rows
surf = surf | afr                    # the front Africa uses the closed shape too
strips = []
grow = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (5, 5))
for b in np.arange(-PHMAX, PHMAX, BAND):
    band = (LON >= b) & (LON < b + BAND)
    m = surf & band
    if m.sum() < 50: continue
    m = (cv2.dilate(m.astype(np.uint8), grow) > 0) & surf          # strips overlap a hair: no seams
    for extra in (0.0, 180.0):
        strips.append(strip_group(f'surface {int(b)}..{int(b + BAND)} {"front" if extra == 0 else "back"}', m, b + BAND / 2, extra))
# Africa is drawn running into the rim, so its far side is a straight cut. Give it a far side: the same
# land mirrored across the rim (its own west coast becomes the east coast) — it turns into view as one continent.
for b in np.arange(-PHMAX, PHMAX, BAND):
    band = (LON >= b) & (LON < b + BAND)
    m = afr & band
    if m.sum() < 50: continue
    m = (cv2.dilate(m.astype(np.uint8), grow) > 0) & afr
    for extra in (0.0, 180.0):
        strips.append(strip_group(f'africa far side {int(b)} {extra:.0f}', m, 2 * PHMAX - (b + BAND / 2), extra, mirror=True))
print('strips', len(strips))

# ---- globe: outline stays (a sphere's silhouette doesn't change as it spins); a slow float
gp = [(t, pos([cx, cy], 0, round(-10 * math.sin(2 * math.pi * t / OP), 2)), 'lin') for t in range(0, OP + 1, 3)]
globe = D.layer('Globe', [group('outline L', P[0]), group('outline R', P[1])] + grp(P, [4, 7], 'polar cap') + strips, [cx, cy], p=anim(gp))

# ---- clouds drift and curl a little (scale from their tails), opposite phases; stars twinkle in turn
for idx, base, ph in ((19, [130, 1100], 0.0), (20, [1300, 740], math.pi)):
    c = centre(P[idx])
    pk = [(t, pos(c, round(14 * math.sin(2 * math.pi * t / OP + ph) - 14 * math.sin(ph), 2), round(-6 * math.sin(4 * math.pi * t / OP), 2)), 'lin') for t in range(0, OP + 1, 3)]
    sk = [(t, [round(100 + 4 * math.sin(4 * math.pi * t / OP + ph) - 4 * math.sin(ph), 2), 100, 100], 'lin') for t in range(0, OP + 1, 3)]
    D.layer(f'Cloud {idx}', grp(P, [idx], 'cloud'), c, p=anim(pk), s=anim(sk))
for name, idxs, times in (('Star top', [12, 13, 14], (20, 95)), ('Star left', [15, 16, 17, 18], (55, 128)), ('Star right', [8, 9, 10, 11], (38, 110))):
    c = centre(P[idxs[0]])
    sk, rk = [], []
    for t in range(OP + 1):
        e = sum(math.sin(math.pi * min(1, max(0, (t - t0) / 16))) ** 2 for t0 in times)
        sk.append((t, [round(100 + 34 * e, 2)] * 2 + [100], 'lin')); rk.append((t, round(22 * e, 2), 'lin'))
    D.layer(name, grp(P, idxs, 'star'), c, s=anim(sk[::3]), r=anim(rk[::3]))
D.save('globe_loop.json')
