"""Example: AI brain bust. Signal hits outer nodes -> runs inward -> thinking nod -> all nodes fire.
Antenna traces are split from their inside-the-head part by static masks; hinges hidden in the black
silhouette; antennas are baked pendulums driven by the figure's motion."""
import sys, os, math; sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'scripts'))
from lot import *
SRC = sys.argv[1] if len(sys.argv) > 1 else 'brain.svg'
P = load_paths(SRC); W, H = svg_size(SRC); OP = 82
D = Doc('AI brain loop', OP, w=W, h=H)

BASE = [757, 1380]                 # figure rotates/breathes from the bottom of the bust
TOP_HINGE, LEFT_HINGE = [833, 345], [530, 537]   # hinges sit inside the black head so the pivot seam is hidden   # where the antennas leave the head
NOD, EUREKA, CALM = 30, 52, 58

def static_mask(layer, x0, y0, x1, y1):
    layer["hasMask"] = True
    layer["masksProperties"] = [{"inv": False, "mode": "a", "pt": {"a": 0, "k": rect_path(x0, y0, x1, y1)},
                                 "o": {"a": 0, "k": 100}, "x": {"a": 0, "k": 0}, "nm": "Split"}]

def pop(f, big=135):
    return [(f, S100, 'out'), (f + 4, [big, big, 100], 'io'), (f + 9, [94, 94, 100], 'soft'), (f + 15, S100, 'lin')]

# ---- figure: thinking nod, then a small lift on the "eureka"
fig_r = [(0, 0, 'lin'), (NOD, 0, 'io'), (NOD + 6, -1.2, 'io'), (NOD + 14, 2.4, 'io'), (NOD + 22, -0.6, 'soft'),
         (EUREKA + 4, 0.2, 'soft'), (EUREKA + 12, 0, 'lin'), (OP, 0, 'lin')]
fig_s = [(0, S100, 'lin'), (EUREKA - 3, S100, 'out'), (EUREKA, [101, 98.5, 100], 'out'), (EUREKA + 5, [99, 102, 100], 'io'),
         (EUREKA + 11, [100.3, 99.7, 100], 'soft'), (EUREKA + 16, S100, 'lin'), (OP, S100, 'lin')]
figure = D.layer('Figure', grp(P, [0, 1, 2, 3, 4, 5, 6, 7, 9, 11], 'figure'), BASE, r=anim(fig_r), s=anim([(t, v, e) for t, v, e in fig_s]))

# inside-the-head parts of the two traces that continue out as antennas (split by a mask at the head edge)
t_in = D.layer('Trace top (inside)', grp(P, [8], 'trace'), TOP_HINGE, parent=figure)
static_mask(D.get(t_in), 0, TOP_HINGE[1], W, H)
l_in = D.layer('Trace left (inside)', grp(P, [10], 'trace'), LEFT_HINGE, parent=figure)
static_mask(D.get(l_in), LEFT_HINGE[0], 0, W, H)

# ---- antennas: springy stalks, driven by the figure's real motion (baked physics)
def world(p, t):
    a = math.radians(sample(fig_r, t)); x, y = p[0] - BASE[0], p[1] - BASE[1]
    sy = sample(fig_s, t)[1] / 100
    y *= sy
    return [BASE[0] + x * math.cos(a) - y * math.sin(a), BASE[1] + x * math.sin(a) + y * math.cos(a)]
damp = lambda t: 0.07 if t < CALM else 0.45
top_k, _ = pendulum(lambda t: world(TOP_HINGE, t), lambda t: sample(fig_r, t), OP, rod=(-8, -185),
                    period_f=10, zeta=damp, gain=1.0, limits=(-12, 12))
left_k, _ = pendulum(lambda t: world(LEFT_HINGE, t), lambda t: sample(fig_r, t), OP, rod=(-105, 0),
                     period_f=9, zeta=damp, gain=1.0, limits=(-12, 12))
fade = lambda ks: [(t, round(v * min(1, max(0, (OP - 4 - t) / 15)), 3), e) for t, v, e in ks]
top = D.layer('Antenna top', grp(P, [8, 12], 'antenna'), TOP_HINGE, r=anim(fade(top_k)), parent=figure)
static_mask(D.get(top), 0, 0, W, TOP_HINGE[1])
left = D.layer('Antenna left', grp(P, [10], 'antenna'), LEFT_HINGE, r=anim(fade(left_k)), parent=figure)
static_mask(D.get(left), 0, 0, LEFT_HINGE[0], H)
print('antenna swing max', max(abs(v) for _, v, _ in top_k), max(abs(v) for _, v, _ in left_k))

# ---- nodes: signal arrives at the outer nodes, runs inward, then everything fires together (eureka)
nodes = [('Node top', [15, 16], top, 2), ('Node right', [13, 14], top, 6), ('Node left', [17, 18], left, 10),
         ('Node inner right', [19, 20], figure, 17), ('Node inner low', [21, 22], figure, 23)]
for name, idxs, parent, f in nodes:
    c = centre(P[idxs[0]])
    D.layer(name, grp(P, idxs, 'node'), c, parent=parent,
            s=anim([(0, S100, 'lin')] + pop(f) + pop(EUREKA, 128) + [(OP, S100, 'lin')]))
D.save('brain_loop.json')
