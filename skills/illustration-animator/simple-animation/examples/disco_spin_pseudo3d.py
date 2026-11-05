import sys, math; sys.path.insert(0, __import__('os').path.join(__import__('os').path.dirname(__import__('os').path.abspath(__file__)), '..', 'scripts'))
from lot import *
import numpy as np, cv2
SRC = 'disco.svg'   # technique demo: pseudo-3D spin of a drawn sphere (run disco_spin_split.py first)
P = load_paths(SRC); W, H = svg_size(SRC); OP = 120; K = 2
D = Doc('Disco ball loop', OP, w=W, h=H)

S = np.load('split.npz'); cx, cy, R = S['circ']; RS = R - 14        # sphere radius at the stroke centre
up = lambda m: cv2.resize(m.astype(np.uint8), (W * K, H * K), interpolation=cv2.INTER_NEAREST) > 0

# ---- sort the moving ink into pieces: meridian segments and mirror tiles (latitude rings stay put)
mer, tiles, lat = S['mer'], S['tiles'], S['lat']
n, lab = cv2.connectedComponents(mer.astype(np.uint8))
pieces = []
for i in range(1, n):
    comp = lab == i
    if comp.sum() < 400: lat = lat | comp; continue              # crumbs of latitude edges stay static
    # run each meridian segment on into the latitude rings above and below, so its ends stay tucked
    # under the rings while it slides (no floating dashes)
    comp = cv2.dilate(comp.astype(np.uint8), np.ones((29, 3), np.uint8)) > 0
    pieces.append(('seg', comp))
n2, lab2 = cv2.connectedComponents(tiles.astype(np.uint8))
for i in range(1, n2):
    pieces.append(('tile', lab2 == i))
print('pieces', len(pieces))
# latitude rings run on under the mirror tiles (the drawing let the tiles cover them): rebuild those stretches
gapfill = np.zeros(lat.shape, np.uint8)
for a, b in (((819, 531), (888, 509)), ((461, 710), (646, 745)), ((842, 750), (951, 718)),
             ((450, 947), (637, 986)), ((867, 1163), (940, 1155))):
    cv2.line(gapfill, a, b, 1, 24)
lat = lat | (gapfill > 0)

SPIN = 180.0          # degrees per loop; the back half carries a copy of the same pattern -> seamless
def lon(x, y):
    r = math.sqrt(max(1.0, RS * RS - (y - cy) ** 2))
    return math.degrees(math.asin(max(-1.0, min(1.0, (x - cx) / r)))), r

def piece_group(name, mask, extra, step=3):
    ys, xs = np.nonzero(mask); pc, _ = lon(xs.mean(), ys.mean())     # the piece's own longitude
    paths = mask_to_paths(up(mask), K, tol=2.0)
    def shift(t):            # one wrap decision per piece (never splits a piece across the back)
        c = pc + SPIN * t / OP + extra
        return ((c + 180) % 360 - 180) - pc
    def shape(p, t):
        d = shift(t); v2 = []
        for x, y in p["v"]:
            ph, r = lon(x, y); ph = max(-90.0, min(90.0, ph + d))
            v2.append([round(cx + r * math.sin(math.radians(ph)), 1), y])
        return {"c": True, "v": v2, "i": p["i"], "o": p["o"]}
    def visible(t):
        c = pc + shift(t); return abs(c) < 104
    frames = list(range(0, OP + 1, step))
    if frames[-1] != OP: frames.append(OP)
    it = []
    for p in paths:
        ks = []
        for n_, t in enumerate(frames):
            vis = visible(t) or (n_ + 1 < len(frames) and visible(frames[n_ + 1])) or (n_ > 0 and visible(frames[n_ - 1]))
            if not vis and ks and ks[-1].get("h"):
                continue                                   # still hidden: the hold key covers it
            k = {"t": t, "s": [shape(p, t)]}
            if not vis:
                k["h"] = 1                                 # hidden: jump, never sweep across the ball
            elif t != OP:
                k["o"] = {"x": [0], "y": [0]}; k["i"] = {"x": [1], "y": [1]}
            ks.append(k)
        if ks[-1]["t"] != OP:
            ks.append({"t": OP, "s": [shape(p, OP)]})
        ks[-1].pop("o", None); ks[-1].pop("i", None); ks[-1].pop("h", None)
        it.append({"ty": "sh", "ks": {"a": 1, "k": ks}})
    it.append({"ty": "fl", "c": {"a": 0, "k": [0, 0, 0, 1]}, "o": {"a": 0, "k": 100}, "r": 2})
    it.append({"ty": "tr", "p": {"a": 0, "k": [0, 0]}, "a": {"a": 0, "k": [0, 0]}, "s": {"a": 0, "k": [100, 100]},
               "r": {"a": 0, "k": 0}, "o": {"a": 0, "k": 100}})
    return {"ty": "gr", "nm": name, "it": it}

# the drawn front quarter (~90 deg of meridians + tiles) is repeated around the ball every 90 deg;
# spinning by 180 deg per loop brings the same pattern back -> seamless
moving = []
for k, (kind, m) in enumerate(pieces):
    for q in range(4):
        moving.append(piece_group(f'{kind} {k} q{q}', m, 90.0 * q))
static = [mask_group('rim and string', mask_to_paths(up(S['ring'] | S['string']), K, tol=0.8)),
          mask_group('latitudes', mask_to_paths(up(lat), K, tol=0.8))]

# ---- the ball hangs on its string: a gentle sway while it spins
TOPP = [715, 80]
sway = [(t, round(2.2 * math.sin(2 * math.pi * t / OP), 3), 'lin') for t in range(0, OP + 1, 2)]
D.layer('Disco ball', static + moving, TOPP, r=anim(sway))

# ---- sparkles: flash as mirror tiles swing past the front
for idx, times in ((0, (8, 48, 88)), (2, (26, 66, 100))):
    c = centre(P[idx]); sk, rk = [], []
    for t in range(OP + 1):
        e = 0.0
        for t0 in times:
            tt = (t - t0) % OP
            if tt <= 14: e += math.sin(math.pi * tt / 14) ** 2
        sk.append((t, [round(100 + 40 * e, 2)] * 2 + [100], 'lin')); rk.append((t, round(30 * e, 2), 'lin'))
    D.layer(f'Sparkle {idx}', grp(P, [idx, 1] if idx == 0 else [idx], 'sparkle'), c, s=anim(sk[::2]), r=anim(rk[::2]))
D.save('disco_loop.json')
