import sys, math; sys.path.insert(0, __import__('os').path.join(__import__('os').path.dirname(__import__('os').path.abspath(__file__)), '..', 'scripts'))
# PNG source: python scripts/trace_png.py robot_hello.png robot.svg  -> robot.svg + wash_*.png + wash.json
# (source PNG: robot_hello.png, not shipped)
from lot import *
SRC = 'robot.svg'                      # traced from robot.png (trace.py); outlines from here, washes from the PNG
P = load_paths(SRC); W, H = svg_size(SRC); OP = 120
D = Doc('Robot hello loop', OP, w=W, h=H)
bump = lambda t, c, w: loop_bump(t, c, w, OP)
sim = lambda f, per, zeta: spring_sim(f, OP, per, zeta)
TT = range(OP + 1)
def ss(u):
    u = min(1.0, max(0.0, u)); return u * u * u * (u * (6 * u - 15) + 10)

# ---- story: "Hello!" — the robot waves its raised hand twice, nodding happily with each wave; both antennas
# spring from the head's moves (same reaction, slightly different lag); the other arm sways; the robot floats.
W0, W1, PER = 14, 62, 16                 # waving window, one wave = 16 f
env = lambda t: ss((t - W0) / 8) * ss((W1 - t) / 10)
wave = lambda t: env(t) * math.sin(2 * math.pi * (t - W0) / PER) if W0 <= t <= W1 else 0.0
FL = lambda t: math.sin(2 * math.pi * t / 60)                       # float, 2 per loop

# the watercolour wash is the PNG's own pixels (wash.py), embedded under each part's vector outline
import json as _j
WASH = _j.load(open('wash.json', encoding='utf-8'))
def wash(nm, i, parent):
    D.image_layer(nm + ' wash', WASH[i]['file'], WASH[i]['x'], WASH[i]['y'], parent=parent)

BODY = [775, 1060]
BY = sim(lambda t: 9 * FL(t), 10, 0.6)
body = D.layer('Body', grp(P, [10, 12], 'body'), BODY,
               p=anim([(t, pos(BODY, 0, round(BY[t], 2)), 'lin') for t in TT]))

wash('Body', 3, body)
HEAD = [790, 700]                        # bottom middle of the head
HR = sim(lambda t: 4.5 * wave(t - 2) + 1.2 * math.sin(2 * math.pi * t / 60 + 0.8), 10, 0.5)
HY = sim(lambda t: -6 * env(t) - 5 * FL(t - 6), 10, 0.6)             # lifts a bit while waving, floats a beat behind
head = D.layer('Head', grp(P, [5, 7, 8], 'head'), HEAD, parent=body,
               p=anim([(t, pos(HEAD, 0, round(HY[t], 2)), 'lin') for t in TT]),
               r=anim([(t, round(HR[t], 3), 'lin') for t in TT]))

wash('Head', 2, head)
# antennas: springs driven by the head's turn and lift (siblings react equally)
dHR = lambda t: HR[int(t + 1) % OP] - HR[int(t - 1) % OP]
dHY = lambda t: HY[int(t + 1) % OP] - HY[int(t - 1) % OP]
for nm, idx, base, sgn, ph, wi in [('Antenna L', [4], [545, 372], -1, 0, 0), ('Antenna R', [6], [1098, 478], 1, 1, 1)]:
    A = sim(lambda t: -1.4 * dHR(t - ph) + sgn * 0.35 * dHY(t - ph), 9, 0.28)
    a_ = D.layer(nm, grp(P, idx, nm.lower()), base, parent=head, r=anim([(t, round(A[t], 3), 'lin') for t in TT]))
    wash(nm, wi, a_)

# waving arm: pivots at its lower end (towards the body)
ARM = [432, 828]
AR = sim(lambda t: 16 * wave(t) - 3 * env(t) + 1.5 * FL(t - 10), 7, 0.5)
D.layer('Arm wave', grp(P, [9], 'arm'), ARM, parent=body, r=anim([(t, round(AR[t], 3), 'lin') for t in TT]))

ARM2 = [1100, 895]
A2 = sim(lambda t: -3 * FL(t - 14) - 2 * env(t), 12, 0.5)
D.layer('Arm rest', grp(P, [11], 'arm2'), ARM2, parent=body, r=anim([(t, round(A2[t], 3), 'lin') for t in TT]))
D.save('robot_hello_loop.json')
