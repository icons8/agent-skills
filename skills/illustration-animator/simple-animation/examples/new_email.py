import sys, math; sys.path.insert(0, __import__('os').path.join(__import__('os').path.dirname(__import__('os').path.abspath(__file__)), '..', 'scripts'))
from lot import *
import numpy as np
SRC = 'mail.svg'
P = load_paths(SRC); W, H = svg_size(SRC); OP = 120; K = 2
D = Doc('New email loop', OP, w=W, h=H)
S = np.load('split.npz')

def ss(u):
    u = min(1.0, max(0.0, u)); return u * u * u * (u * (6 * u - 15) + 10)
bump = lambda t, c, w: loop_bump(t, c, w, OP)
sim = lambda f, per, zeta: spring_sim(f, OP, per, zeta)
TT = range(OP + 1)

# ---- story: a new email arrives — the envelope gives a little jump and wiggle, the "+1" badge pops out of its
# corner, the "+1" inside bounces a beat later and the alert marks flash. It stays a moment, then the badge
# shrinks away (read) and the next one comes.
ARRIVE, POP, AWAY = 8, 20, 96
EB = [620, 1000]                                  # envelope pivots at its bottom
EY = sim(lambda t: -22 * bump(t, ARRIVE + 3, 3) + 6 * bump(t, ARRIVE - 1, 2), 11, 0.4)
ER = sim(lambda t: 4 * bump(t, ARRIVE + 3, 2.5) - 3 * bump(t, ARRIVE + 8, 2.5) + 0.7 * math.sin(2 * math.pi * t / 60), 10, 0.35)
env = D.layer('Envelope', [mask_group('envelope', mask_to_paths(S['env'], K, tol=0.8))], EB,
              p=anim([(t, pos(EB, 0, round(EY[t], 2)), 'lin') for t in TT]),
              r=anim([(t, round(ER[t], 3), 'lin') for t in TT]))

# the badge: pops from nothing with an overshoot, holds with a slow breath, shrinks away
BC = [1149, 848]
shown = lambda t: ss((t - POP) / 3) * (1 - ss((t - AWAY) / 8))
BS = [max(0.0, v) for v in sim(shown, 9, 0.38)]
badge = D.layer('Badge', [mask_group('badge ring', mask_to_paths(S['ring'], K, tol=0.8))], BC, parent=env,
                s=anim([(t, [round(100 * BS[t] * (1 + 0.012 * math.sin(2 * math.pi * t / 40)), 2)] * 2 + [100], 'lin') for t in TT]))
# "+1": rides in the badge and bounces a beat later
PL = sim(lambda t: 18 * bump(t, POP + 6, 2.5), 9, 0.3)
D.layer('Plus one', grp(P, [1, 2], 'plus one'), [1135, 880], parent=badge,
        s=anim([(t, [round(100 + PL[t], 2)] * 2 + [100], 'lin') for t in TT]))
# the envelope's corner runs on under the badge: hide it inside the badge's disc
disc = mask_to_paths(S['disc'], K, tol=1.0); disc = max(disc, key=lambda p: len(p['v']))
mt = matte_layer(D, 'Badge disc matte', disc, BC, parent=badge)

# alert marks: burst out from the badge as it pops, then fade with it
MC = [1330, 640]
F = sim(lambda t: bump(t, POP + 4, 2.5), 9, 0.32)
D.layer('Alert marks', grp(P, [3, 4], 'marks'), MC, parent=env,
        s=anim([(t, [round(100 * BS[t] + 35 * F[t], 2)] * 2 + [100], 'lin') for t in TT]))
set_matte(D, mt, env, inverted=True)            # last: a later child of env would land between matte and target
D.save('mail_loop.json')
