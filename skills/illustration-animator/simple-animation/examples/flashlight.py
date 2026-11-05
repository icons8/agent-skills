import sys, math; sys.path.insert(0, __import__('os').path.join(__import__('os').path.dirname(__import__('os').path.abspath(__file__)), '..', 'scripts'))
from lot import *
SRC = 'flashlight.svg'   # copy from assets/approved/
P = load_paths(SRC); W, H = svg_size(SRC); OP = 120
D = Doc('Flashlight check loop', OP, w=W, h=H)

def smooth(u):
    u = min(1.0, max(0.0, u)); return u * u * (3 - 2 * u)
def spring(t, t0, amp, per=10.0, decay=0.2, end=18, sin=False):
    if t < t0: return 0.0
    u = t - t0; w = 2 * math.pi / per
    v = amp * math.exp(-decay * u) * (math.sin(w * u) if sin else math.cos(w * u))
    return v * smooth((t0 + end - t) / 6)

LENS = [1110, 440]
SW0, SW1, SW2 = 8, 40, 66          # sweep: up across the card, back past rest, home
OFF, TAP, ON = 72, 84, 94          # click off, a tap on the flaky torch, click on

# ---- flashlight: sweeps its beam over the card; jolts on the clicks and the tap
fr = []
for t in range(OP + 1):
    if t < SW1: a = 6.0 * smooth((t - SW0) / (SW1 - SW0))
    elif t < SW2: a = 6.0 - 8.0 * smooth((t - SW1) / ((SW2 - SW1) * 0.6)) + 2.0 * smooth((t - SW1 - (SW2 - SW1) * 0.6) / ((SW2 - SW1) * 0.4))
    else: a = 0.0
    a += spring(t, OFF, 1.2, per=8, decay=0.3, end=10, sin=True) + spring(t, TAP, -2.2, per=8, decay=0.25, end=14, sin=True) \
        + spring(t, ON, 1.2, per=8, decay=0.3, end=10, sin=True)
    a += 0.7 * math.sin(2 * math.pi * t / 60)          # hand-held: the torch never sits dead still
    fr.append((t, round(a, 3), 'lin'))
torch = D.layer('Flashlight', grp(P, [24, 25, 26, 27, 29], 'torch'), LENS, r=anim(fr))
# the switch on the body: pressed a few frames before the light goes off and before it comes back on
BTN = centre(P[28]); NRM = (0.59, 0.81)                       # into the body
bp, bs = [], []
for t in range(OP + 1):
    d = 0.0
    for t0 in (OFF - 3, ON - 3):
        d += 11 * smooth((t - t0 + 3) / 3) * (1 - smooth((t - t0 - 2) / 3)) + spring(t, t0 + 5, -3.0, per=8, decay=0.3, end=10, sin=True)
    bp.append((t, pos(BTN, round(NRM[0] * d, 2), round(NRM[1] * d, 2)), 'lin'))
    bs.append((t, [round(100 + d * 0.8, 2), round(100 - d * 0.8, 2), 100], 'lin'))
D.layer('Switch', grp(P, [28], 'switch'), BTN, parent=torch, p=anim(bp), s=anim(bs))

# ---- beam edges ride on the torch; retract into the lens on "off", shoot out with a flicker on "on"
def beam(name, idxs, a, b):
    L = D.layer(name, grp(P, idxs, 'beam'), [0, 0], parent=torch,
                o=anim([(0, 100, 'lin'), (ON + 2, 100, 'lin'), (ON + 3, 25, 'lin'), (ON + 4, 100, 'lin'),
                        (ON + 6, 100, 'lin'), (ON + 7, 40, 'lin'), (ON + 8, 100, 'lin'), (OP, 100, 'lin')]))
    axis_reveal(D.get(L), a, b, 60, [(0, 0, 1, 'lin'), (OFF, 0, 1, 'in'), (OFF + 6, 0, 0, 'lin'),
                                     (ON, 0, 0, 'out'), (ON + 7, 0, 1, 'lin'), (OP, 0, 1, 'lin')], overshoot=30)
beam('Beam upper edge', [20, 21, 22, 23], (1000, 352), (60, 668))
beam('Beam lower edge', [19], (1182, 662), (806, 1472))

# ---- click marks at the tail: flick on each click
CL = [1640, 245]
ck = []
for t in range(OP + 1):
    e = sum(smooth((t - t0) / 3) - smooth((t - t0 - 4) / 7) for t0 in (OFF - 3, ON - 3))
    ck.append((t, [round(100 + 35 * e, 2)] * 2 + [100], 'lin'))
lag = [(t, fr[(t - 3) % OP][1], 'lin') for t in range(OP + 1)]
lag[-1] = (OP, lag[0][1], 'lin')
rig = D.layer('Click marks rig', [], LENS, r=anim(lag))
D.layer('Click marks', grp(P, [30, 31, 32, 33], 'click'), CL, s=anim(ck), parent=rig)

# ---- the card: details light up as the beam passes over them (small pops, in sweep order)
def pop(idxs, t0, name, amp=10, axis=None, n=0):
    c = centre(P[idxs[0]])
    k = [(t, [round(100 + amp * math.sin(math.pi * min(1, max(0, (t - t0) / 8))) ** 2, 2)] * 2 + [100], 'lin') for t in range(OP + 1)]
    L = D.layer(name, grp(P, idxs, 'detail'), c, s=anim(k))
    if axis:
        e0 = OFF + 1 + 2 * n; w0 = ON + 7 + 4 * n
        axis_reveal(D.get(L), axis[0], axis[1], 75 if n >= 0 else 260, [(0, 0, 1, 'lin'), (e0, 0, 1, 'io'), (e0 + 7, 1, 1, 'lin'),
                                                     (w0, 0, 0, 'io'), (w0 + 9, 0, 1, 'lin'), (OP, 0, 1, 'lin')], overshoot=30)
pop([12, 13, 14, 15, 16, 17, 18], 14, 'Card row 3', 8, ((755, 945), (1165, 1105)), 2)
pop([7, 8, 9, 10, 11], 20, 'Card row 2', 8, ((815, 825), (1150, 965)), 1)
pop([6, 4, 5], 26, 'Card row 1', 8, ((860, 712), (1268, 868)), 0)
pop([2, 3], 33, 'Card photo', 7, ((365, 590), (800, 750)), -1)
D.layer('Card', grp(P, [0, 1], 'card'), centre(P[0]))
D.save('flashlight_loop.json')
