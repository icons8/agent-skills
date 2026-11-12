"""Example: Saturn + constellation. Connect-the-dots: a line draws (axis_reveal) and the star it reaches
lights up; branches run in parallel; finale twinkle as a left->right wave; lines wipe away in their
drawing direction; Saturn (planet+ring drawn as one path) drifts as one body."""
import sys, os, math; sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'scripts'))
from lot import *
SRC = sys.argv[1] if len(sys.argv) > 1 else 'saturn.svg'
P = load_paths(SRC); W, H = svg_size(SRC); OP = 150
D = Doc('Saturn constellation loop', OP, w=W, h=H)

C = {i: centre(P[i]) for i in range(len(P))}
ALL_LIT = 76          # constellation complete -> everything twinkles together
ERASE = 104           # lines fade away along their direction, then a still hold

def twinkle(fs, big=128):
    k = [(0, S100, 'lin')]
    for f in fs:
        k += [(f - 3, S100, 'io'), (f, [86, 86, 100], 'out'), (f + 5, [big, big, 100], 'io'),
              (f + 11, [95, 95, 100], 'soft'), (f + 17, S100, 'lin')]
    return anim(k + [(OP, S100, 'lin')])
def _unused(fs, deg=30):
    k = [(0, 0, 'lin')]
    for f in fs:
        k += [(f, 0, 'out'), (f + 12, deg, 'soft'), (f + 13, 0, 'lin')]     # 4-point star: 90° symmetric -> snap back invisibly only if deg=90
    return k
def star(name, idx, lit, turn=True, big=128):
    fs = [lit, ALL_LIT + round((C[idx][0] - 150) / 1250 * 10)]     # finale twinkle runs as a wave left -> right
    rot = [(0, 0, 'lin')]
    for f in fs:
        rot += [(f, 0, 'out'), (f + 14, 90, 'soft'), (f + 15, 0, 'lin')]   # quarter turn of a 4-point star == same pose
    D.layer(name, grp(P, [idx], name), C[idx], s=twinkle(fs, big), r=anim(rot + [(OP, 0, 'lin')]) if turn else None)

def line(name, idx, a, b, start, dur):
    L = D.layer(name, grp(P, [idx], name), C[idx])
    axis_reveal(D.get(L), a, b, 70, [(0, 0, 0, 'lin'), (start, 0, 0, 'io'), (start + dur, 0, 1, 'lin'),
                                     (ERASE + start // 4, 0, 1, 'in'), (ERASE + start // 4 + 14, 1, 1, 'lin'), (OP, 1, 1, 'lin')])

# ---- constellation: connect the dots, the line arrives -> the next star lights up
star('Star A', 11, 6)
line('Line A-B', 6, C[11], C[10], 10, 14)
star('Star B', 10, 26)
line('Line B-C (up)', 5, C[10], C[8], 30, 12)
star('Star C', 8, 44)
line('Line B-D (down)', 7, C[10], C[9], 32, 16)
star('Star D', 9, 50)
star('Star E', 4, 14)
line('Line E-F', 3, C[4], C[1], 18, 20)
star('Big sparkle F', 1, 40, turn=False, big=116)   # asymmetric glyphs: no spin, they'd read as letters
star('Big sparkle G', 2, 54, turn=False, big=116)

# ---- Saturn: drifts slowly; the ring is drawn as one piece with the planet, so it tilts as one body
SAT = C[0]
D.layer('Saturn', grp(P, [0], 'saturn'), SAT,
        p=sine(pos(SAT), [0, -10, 0], OP, OP, 0.0), r=sine(0, 2.0, OP, OP, 0.25))
D.save('saturn_loop.json')
