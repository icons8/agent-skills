import sys, math; sys.path.insert(0, __import__('os').path.join(__import__('os').path.dirname(__import__('os').path.abspath(__file__)), '..', 'scripts'))
from lot import *
import numpy as np, cv2
SRC = 'coffee.svg'
P = load_paths(SRC); W, H = svg_size(SRC); OP = 84; K = 2
D = Doc('Coffee and croissant loop', OP, w=W, h=H)

# ---- split the merged outline (path 1) into lid / cup / croissant  (see split.py)
S = np.load('split.npz'); cup_m, lid_m, cro_m, sil_m = S['cup'], S['lid'], S['cro'], S['sil']
# rebuild the cup's corner hidden behind the croissant (only seen if the cup moves away from it)
hid = np.zeros(cup_m.shape, np.uint8)
cv2.line(hid, (788 * K, 990 * K), (778 * K, 1104 * K), 1, 22 * K)
cv2.line(hid, (680 * K, 1107 * K), (778 * K, 1104 * K), 1, 22 * K)
cup_m = cup_m | ((hid > 0) & sil_m)

BASE = [560, 1106]                 # cup stands on its bottom
LIDP = [318, 446]                  # lid hinges on its left rim edge                  # lid sits on the cup's top edge
CRO = [1000, 1120]
SQ, POP = 16, 21                   # anticipation squash, release (steam pops the lid)

# ---- steam: two curls drawn on (trim) as they rise out of the popped lid, then erased upward
def steam(name, x0, y0, h, amp, ph):
    pts = [(x0 + amp * math.sin(ph + u * 2.6 * math.pi) * (0.5 + 0.5 * u), y0 - h * u) for u in np.linspace(0, 1, 28)]
    g = stroke_group(name, pts, 22)
    g['it'].insert(2, {"ty": "tm", "nm": "trim", "m": 1, "o": {"a": 0, "k": 0},
                       "s": None, "e": None})
    return g
for n, (x0, t0, amp, ph) in enumerate(((520, POP + 1, 16, 0.0), (625, POP + 6, 13, 2.2))):
    g = steam(f'steam {n + 1}', x0, 215, 150, amp * 1.3, ph)
    tm = g['it'][2]
    tm['e'] = anim([(0, [0], 'lin'), (t0, [0], 'out'), (t0 + 14, [100], 'lin'), (OP, [100], 'lin')])
    tm['s'] = anim([(0, [0], 'lin'), (t0 + 12, [0], 'io'), (t0 + 30, [100], 'lin'), (OP, [100], 'lin')])
    c = [x0, 215]
    D.layer(f'Steam {n + 1}', [g], c,
            p=anim([(0, pos(c), 'lin'), (t0, pos(c), 'out'), (t0 + 30, pos(c, 6 * (1 if n else -1), -45), 'lin'), (OP, pos(c, 0, -45), 'lin')]),
            o=anim([(0, 0, 'lin'), (t0, 0, 'lin'), (t0 + 1, 100, 'lin'), (t0 + 20, 100, 'io'), (t0 + 30, 0, 'lin'), (OP, 0, 'lin')]))

# ---- sparkles: twinkle (grow + quarter turn) on the pop, and once more later to keep the end alive
for idx, times in ((4, (POP + 3, 56)), (3, (POP + 11, 68))):
    c = centre(P[idx])
    sk, rk = [(0, 100, 'lin')], [(0, 0, 'lin')]
    for t in times:
        sk += [(t, 100, 'out'), (t + 5, 128, 'soft'), (t + 12, 100, 'lin')]
        rk += [(t, 0, 'io'), (t + 6, 20, 'soft'), (t + 12, 0, 'lin')]
    sk.append((OP, 100, 'lin')); rk.append((OP, 0, 'lin'))
    D.layer(f'Sparkle {idx}', grp(P, [idx], 'sparkle'), c, s=anim([(t, [v, v, 100], e) for t, v, e in sk]), r=anim(rk))

# ---- motion lines next to the cup: kick outward on the squash release
for idx, base, dx in ((5, [360, 1035], -1), (6, [846, 576], 1)):
    D.layer(f'Motion line {idx}', grp(P, [idx], 'line'), base,
            p=anim([(0, pos(base), 'lin'), (SQ, pos(base), 'out'), (POP + 2, pos(base, 12 * dx, 0), 'soft'), (POP + 14, pos(base), 'lin'), (OP, pos(base), 'lin')]),
            s=anim([(0, S100, 'lin'), (SQ, S100, 'out'), (POP + 2, [100, 122, 100], 'soft'), (POP + 14, S100, 'lin'), (OP, S100, 'lin')]))

# ---- croissant: separate object; a small jiggle a few frames after the cup springs up
cro = D.layer('Croissant', [mask_group('croissant', mask_to_paths(cro_m, K))], CRO,
              s=anim([(t, [round(100 - 0.8 * v, 3), round(100 + v, 3), 100], 'lin') for t, v in
                      ((t, (lambda u: 0 if u < 0 else -3.0 * math.exp(-0.1 * u) * math.sin(2 * math.pi * u / 12) * min(1, max(0, (36 - u) / 8)))(t - SQ - 6))
                       for t in range(OP + 1))]))

# ---- cup: squash (anticipation) -> stretch with a tilt (steam pressure) -> settle
# smooth squash & stretch: a slow eased wind-up, then a damped spring sampled every frame (no sharp eases)
SPER, DECAY = 14.0, 0.075
def spring(t, amp, phase_sin=False):
    """Value of a damped oscillation released at SQ (0 before, fades to exactly 0 by SQ+40)."""
    if t < SQ: return 0.0
    u = t - SQ; w = 2 * math.pi / SPER
    v = amp * math.exp(-DECAY * u) * (math.sin(w * u) if phase_sin else math.cos(w * u))
    return v * min(1.0, max(0.0, (SQ + 40 - t) / 10))
def windup(t):
    if t < 4: return 0.0
    if t >= SQ: return 1.0
    u = (t - 4) / (SQ - 4); return 0.5 - 0.5 * math.cos(math.pi * u)
cs, cr = [], []
for t in range(0, OP + 1):
    x = -7.0 * windup(t) if t < SQ else spring(t, -7.0)        # - squash, + stretch
    cs.append((t, [round(100 - 0.7 * x, 3), round(100 + x, 3), 100], 'lin'))
    ramp = min(1.0, max(0.0, (t - SQ) / 6)); ramp = ramp * ramp * (3 - 2 * ramp)   # ease the tilt in, no kick
    cr.append((t, round(spring(t, -3.0, True) * ramp, 3), 'lin'))
cup = D.layer('Cup', [mask_group('cup', mask_to_paths(cup_m, K))], BASE, s=anim(cs), r=anim(cr))
# ---- lid: popped up by the steam, tilts, lands with a small bounce (follows the cup, 2 f late)
D.layer('Lid', [mask_group('lid', mask_to_paths(lid_m, K))], LIDP, parent=cup,
        p=anim([(0, pos(LIDP), 'lin'), (POP, pos(LIDP), 'out'), (POP + 6, pos(LIDP, 3, -20), 'in'),
                (POP + 13, pos(LIDP), 'out'), (POP + 17, pos(LIDP, 0, -6), 'in'), (POP + 21, pos(LIDP), 'soft'), (POP + 24, pos(LIDP), 'lin'), (OP, pos(LIDP), 'lin')]),
        r=anim([(0, 0, 'lin'), (POP, 0, 'out'), (POP + 6, -5, 'io'), (POP + 13, 0.8, 'io'), (POP + 17, -1.0, 'io'),
                (POP + 22, 0, 'soft'), (POP + 24, 0, 'lin'), (OP, 0, 'lin')]))
D.layer('Cup logo', grp(P, [2], 'logo'), centre(P[2]), parent=cup)
sil = mask_to_paths(sil_m, K)
sil = max(sil, key=lambda p: len(p['v']))
m = matte_layer(D, 'Croissant occlusion matte', sil, CRO, parent=cro)
set_matte(D, m, cup, inverted=True)

D.save('coffee_loop.json')
