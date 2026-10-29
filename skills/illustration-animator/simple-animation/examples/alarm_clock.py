"""Example: alarm clock. Hand laps the dial -> alarm rattles (body, then bell +3f) -> button pressed
-> everything damps out fast -> still hold. Unfilled bell occludes the minute hand via an inverted
matte; the clapper is a baked pendulum driven by bell + clock motion (damper engages at the press),
sound lines fire on its swing extremes."""
import sys, os, math; sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'scripts'))
from lot import *
SRC = sys.argv[1] if len(sys.argv) > 1 else 'alarm.svg'
P = load_paths(SRC); W, H = svg_size(SRC); OP = 104
D = Doc('Alarm clock loop', OP, w=W, h=H)

FOOT, CENTER, BTN = [560, 1240], [580, 822], [700, 400]
HIT = 40            # minute hand finishes its lap -> alarm starts
PRESS = 80          # button pushed down -> alarm stops
OFF_BELL, OFF_CLAP = 3, 5   # overlapping action: bell starts/ends later than the body, clapper later still

def alternate(start, end, every, amp0, amp1):
    """Rattle keys: alternating sign, amplitude fading amp0 -> amp1."""
    ks, n = [], 0
    for t in range(start, end + 1, every):
        u = (t - start) / max(1, end - start)
        a = amp0 + (amp1 - amp0) * u
        ks.append((t, a if n % 2 == 0 else -a, 'io' if every > 2 else 'lin'))
        n += 1
    return ks

# ---- clock body: rattles on its foot from HIT until the button is pressed, then settles
rat = [(0, 0, 'lin'), (HIT, 0, 'lin')] + alternate(HIT + 2, PRESS, 2, 2.6, 1.8) + \
      [(PRESS + 3, -0.8, 'soft'), (PRESS + 9, 0.3, 'soft'), (PRESS + 14, 0, 'lin'), (OP, 0, 'lin')]
jit = [(0, pos(FOOT), 'lin'), (HIT, pos(FOOT), 'lin')] + \
      [(t, pos(FOOT, 0, -6 if v > 0 else 0), e) for t, v, e in alternate(HIT + 2, PRESS, 2, 1, 1)] + \
      [(PRESS + 3, pos(FOOT, 0, 3), 'soft'), (PRESS + 10, pos(FOOT), 'lin'), (OP, pos(FOOT), 'lin')]
clock = D.layer('Clock', grp(P, [2, 3, 4, 5, 7, 11], 'clock'), FOOT, r=anim(rat), p=anim(jit))

# ---- bell: vibrates, starting OFF_BELL later and ringing out after the press (follow-through)
bk = [(0, 0, 'lin'), (HIT + OFF_BELL, 0, 'out')] + \
     alternate(HIT + OFF_BELL + 3, PRESS + OFF_BELL, 4, 2.6, 2.0) + \
     alternate(PRESS + OFF_BELL + 4, PRESS + OFF_BELL + 8, 4, 1.0, 0.4)
bk += [(bk[-1][0] + 5, 0, 'lin'), (OP, 0, 'lin')]
bell = D.layer('Bell', grp(P, [12, 13, 14], 'bell'), [920, 1010], r=anim(bk), parent=clock)
# clapper = pendulum hanging from the bell's crown, driven by the real motion of bell + clock
HINGE, BOB = [1045, 960], [885, 1197]
def rotp(p, c, deg):
    a = math.radians(deg); x, y = p[0] - c[0], p[1] - c[1]
    return [c[0] + x * math.cos(a) - y * math.sin(a), c[1] + x * math.sin(a) + y * math.cos(a)]
def hinge_world(t):
    p = rotp(HINGE, [920, 1010], sample(bk, t))                     # bell rotation
    p = rotp(p, FOOT, sample(rat, t))                               # clock rotation on its foot
    off = sample(jit, t); return [p[0] + off[0] - FOOT[0], p[1] + off[1] - FOOT[1]]
ck, hits = pendulum(hinge_world, lambda t: sample(rat, t) + sample(bk, t), OP,
                    rod=(BOB[0] - HINGE[0], BOB[1] - HINGE[1]), period_f=8, zeta=lambda t: 0.05 if t < PRESS + 2 else 0.55, gain=2.5,
                    limits=(-15, 15), restitution=0.5)
ck = [(t, round(v * min(1, max(0, (OP - 2 - t) / 18)), 3), e) for t, v, e in ck]   # die out before the loop point
D.layer('Clapper', grp(P, [15, 16, 17, 18], 'clapper'), HINGE, r=anim(ck), parent=bell)
# strikes = swing extremes near the wall (that's when the ball knocks the bell)
vals = [v for _, v, _ in ck]
peaks = [t for t in range(1, OP - 1) if abs(vals[t]) >= 6 and abs(vals[t]) >= abs(vals[t - 1]) and abs(vals[t]) >= abs(vals[t + 1])]
hits = []
for t in peaks:                       # a burst spans f-1..f+7 -> keep strikes at least 9 f apart
    if not hits or t - hits[-1] >= 9:
        hits.append(t)
print('strikes', hits, 'max swing', round(max(map(abs, vals)), 1))

# ---- hands: minute hand runs a full lap before the alarm; hour hand only jolts at HIT
minute = D.layer('Minute hand', grp(P, [9], 'minute'), CENTER, parent=clock,
                 r=anim([(0, 0, 'lin'), (6, 0, 'io'), (HIT - 2, 372, 'soft'), (HIT + 6, 360, 'lin'), (OP, 360, 'lin')]))
D.layer('Hour hand', grp(P, [8], 'hour'), CENTER, parent=clock,
        r=anim([(0, 0, 'lin'), (HIT - 4, 0, 'out'), (HIT - 1, 4, 'soft'), (HIT + 6, 0, 'lin'), (OP, 0, 'lin')]))
# the bell is drawn as an unfilled line but sits IN FRONT of the dial: hide the hand inside its silhouette
bell_sil = silhouette(P, [12, 13], (W, H))
m = matte_layer(D, 'Bell occlusion matte', bell_sil, [920, 1010], parent=bell)
set_matte(D, m, minute, inverted=True)

# ---- top button: pressed down to stop the alarm (squash on contact, springs back)
D.layer('Top button', grp(P, [0, 1, 6, 10], 'button'), BTN, parent=clock,
        p=anim([(0, pos(BTN), 'lin'), (PRESS - 6, pos(BTN), 'io'), (PRESS - 3, pos(BTN, 0, -8), 'in'),
                (PRESS, pos(BTN, 0, 26), 'out'), (PRESS + 8, pos(BTN, 0, 26), 'io'),
                (PRESS + 14, pos(BTN, 0, -6), 'soft'), (PRESS + 20, pos(BTN), 'lin'), (OP, pos(BTN), 'lin')]),
        s=anim([(0, S100, 'lin'), (PRESS - 1, S100, 'out'), (PRESS + 2, [112, 82, 100], 'soft'),
                (PRESS + 8, [104, 94, 100], 'io'), (PRESS + 14, [96, 106, 100], 'soft'), (PRESS + 20, S100, 'lin'), (OP, S100, 'lin')]))

# ---- sound lines: one burst per bell strike, stop at the press
sk, ok = [(0, 70, 'lin')], [(0, 0, 'lin')]
for n, f in enumerate([h for h in hits if HIT < h < PRESS + 4]):
    sk += [(f - 1, 75, 'out'), (f + 4, 112 - n * 3, 'soft'), (f + 7, 90, 'lin')]
    ok += [(f - 1, 0, 'out'), (f + 2, 100, 'lin'), (f + 5, 100, 'in'), (f + 7, 0, 'lin')]
sk.append((OP, 70, 'lin')); ok.append((OP, 0, 'lin'))
lines = D.layer('Sound lines', grp(P, [19, 20, 21], 'line'), [1220, 820],
                s=anim([(t, [v, v, 100], e) for t, v, e in sk]), o=anim(ok))
L = D.get(lines); D.layers.remove(L); D.layers.insert(0, L)   # sound lines on top
D.save('alarm_loop.json')
