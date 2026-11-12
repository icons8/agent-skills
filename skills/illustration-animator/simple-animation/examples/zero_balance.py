import sys, math; sys.path.insert(0, __import__('os').path.join(__import__('os').path.dirname(__import__('os').path.abspath(__file__)), '..', 'scripts'))
from lot import *
SRC = 'zero_balance.svg'   # copy from assets/approved/
P = load_paths(SRC); W, H = svg_size(SRC); OP = 96
D = Doc('Zero balance loop', OP, w=W, h=H)

SCREEN = [1000, 550]; CARD_BL = [300, 1075]; EXCL_BASE = [452, 1110]; DOT = [522, 1198]
ROLL0, LAND = 4, [26, 31, 36]      # digits start rolling / land on "0" (left to right)
SHAKE = 39                          # balance shown -> the screen shakes "no"
POP = 42                            # exclamation reacts
BLINK = 78                          # alert blink keeps the end alive

def smooth(u):
    u = min(1.0, max(0.0, u)); return u * u * (3 - 2 * u)
def spring(t, t0, amp, per=12.0, decay=0.1, end=34, sin=False):
    if t < t0: return 0.0
    u = t - t0; w = 2 * math.pi / per
    v = amp * math.exp(-decay * u) * (math.sin(w * u) if sin else math.cos(w * u))
    return v * smooth((t0 + end - t) / 8)

# ---- action lines at the screen corner: flick outward when the balance shows
for idx, base in ((20, [1255, 330]), (21, [1288, 388])):
    sk = [(t, [s, s, 100], 'lin') for t, s in ((t, 100 + 24 * smooth((t - SHAKE) / 4) - 24 * smooth((t - SHAKE - 6) / 10)) for t in range(OP + 1))]
    D.layer(f'Action line {idx}', grp(P, [idx], 'line'), base, s=anim(sk[::1]))

# ---- exclamation: anticipation squash, springy stretch + wobble from its foot; the dot hops after it
ex_s, ex_r = [], []
for t in range(OP + 1):
    x = -9 * smooth((t - (POP - 6)) / 6) if t < POP else spring(t, POP, -9.0)
    ex_s.append((t, [round(100 - 0.6 * x, 3), round(100 + x * 1.6, 3), 100], 'lin'))
    ex_r.append((t, round(spring(t, POP, 6.0, per=14, decay=0.09, sin=True) * smooth((t - POP) / 5), 3), 'lin'))
TH = math.degrees(math.atan2(221, 391))        # the bar leans ~29 deg left; stretch along its own axis
bar = {"ty": "gr", "nm": "bar upright", "it": grp(P, [18, 19], 'bar') + [
    {"ty": "tr", "p": {"a": 0, "k": EXCL_BASE}, "a": {"a": 0, "k": EXCL_BASE}, "s": {"a": 0, "k": [100, 100]},
     "r": {"a": 0, "k": TH}, "o": {"a": 0, "k": 100}}]}
D.layer('Exclamation bar', [bar], EXCL_BASE, s=anim(ex_s), r=anim([(t, round(v - TH, 3), e) for t, v, e in ex_r]))
dp, ds = [], []
H0, T0, T1 = 34, POP + 3, POP + 13
for t in range(OP + 1):
    if T0 <= t <= T1:
        u = (t - T0) / (T1 - T0); y = -H0 * 4 * u * (1 - u)
    else:
        y = 0.0
    sq = spring(t, T1, -9.0, per=10, decay=0.15, end=22) if t >= T1 else (-6 * smooth((t - T0 + 3) / 3) * (1 - smooth((t - T0) / 2)) if t < T0 + 2 else 0)
    dp.append((t, pos(DOT, 0, y), 'lin')); ds.append((t, [round(100 - 0.8 * sq, 3), round(100 + sq, 3), 100], 'lin'))
D.layer('Exclamation dot', grp(P, [16, 17], 'dot'), [DOT[0], DOT[1] + 40], p=anim([(t, pos([v[0], v[1] + 40]), e) for t, v, e in dp]), s=anim(ds))

# ---- screen: a damped "no-no" shake once the balance lands on 0.00
sx = [(t, pos(SCREEN, round(spring(t, SHAKE, 20.0, per=9, decay=0.12, end=30, sin=True) * smooth((t - SHAKE) / 3), 2), 0), 'lin') for t in range(OP + 1)]
sr = [(t, round(spring(t, SHAKE + 1, 2.2, per=9, decay=0.12, end=30, sin=True) * smooth((t - SHAKE - 1) / 3), 3), 'lin') for t in range(OP + 1)]
screen = D.layer('Balance screen', grp(P, [0, 1], 'screen'), SCREEN, p=anim(sx), r=anim(sr))
# decimal point: shrinks away when the digits start rolling, pops back once all of them have landed
PT = centre(P[5]); PT_IN = LAND[-1] + 1
pt_s = []
for t in range(OP + 1):
    if t < ROLL0 + 4:
        v = 100 * (1 - smooth((t - ROLL0) / 4))
    elif t < PT_IN:
        v = 0.0
    else:
        v = 100 * smooth((t - PT_IN) / 4) + spring(t, PT_IN + 4, 22.0, per=8, decay=0.2, end=14, sin=True) * smooth((t - PT_IN - 4) / 2)
    pt_s.append((t, [round(max(v, 0), 2), round(max(v, 0), 2), 100], 'lin'))
D.layer('Decimal point', grp(P, [5, 6], 'point'), PT, parent=screen, s=anim(pt_s))

# digits roll like a counter (clipped to the screen's inside), land left to right with a soft overshoot,
# and blink twice near the end as an alert
clip = silhouette(P, [0, 1], (W, H), shrink=30)
RD, NREV = 640, 3                    # tape length per revolution (> digit + clip height), revolutions
def tape(t, s0, land):
    """Distance rolled: slow start, fast middle, a slow soft arrival on the final 0 (zero velocity)."""
    u = min(1.0, max(0.0, (t - s0) / (land - s0)))
    e = u * u * u * (u * (u * 6 - 15) + 10)          # smootherstep
    return NREV * RD * e
for k, idx in enumerate((2, 3, 4)):
    s0, land = ROLL0 + 2 * k, LAND[k]
    def strip(offset, nm):
        vals = []
        for t in range(OP + 1):
            v = -((tape(t, s0, land) + offset) % RD)
            if v < -RD / 2: v += RD
            vals.append(round(v, 2))
        ks = []
        for t in range(OP + 1):
            ks.append({"t": t, "s": [0, vals[t]], "o": {"x": [0], "y": [0]}, "i": {"x": [1], "y": [1]}})
            if t < OP and abs(vals[t + 1] - vals[t]) > RD / 2:      # wrap: jump while hidden, never sweep across
                ks[-1] = {"t": t, "s": [0, vals[t]], "h": 1}
        ks[-1] = {"t": OP, "s": [0, vals[OP]]}
        return {"ty": "gr", "nm": nm, "it": grp(P, [idx], 'd') + [
            {"ty": "tr", "p": {"a": 1, "k": ks}, "a": {"a": 0, "k": [0, 0]}, "s": {"a": 0, "k": [100, 100]},
             "r": {"a": 0, "k": 0}, "o": {"a": 0, "k": 100}}]}
    # two copies half a revolution apart, so the window always has a digit passing through it
    g = {"ty": "gr", "nm": f'digit {idx} tape', "it": [strip(0, 'a'), strip(RD / 2, 'b'),
         {"ty": "tr", "p": {"a": 0, "k": [0, 0]}, "a": {"a": 0, "k": [0, 0]}, "s": {"a": 0, "k": [100, 100]},
          "r": {"a": 0, "k": 0}, "o": {"a": 0, "k": 100}}]}
    ok = [(0, 100, 'lin'), (BLINK + 2 * k, 100, 'lin'), (BLINK + 2 * k + 1, 0, 'lin'), (BLINK + 2 * k + 4, 0, 'lin'),
          (BLINK + 2 * k + 5, 100, 'lin'), (BLINK + 2 * k + 7, 100, 'lin'), (BLINK + 2 * k + 8, 0, 'lin'),
          (BLINK + 2 * k + 10, 0, 'lin'), (BLINK + 2 * k + 11, 100, 'lin'), (OP, 100, 'lin')]
    L = D.layer(f'Digit {idx}', [g], SCREEN, parent=screen, o=anim(ok))
    LL = D.get(L); LL['hasMask'] = True
    LL['masksProperties'] = [{"mode": "a", "inv": False, "nm": "screen inside", "pt": {"a": 0, "k": clip},
                              "o": {"a": 0, "k": 100}, "x": {"a": 0, "k": 0}}]

# ---- card: stays put, gives a small sympathetic tilt; its hidden corner under the screen is rebuilt
corner = stroke_group('hidden corner', [(760, 531), (950, 534), (1110, 538), (1134, 552), (1141, 600), (1142, 740)], 22)
card_r = [(t, round(spring(t, POP + 2, -1.3, per=16, decay=0.08, end=36, sin=True) * smooth((t - POP - 2) / 6), 3), 'lin') for t in range(OP + 1)]
card = D.layer('Card', grp(P, [7, 8, 9, 10, 11, 12, 13, 14, 15], 'card') + [corner], CARD_BL, r=anim(card_r))
m = matte_layer(D, 'Screen occlusion matte', silhouette(P, [0, 1], (W, H)), SCREEN, parent=screen)
set_matte(D, m, card, inverted=True)
D.save('zero_balance_loop.json')
