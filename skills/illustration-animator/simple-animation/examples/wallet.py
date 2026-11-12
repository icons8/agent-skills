import sys, math; sys.path.insert(0, __import__('os').path.join(__import__('os').path.dirname(__import__('os').path.abspath(__file__)), '..', 'scripts'))
from lot import *
import numpy as np
SRC = 'wallet.svg'
P = load_paths(SRC); W, H = svg_size(SRC); OP = 120; K = 2
D = Doc('Savings wallet loop', OP, w=W, h=H)
S = np.load('split.npz')

def ss(u):
    u = min(1.0, max(0.0, u)); return u * u * u * (u * (6 * u - 15) + 10)
bump = lambda t, c, w: loop_bump(t, c, w, OP)
sim = lambda f, per, zeta: spring_sim(f, OP, per, zeta)
TT = range(OP + 1)

# ---- story: savings! The cash springs up out of the wallet all at once, elastic, tilting as it comes and
# settling a beat after its rise (rotation lags the position); the wallet gives a proud bounce and its clasp
# button pops. The notes rustle a little, then slip back down inside and it all springs out again.
OUT, FULL, SINK0, SINK1 = 10, 18, 92, 104
SINK = 500
DIR = (0.46, 1.0)                                   # in and out along the tilt of the notes (through the opening)
inside = lambda t: 1 - ss((t - OUT) / 3) + ss((t - SINK0) / (SINK1 - SINK0)) ** 1.6 if t >= SINK0 else 1 - ss((t - OUT) / 3)
DEPTH = sim(lambda t: SINK * inside(t), 12, 0.72)    # elastic: a modest overshoot above rest (the cash runs on under the wallet)
# the tilt only belongs to the fly-out: the cash comes out turned, the turn lags the rise, then eases back to the
# drawn angle and stays there; it never rustles. It is reset to the start angle only while the cash is hidden.
tilt_drive = lambda t: -10 * (1 - ss((t - OUT - 3) / 4)) if t < SINK1 else -10 * ss((t - SINK1 - 4) / 3)
TILT = sim(tilt_drive, 16, 0.55)
WB = [760, 1320]
BOUNCE = sim(lambda t: -4 * bump(t, OUT + 1, 2.5) + 3.5 * bump(t, FULL, 3) - 2.5 * bump(t, SINK1, 2.5), 10, 0.33)
wallet = D.layer('Wallet', [mask_group('wallet', mask_to_paths(S['wallet'], K, tol=0.8))], WB,
                 s=anim([(t, [round(100 - 0.6 * BOUNCE[t] + 0.6 * math.sin(2 * math.pi * t / 60), 3), round(100 + BOUNCE[t] - 0.6 * math.sin(2 * math.pi * t / 60), 3), 100], "lin") for t in TT]))   # + a slow breath of the stuffed wallet
BP = sim(lambda t: 30 * bump(t, FULL + 2, 2.5) + 12 * bump(t, SINK1 + 2, 2.5), 9, 0.3)
D.layer('Clasp button', grp(P, [1], 'button'), centre(P[1]), parent=wallet,
        s=anim([(t, [round(100 + BP[t], 2)] * 2 + [100], 'lin') for t in TT]))
CP = [720, 590]                                     # turns about the middle of the wallet's opening
cash = D.layer('Cash', [mask_group('cash', mask_to_paths(S['cash'], K, tol=0.8))], CP, parent=wallet,
               p=anim([(t, pos(CP, round(DIR[0] * DEPTH[t], 2), round(DIR[1] * DEPTH[t], 2)), 'lin') for t in TT]),
               r=anim([(t, round(TILT[t], 3), 'lin') for t in TT]))
# the cash is behind the wallet's front: hide whatever of it is below the wallet's top edge
CUT = [(float(x), float(y) + 1) for x, y in S['cut']]          # the same edge line the art was split on
front = {"c": True, "v": [[x, y] for x, y in CUT] + [[1500, 1500], [150, 1500]], "i": [[0, 0]] * (len(CUT) + 2), "o": [[0, 0]] * (len(CUT) + 2)}
mt = matte_layer(D, 'Wallet front matte', front, WB, parent=wallet)
set_matte(D, mt, cash, inverted=True)
D.save('wallet_loop.json')
