import sys, math; sys.path.insert(0, __import__('os').path.join(__import__('os').path.dirname(__import__('os').path.abspath(__file__)), '..', 'scripts'))
from lot import *
import numpy as np, cv2
SRC = 'gps.svg'   # copy from assets/approved/
P = load_paths(SRC); W, H = svg_size(SRC); OP = 120; K = 2
D = Doc('GPS route loop', OP, w=W, h=H)

def smooth(u):
    u = min(1.0, max(0.0, u)); return u * u * (3 - 2 * u)
def spring(t, t0, amp, per=12.0, decay=0.12, end=26, sin=False):
    if t < t0: return 0.0
    u = t - t0; w = 2 * math.pi / per
    v = amp * math.exp(-decay * u) * (math.sin(w * u) if sin else math.cos(w * u))
    return v * smooth((t0 + end - t) / 8)

# ---- split the pin (drawn in front of the phone) from the hand + phone + map
m = ink_mask((W, H), P[0][0], K)
cs, hier = cv2.findContours(m.astype(np.uint8), cv2.RETR_CCOMP, cv2.CHAIN_APPROX_NONE)
hole = np.zeros(m.shape, np.uint8); cv2.drawContours(hole, [cs[2]], -1, 1, -1)
YY = np.arange(m.shape[0])[:, None] / K
ps_thin = cv2.dilate(hole, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (2 * 31 * K + 1, 2 * 31 * K + 1))) > 0
ps_thick = cv2.dilate(hole, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (2 * 44 * K + 1, 2 * 44 * K + 1))) > 0
pin_sil = ps_thin | (ps_thick & (YY < 380))     # the pin's crown is drawn thicker; at its sides the phone lines touch it
pin = m & pin_sil
body = m & ~pin_sil
# the phone's top-right corner hides behind the pin: rebuild it (only seen when the pin hops)
corner = np.zeros(m.shape, np.uint8)
cv2.polylines(corner, [np.array([[790 * K, 411 * K], [1164 * K, 426 * K], [1164 * K, 660 * K]], np.int32)], False, 1, 33 * K)   # measured: top edge y~410, right edge x~1164, chalk ~33 px
body = body | ((corner > 0) & pin_sil)

# the hand (holding the phone from the left) is drawn in front of it: split it off by its closed outline
cl = cv2.morphologyEx(m.astype(np.uint8), cv2.MORPH_CLOSE, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (61, 61)))
cs2, h2 = cv2.findContours(cl, cv2.RETR_CCOMP, cv2.CHAIN_APPROX_NONE)
palm = max([c for i, c in enumerate(cs2) if h2[0][i][3] >= 0], key=cv2.contourArea)
hand_sil = np.zeros(m.shape, np.uint8); cv2.drawContours(hand_sil, [palm], -1, 1, -1)
hs_in = cv2.dilate(hand_sil, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (2 * 26 * K + 1, 2 * 26 * K + 1))) > 0
hs_out = cv2.dilate(hand_sil, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (2 * 50 * K + 1, 2 * 50 * K + 1))) > 0
XX = np.arange(m.shape[1])[None, :] / K
hand_sil = hs_in | (hs_out & (XX < 600))          # the outer (left/bottom) edge of the hand is drawn thick and doubled
hand = body & hand_sil
body = body & ~hand_sil
PHONE_PIV = [560, 1300]
TIPF = [874, 922]        # fingertip on the screen
TIP = [1037, 688]
ERASE, DRAW, ARRIVE = 2, 20, 50
TAP = 13                 # the finger taps the screen -> the route is built -> the pin fires
DASHES = [[4, 5, 6, 7, 8, 9, 10], [11], [12], [13], [14], [15]]   # start dot, then the dashes up to the pin

# ---- hand + phone: a gentle hand-held bob; nudges up when the pin lands
pr = [(t, round(0.8 * math.sin(2 * math.pi * t / OP) + spring(t, ARRIVE + 4, -0.8, per=12, decay=0.15, end=20, sin=True) + spring(t, TAP, 0.9, per=10, decay=0.2, end=16, sin=True) * smooth((t - TAP) / 2), 3), 'lin') for t in range(OP + 1)]
phone = D.layer('Phone + map', [mask_group('phone map', mask_to_paths(body, K, tol=0.7))] + grp(P, [2, 3], 'road'), PHONE_PIV, r=anim(pr))

# ---- the hand: slides the finger onto the screen and presses (only ever toward the screen: nothing behind
# the hand is uncovered), then lets go
hp = []
for t in range(OP + 1):
    d = 22 * smooth((t - TAP + 4) / 4) * (1 - smooth((t - TAP - 3) / 7))
    hp.append((t, pos([0, 0], round(d, 2), round(d * 0.12, 2)), 'lin'))
hs = [(t, [round(100 - 1.5 * math.sin(math.pi * min(1, max(0, (t - TAP + 1) / 6))), 3), 100, 100], 'lin') for t in range(OP + 1)]
handL = D.layer('Hand', [mask_group('hand', mask_to_paths(hand, K, tol=0.7))], [0, 0], parent=phone, p=anim(hp))
LH = D.get(handL); D.layers.remove(LH); D.layers.insert(0, LH)          # the hand is in front of everything

# ---- tap ripple on the screen around the fingertip (behind the finger)
r0 = 26.0
def ring_path(r):
    k = 0.5523 * r
    return {"c": True, "v": [[0, -r], [r, 0], [0, r], [-r, 0]], "i": [[-k, 0], [0, -k], [k, 0], [0, k]], "o": [[k, 0], [0, k], [-k, 0], [0, -k]]}
RK = []
for t in range(OP + 1):
    r = 18 if t < TAP else 18 + 80 * (1 - (1 - min(1, (t - TAP) / 14)) ** 2)
    RK.append({"t": t, "s": [ring_path(r)], "o": {"x": [0], "y": [0]}, "i": {"x": [1], "y": [1]}})
RK[-1] = {"t": OP, "s": [ring_path(18)]}
rip = {"ty": "gr", "nm": "ripple", "it": [{"ty": "sh", "ks": {"a": 1, "k": RK}},
       {"ty": "st", "c": {"a": 0, "k": [0, 0, 0, 1]}, "o": {"a": 0, "k": 100}, "w": {"a": 0, "k": 11}, "lc": 2, "lj": 2},
       {"ty": "tr", "p": {"a": 0, "k": TIPF}, "a": {"a": 0, "k": [0, 0]}, "s": {"a": 0, "k": [100, 100]}, "r": {"a": 0, "k": 0}, "o": {"a": 0, "k": 100}}]}
rs = [(t, [100, 100, 100], 'lin') for t in (0, OP)]
ro = [(t, round(v, 2), 'lin') for t, v in ((t, 0 if t < TAP else 100 * (1 - smooth((t - TAP - 4) / 10))) for t in range(OP + 1))]
ripL = D.layer('Tap ripple', [rip], TIPF, parent=phone, s=anim(rs), o=anim(ro))

# ---- route: erased from the start, then drawn dash by dash toward the destination
for k, idxs in enumerate(DASHES):
    c = centre(P[idxs[0]]) if k else [744, 1090]
    t_out = ERASE + k; t_in = DRAW + 5 * k
    sk = []
    for t in range(OP + 1):
        if t < t_in:
            v = 100 * (1 - smooth((t - t_out) / 3))
        else:
            v = 100 * smooth((t - t_in) / 3) + spring(t, t_in + 3, 25, per=8, decay=0.25, end=12, sin=True)
        wave = 12 * math.sin(math.pi * min(1, max(0, (t - (84 + 3 * k)) / 8))) ** 2          # a "you are here" pulse runs along it later
        sk.append((t, [round(max(0, v) + wave, 2)] * 2 + [100], 'lin'))
    D.layer(f'Route {k}', grp(P, idxs, 'dash'), c, parent=phone, s=anim(sk))

# ---- the pin: crouches as the route arrives, hops, lands on its tip with a squash; its ring pings
yk, sk, rk = [], [], []
for t in range(OP + 1):
    if ARRIVE - 4 <= t <= ARRIVE + 10:
        u = (t - (ARRIVE - 4)) / 14; y = -60 * 4 * u * (1 - u)
    else:
        y = 0.0
    x = -6 * smooth((t - ARRIVE + 10) / 6) * (1 - smooth((t - ARRIVE + 4) / 2)) if t < ARRIVE + 10 else spring(t, ARRIVE + 10, -7.0, per=11, decay=0.16, end=24)
    if ARRIVE - 4 <= t < ARRIVE + 10:
        x = 5 * math.sin(math.pi * (t - ARRIVE + 4) / 14)
    yk.append((t, pos(TIP, 0, round(y, 2)), 'lin'))
    sk.append((t, [round(100 - 0.6 * x, 3), round(100 + x, 3), 100], 'lin'))
    rk.append((t, round(spring(t, ARRIVE + 10, 3.0, per=14, decay=0.14, end=26, sin=True) * smooth((t - ARRIVE - 10) / 3), 3), 'lin'))
pinL = D.layer('Pin', [mask_group('pin', mask_to_paths(pin, K, tol=0.7))], TIP, p=anim(yk), s=anim(sk), r=anim(rk), parent=phone)
ring = [(t, [round(100 + v, 2)] * 2 + [100], 'lin') for t, v in
        ((t, 14 * math.sin(math.pi * min(1, max(0, (t - ARRIVE - 11) / 9))) ** 2) for t in range(OP + 1))]
D.layer('Pin ring', grp(P, [1], 'ring'), centre(P[1]), parent=pinL, s=anim(ring))
# the pin hides the phone behind it (outline art): matte the phone by the pin's silhouette
sil = mask_to_paths(pin_sil, K, tol=1.0); sil = max(sil, key=lambda p: len(p['v']))
mt = matte_layer(D, 'Pin occlusion matte', sil, TIP, parent=pinL)
set_matte(D, mt, phone, inverted=True)
hsil = mask_to_paths(hand_sil, K, tol=1.0); hsil = max(hsil, key=lambda p: len(p['v']))
mt2 = matte_layer(D, 'Hand occlusion matte (ripple)', hsil, [0, 0], parent=handL)
set_matte(D, mt2, ripL, inverted=True)
D.save('gps_loop.json')
