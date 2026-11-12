import sys, math; sys.path.insert(0, __import__('os').path.join(__import__('os').path.dirname(__import__('os').path.abspath(__file__)), '..', 'scripts'))
from lot import *
SRC = 'handshake.svg'   # copy from assets/approved/
P = load_paths(SRC); W, H = svg_size(SRC); OP = 72
D = Doc('Handshake loop', OP, w=W, h=H)

def smooth(u):
    u = min(1.0, max(0.0, u)); return u * u * (3 - 2 * u)

# The two hands are interlocked in one outline: they are not cut apart (Principle 13) — they shake as one clasp.
# Both forearms come in from the sides, so the clasp in the middle travels most and the wrists least:
# the whole drawing bends as one piece (path deformation), it is not slid around rigidly.
X0, X1, XC = 98.0, 1387.0, 690.0
S0, S1, PUMP = 6, 42, 12          # three pumps
def pump(t):
    env = smooth((t - S0) / 6) * smooth((S1 - t) / 8)
    return 34 * env * math.sin(2 * math.pi * (t - S0) / PUMP) if S0 <= t <= S1 else 0.0
def squeeze(t):
    return math.sin(math.pi * min(1, max(0, (t - SQ) / 10))) ** 2
def warp(t, x, y):
    u = min(1.0, max(0.0, (x - X0) / (X1 - X0)))
    w = 0.25 + 0.75 * math.sin(math.pi * u)                 # wrists move least, the clasp most
    dy = pump(t) * w
    # tilt: the clasp leads, forearms follow -> a slight S-bend across the arms
    dy += 0.12 * pump(t - 2) * (u - 0.5) * 2 * (1 - w)
    return x, y + dy
frames = sorted(set(list(range(S0 - 1, S1 + 2)) + [0, OP]))
D.layer('Handshake', [deform_group('hands', P[0], warp, OP, frames=frames, simplify=2.0)], [0, 0],
        p=anim([(t, pos([0, 0], 0, round(3 * math.sin(2 * math.pi * t / (OP / 2)), 2)), 'lin') for t in range(0, OP + 1, 2)]))
D.save('handshake_loop.json')
