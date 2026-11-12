"""Example: notification bell. Pendulum swing + sound-line bursts + speech bubble pop-in/out.
Story beats (120f / 4 s): anticipation -> 3 strikes with decaying swing -> bubble pops after
first strike, '!' hops -> hold (frame matches the source art) -> bubble collapses -> frame 0."""
import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'scripts'))
from lot import *

SRC = sys.argv[1] if len(sys.argv) > 1 else 'bell.svg'
P = load_paths(SRC); W, H = svg_size(SRC); OP = 120
D = Doc('Bell ring loop', OP, w=W, h=H)

HOOK, MOUTH, TAIL, BANG = [1015, 322], [745, 1130], [600, 530], [425, 408]
STRIKES = [22, 37, 51]

bub = D.layer('Bubble', grp(P, [2, 3], 'bubble'), TAIL,
    s=anim([(0, [0, 0, 100], 'lin'), (26, [0, 0, 100], 'out'), (35, [112, 112, 100], 'io'), (41, [96, 96, 100], 'io'),
            (47, S100, 'lin'), (98, S100, 'io'), (102, [106, 106, 100], 'in'), (111, [0, 0, 100], 'lin'), (OP, [0, 0, 100], 'lin')]),
    r=anim([(0, -14, 'lin'), (26, -14, 'out'), (38, 3, 'io'), (46, 0, 'lin'), (98, 0, 'in'), (111, -10, 'lin'), (OP, -10, 'lin')]),
    p=anim([(0, pos(TAIL), 'lin'), (47, pos(TAIL), 'io'), (72, pos(TAIL, 0, -8), 'io'), (98, pos(TAIL), 'lin'), (OP, pos(TAIL), 'lin')]))
D.layer('Exclamation', grp(P, [4, 5], 'bang'), BANG, parent=bub,
    p=anim([(0, pos(BANG), 'lin'), (38, pos(BANG), 'out'), (44, pos(BANG, 0, -27), 'io'), (51, pos(BANG, 0, 3), 'soft'),
            (56, pos(BANG), 'lin'), (OP, pos(BANG), 'lin')]),
    s=anim([(0, S100, 'lin'), (38, S100, 'out'), (42, [82, 120, 100], 'io'), (50, [122, 80, 100], 'soft'), (57, S100, 'lin'), (OP, S100, 'lin')]),
    r=anim([(0, 0, 'lin'), (74, 0, 'io'), (77, 16, 'io'), (80, -13, 'io'), (83, 8, 'io'), (86, -4, 'io'), (89, 0, 'lin'), (OP, 0, 'lin')]))
D.layer('Bell', grp(P, [0, 1], 'bell'), HOOK,
    r=anim([(0, 0, 'io'), (12, 7, 'io'), (22, -24, 'io'), (30, 11, 'io'), (37, -17, 'io'), (44, 8, 'io'),
            (51, -10, 'io'), (58, 6, 'io'), (65, -3.5, 'io'), (72, 1.5, 'io'), (80, 0, 'lin'), (OP, 0, 'lin')]))
sk, ok = [(0, 60, 'lin')], [(0, 0, 'lin')]
for n, f in enumerate(STRIKES):
    last = n == len(STRIKES) - 1
    sk += [(f - 2, 60, 'out'), (f + 5, 104 if last else 112, 'soft'), (f + 12, 100 if last else 85, 'lin')]
    ok += [(f - 2, 0, 'out'), (f + 3, 100, 'lin')] + ([] if last else [(f + 8, 100, 'in'), (f + 12, 0, 'lin')])
sk += [(100, 100, 'in'), (108, 120, 'lin'), (OP, 120, 'lin')]; ok += [(100, 100, 'in'), (108, 0, 'lin'), (OP, 0, 'lin')]
D.layer('Ring lines', grp(P, [6, 7, 8], 'line'), MOUTH, s=anim([(t, [v, v, 100], e) for t, v, e in sk]), o=anim(ok))
D.save('bell_ring_loop.json')
