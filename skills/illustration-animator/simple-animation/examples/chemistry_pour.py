import sys, math; sys.path.insert(0, __import__('os').path.join(__import__('os').path.dirname(__import__('os').path.abspath(__file__)), '..', 'scripts'))
from lot import *
import numpy as np, cv2
SRC = 'chemistry_pour.svg'   # copy from assets/approved/
P = load_paths(SRC); W, H = svg_size(SRC); OP = 120
D = Doc('Chemistry pour loop', OP, w=W, h=H)

WRIST = [520, 420]          # hand + held tube rotate around the hand's middle (wrist side)
LIP = [962, 688]            # lowest point of the tube's mouth at rest
TILT, LIFT, SHIFT = 9.0, -62, 12
SURF = 1074                 # flask liquid surface
DROPS = [32, 42, 52, 62, 72]   # release frames: each one shaken out by a small flick of the wrist
FALL = 10
LAND = [t + FALL for t in DROPS]

def rotp(p, c, deg):
    a = math.radians(deg); x, y = p[0] - c[0], p[1] - c[1]
    return [c[0] + x * math.cos(a) - y * math.sin(a), c[1] + x * math.sin(a) + y * math.cos(a)]

# ---- hand + tube: wind-up back, lift and tilt to pour, a flick per drop, tilt back with overshoot
rk = [(0, 0, 'lin'), (4, 0, 'io'), (12, -3.0, 'io'), (24, TILT + 1.5, 'soft'), (28, TILT, 'io')]
pk = [(0, pos(WRIST), 'lin'), (4, pos(WRIST), 'io'), (12, pos(WRIST, -4, 8), 'io'), (26, pos(WRIST, SHIFT, LIFT), 'io')]
for tr in DROPS:
    rk += [(tr - 3, TILT, 'in'), (tr, TILT + 1.8, 'out'), (tr + 4, TILT - 0.4, 'soft')]
    pk += [(tr - 3, pos(WRIST, SHIFT, LIFT), 'in'), (tr, pos(WRIST, SHIFT, LIFT + 6), 'out'), (tr + 4, pos(WRIST, SHIFT, LIFT - 1), 'soft')]
rk += [(80, TILT, 'io'), (93, -3.0, 'soft'), (101, 0.8, 'soft'), (108, 0, 'lin'), (OP, 0, 'lin')]
pk += [(80, pos(WRIST, SHIFT, LIFT), 'io'), (95, pos(WRIST, -3, 7), 'soft'), (104, pos(WRIST, 0, -1), 'soft'), (110, pos(WRIST), 'lin'), (OP, pos(WRIST), 'lin')]
hand = D.layer('Hand + tube', grp(P, [0], 'hand'), WRIST, r=anim(rk), p=anim(pk))
def lip_at(t):
    q = rotp(LIP, WRIST, sample(rk, t)); o = sample(pk, t)
    return [q[0] + o[0] - WRIST[0], q[1] + o[1] - WRIST[1]]
print('lip at releases', [[round(v) for v in lip_at(t)] for t in DROPS])

# ---- liquid inside the tube runs toward the mouth (lags the tilt by ~4 f, sloshes back)
m0 = ink_mask((W, H), P[0][0], 2)
blob = cv2.morphologyEx(m0.astype(np.uint8), cv2.MORPH_OPEN, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (110, 110))) > 0
BL = [266, 641]
lk = [(0, 100, 'lin'), (8, 100, 'io'), (15, 96, 'io'), (30, 120, 'soft'), (38, 115, 'io'), (82, 115, 'io'),
      (97, 95, 'soft'), (106, 102, 'soft'), (113, 100, 'lin'), (OP, 100, 'lin')]
D.layer('Tube liquid', [mask_group('liquid', mask_to_paths(blob, 2))], BL, parent=hand,
        s=anim([(t, [v, 100 - (v - 100) * 0.35, 100], e) for t, v, e in lk]))

# ---- drops: form at the lip, leave it with a little forward speed, fall with gravity into the flask
def drop_shape(r=16):
    k = 0.5523 * r
    v = [[0, -r * 1.25], [r, 0], [0, r], [-r, 0]]
    i = [[-k * 0.6, 0], [0, -k * 1.1], [k, 0], [0, k]]
    o = [[k * 0.6, 0], [0, k], [-k, 0], [0, -k * 1.1]]
    return {"ty": "gr", "nm": "drop", "it": [
        {"ty": "sh", "ks": {"a": 0, "k": {"c": True, "v": v, "i": i, "o": o}}},
        {"ty": "fl", "c": {"a": 0, "k": [0, 0, 0, 1]}, "o": {"a": 0, "k": 100}},
        {"ty": "tr", "p": {"a": 0, "k": [0, 0]}, "a": {"a": 0, "k": [0, 0]}, "s": {"a": 0, "k": [100, 100]},
         "r": {"a": 0, "k": 0}, "o": {"a": 0, "k": 100}}]}
XEND = 1000
for n, tr in enumerate(DROPS):
    sp = lip_at(tr); sp = [sp[0] + 1, sp[1] + 10]
    pk_ = [(0, pos(sp), 'lin')] + [(f, pos([lip_at(f)[0] + 1, lip_at(f)[1] + 10]), 'lin') for f in range(tr - 7, tr + 1)]
    sk_ = [(0, [0, 0, 100], 'lin'), (tr - 7, [0, 0, 100], 'out')]
    sk_ += [(tr - 1, [92, 105, 100], 'io'), (tr + 1, [80, 128, 100], 'lin')]
    for f in range(1, FALL + 1):
        u = f / FALL
        pk_.append((tr + f, pos([sp[0] + (XEND - sp[0]) * (1 - (1 - u) ** 2), sp[1] + (SURF - sp[1]) * u * u]), 'lin'))
    sk_ += [(tr + FALL - 1, [76, 132, 100], 'lin'), (tr + FALL, [0, 0, 100], 'lin'), (OP, [0, 0, 100], 'lin')]
    pk_.append((OP, pos([XEND, SURF]), 'lin'))
    D.layer(f'Drop {n + 1}', [drop_shape()], [0, 0], p=anim(pk_), s=anim(sk_))

# ---- splash: two tiny droplets jump off the surface on each landing (inside the neck)
def dot(r):
    g = drop_shape(r); g['it'][0]['ks']['k'] = {"c": True, "v": [[0, -r], [r, 0], [0, r], [-r, 0]],
        "i": [[-.55 * r, 0], [0, -.55 * r], [.55 * r, 0], [0, .55 * r]], "o": [[.55 * r, 0], [0, .55 * r], [-.55 * r, 0], [0, -.55 * r]]}
    return g
for side, dx, hgt in (('L', -24, 34), ('R', 22, 26)):
    pk_, sk_ = [(0, pos([XEND, SURF]), 'lin')], [(0, [0, 0, 100], 'lin')]
    for n, tl in enumerate(LAND):
        h = hgt * (1 - 0.12 * (n % 2))
        pk_ += [(tl, pos([XEND, SURF - 4]), 'out'), (tl + 4, pos([XEND + dx * 0.7, SURF - 4 - h]), 'in'),
                (tl + 8, pos([XEND + dx, SURF + 2]), 'lin')]
        sk_ += [(tl, [0, 0, 100], 'out'), (tl + 2, [100, 100, 100], 'lin'), (tl + 7, [80, 80, 100], 'lin'), (tl + 8, [0, 0, 100], 'lin')]
    pk_.append((OP, pos([XEND, SURF]), 'lin')); sk_.append((OP, [0, 0, 100], 'lin'))
    D.layer(f'Splash {side}', [dot(8 if side == "L" else 7)], [0, 0], p=anim(pk_), s=anim(sk_))

# ---- action lines next to the spout: kick on every landing
for idx, base in ((2, [1067, 697]), (1, [1134, 712])):
    sk_ = [(0, 100, 'lin'), (LAND[0] - 1, 100, 'out')]
    for tl in LAND:
        sk_ += [(tl, 100, 'out'), (tl + 3, 116, 'soft'), (tl + 8, 100, 'lin')]
    sk_.append((OP, 100, 'lin'))
    D.layer(f'Action line {idx}', grp(P, [idx], 'line'), base, s=anim([(t, [v, v, 100], e) for t, v, e in sk_]))

# ---- bubbles in the flask neck: a steady fizz rising from the surface, popping below the rim
TOP, BOT, PER = 852, 1062, 60
for idx in (3, 4, 5):
    c = centre(P[idx]); y0 = c[1]
    pk_, sk_ = [], []
    phase = (BOT - y0) / (BOT - TOP)              # where this bubble is in its cycle at frame 0
    for t in range(0, OP + 1):
        u = (phase + t / PER) % 1.0
        y = BOT - (BOT - TOP) * u
        x = c[0] + 4 * math.sin(2 * math.pi * (u * 2 + idx * 0.3)) - 4 * math.sin(2 * math.pi * (phase * 2 + idx * 0.3))
        sc = 0 if (u < 0.04 or u > 0.96) else 100 * min(1, (u - 0.04) / 0.1, (0.96 - u) / 0.05)
        pk_.append((t, pos([x, y]), 'lin')); sk_.append((t, [sc, sc, 100], 'lin'))
    D.layer(f'Bubble {idx}', grp(P, [idx], 'bubble'), c, p=anim(pk_), s=anim(sk_))

D.layer('Flask', grp(P, [6], 'flask'), centre(P[6]))
D.layer('Test tube rack', grp(P, [7], 'rack'), centre(P[7]))
D.save('chemistry_pour_loop.json')
