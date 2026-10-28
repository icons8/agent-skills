"""Example: DNA helix over a cell, drawn as ONE merged outline. The membrane is split from the helix by
stroke thickness, the hidden membrane arc rebuilt and tucked under the helix silhouette (inverted matte);
the helix levitates rigidly with a very slight looped bend; cell contents drift independently."""
import sys, os, math; sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'scripts'))
from lot import *
import numpy as np, cv2
from scipy import ndimage
SRC = sys.argv[1] if len(sys.argv) > 1 else 'dna.svg'
P = load_paths(SRC); W, H = svg_size(SRC); OP = 120; K = 2
D = Doc('DNA cell loop', OP, w=W, h=H)
C = {i: centre(P[i]) for i in range(len(P))}

# ---- the helix and the cell membrane were drawn as ONE merged outline: split them.
S = ink_mask((W, H), P[2][0], K)
I = ink_mask((W, H), parse_path(P[2][0]).continuous_subpaths()[8].d(), K)   # white inside of the cell
thick = ndimage.binary_opening(S, structure=np.ones((3, 3)), iterations=16 * K)
thick = ndimage.binary_dilation(thick, iterations=18 * K) & S                 # thick strand pixels
membrane = S & (ndimage.distance_transform_edt(~I) < 34 * K) & ~thick         # thin ring hugging the inside
helix = S & ~membrane
# the helix covers part of the membrane: rebuild that hidden arc so it shows when the helix floats away
ys, xs = np.nonzero(membrane); xs = xs / K; ys = ys / K
A = np.c_[xs, ys, np.ones_like(xs)]; b = -(xs ** 2 + ys ** 2)
Dd, Ee, Ff = np.linalg.lstsq(A, b, rcond=None)[0]; cx, cy = -Dd / 2, -Ee / 2; r = math.sqrt(cx * cx + cy * cy - Ff)
ang = np.degrees(np.arctan2(ys - cy, xs - cx)); hist = np.histogram(ang, bins=360, range=(-180, 180))[0]
gap = [a - 180 for a in range(360) if hist[a] == 0]
helix_sil = ndimage.binary_erosion(ndimage.binary_fill_holes(ndimage.binary_dilation(helix, iterations=10 * K)), iterations=13 * K)

HELIX_C = (760, 560)
def lev(t):                       # continuous levitation; tilt lags the bob a little
    return 16 * math.cos(2 * math.pi * t / OP), 1.6 * math.cos(2 * math.pi * (t - 10) / OP)
hp = anim([(t, pos(HELIX_C, 0, round(lev(t)[0], 2)), 'lin') for t in range(0, OP + 1, 2)])
hr = anim([(t, round(lev(t)[1], 3), 'lin') for t in range(0, OP + 1, 2)])

def drift(c, n, amp=(9, 7), rot=6):
    ph = 0.29 * n
    p = anim([(t, pos(c, round(amp[0] * math.sin(2 * math.pi * (t / OP + ph)), 2),
                      round(amp[1] * math.sin(2 * math.pi * (2 * t / OP + ph * 1.7)), 2)), 'lin') for t in range(0, OP + 1, 2)])
    r = sine(0, rot, OP, OP, ph + 0.13)
    return dict(p=p, r=r)

# sparks: soft twinkle twice per loop, offset
for n, i in enumerate([0, 1]):
    c = C[i]; k = [(0, S100, 'lin')]
    for f in (20 + 8 * n, 80 + 8 * n):
        k += [(f - 3, S100, 'io'), (f + 3, [116, 116, 100], 'io'), (f + 10, S100, 'soft')]
    D.layer(f'Spark line {n+1}', grp(P, [i], 'spark'), c, s=anim(k + [(OP, S100, 'lin')]))
# cell contents float freely, each on its own path (drawn in front, like in the SVG)
for n, (name, idxs, c) in enumerate([('Chromosome X', [4], C[4]), ('Spindle', [8], [362, 804]),
                                     ('Chromosome squiggle', [3], C[3]), ('Vesicle 1', [5], C[5]),
                                     ('Vesicle 2', [6], C[6]), ('Vesicle 3', [7], C[7])]):
    D.layer(name, grp(P, idxs, name), c, **drift(c, n, rot=6 if len(idxs) and idxs[0] in (3, 4, 8) else 0))
# a very slight back-and-forth bend of the whole helix (centre still, ends sway), twice per loop
BEND = 60
def bend(t, x, y):
    u = (y - HELIX_C[1]) / 520
    a = 7 * math.sin(2 * math.pi * t / BEND)
    return x + a * u * abs(u) * 1.0 + a * 0.35 * u, y
float_null = D.layer('Helix float', [], HELIX_C, p=hp, r=hr)
D.get(float_null)['ty'] = 3; del D.get(float_null)['shapes']
bf = list(range(0, BEND + 1, 5))
helix_paths = mask_to_paths(helix, K, tol=0.9)
grp_helix = {"ty": "gr", "nm": "helix", "it": [{"ty": "sh", "ks": deform_path_keys(p_, bend, BEND, bf)} for p_ in helix_paths] + mask_group('x', [])['it']}
helix_l = D.looped('DNA helix', [grp_helix], BEND, parent=float_null)
sil_paths = mask_to_paths(helix_sil, K, tol=2.5)
mbend = lambda t, x, y: bend(t % BEND, x, y)
grp_sil = {"ty": "gr", "nm": "sil", "it": [{"ty": "sh", "ks": deform_path_keys(p_, mbend, OP, list(range(0, OP + 1, 5)))} for p_ in sil_paths] + mask_group('x', [])['it']}
mind = D.layer('Helix silhouette (matte)', [grp_sil], [0, 0], parent=float_null); D.get(mind)['td'] = 1
D.get(mind)['ks']['a'] = st([0, 0, 0]); D.get(mind)['ks']['p'] = st([0, 0, 0])
arc = [(cx + (r) * math.cos(math.radians(a)), cy + (r) * math.sin(math.radians(a))) for a in range(min(gap) - 3, max(gap) + 4, 2)]
cell = D.layer('Cell membrane', [mask_group('membrane', mask_to_paths(membrane, K)), stroke_group('hidden membrane arc', arc, 22)], [cx, cy])
set_matte(D, mind, cell, inverted=True)
D.save('dna_loop.json')
print('circle', round(cx), round(cy), round(r), 'gap', min(gap), max(gap))
