import sys, math; sys.path.insert(0, __import__('os').path.join(__import__('os').path.dirname(__import__('os').path.abspath(__file__)), '..', 'scripts'))
from lot import *
SRC = 'party.svg'   # technique demo (coil unwind), not an approved reference
P = load_paths(SRC); W, H = svg_size(SRC); OP = 90
D = Doc('Party blower loop', OP, w=W, h=H)

C, R = (850, 795), 240          # coil centre / outer radius
AXIS = (0.83, -0.56)             # tube direction, mouthpiece -> coil (unit)
MOUTH = (330, 1240)
WIND, BLOW = 8, 20               # wind-up starts, blow

def smooth(u):
    u = min(1.0, max(0.0, u)); return u * u * (3 - 2 * u)
def spring(t, t0, amp, per=14.0, decay=0.08, end=40, sin=False):
    if t < t0: return 0.0
    u = t - t0; w = 2 * math.pi / per
    v = amp * math.exp(-decay * u) * (math.sin(w * u) if sin else math.cos(w * u))
    return v * smooth((t0 + end - t) / 10)
def windup(t, amp):           # slow ease into the wind-up pose, zero velocity at BLOW
    return amp * smooth((t - WIND) / (BLOW - WIND)) if t < BLOW else 0.0

# coil: inner turns unwind (rotate more the deeper inside), the coil loosens; outer ring/tube stay attached
def coil_angle(t):
    return windup(t, -10.0) if t < BLOW else spring(t, BLOW, -10.0) + 65.0 * spring(t, BLOW, 1.0, per=28, decay=0.06, sin=True)
def coil_loose(t):
    return 0.13 * spring(t, BLOW, 1.0, per=28, decay=0.06, sin=True)
def push(t):                    # whole blower: pulls back on the wind-up, thrusts forward on the blow
    return windup(t, -12.0) if t < BLOW else spring(t, BLOW, -12.0) + 22.0 * spring(t, BLOW, 1.0, per=18, decay=0.09, sin=True)

def warp(t, x, y):
    dx, dy = x - C[0], y - C[1]; r = math.hypot(dx, dy)
    w = max(0.0, 1 - r / R) ** 1.3
    a = math.radians(coil_angle(t) * w); k = 1 + coil_loose(t) * w
    X = C[0] + k * (dx * math.cos(a) - dy * math.sin(a)); Y = C[1] + k * (dx * math.sin(a) + dy * math.cos(a))
    s = push(t)
    return X + AXIS[0] * s, Y + AXIS[1] * s

frames = [t for t in range(0, OP + 1, 2) if WIND - 2 <= t <= BLOW + 44]
D.layer('Party blower', [deform_group('blower', P[0], warp, OP, frames=frames, simplify=1.4)], [0, 0])

# confetti: a gust from the blow pushes each piece outward from the coil (with a spin), it floats back;
# between gusts every piece keeps a gentle float so the loop never freezes
MARGIN = 40
for n, idx in enumerate([4, 3, 2, 5, 7, 6, 1]):
    c = centre(P[idx]); dx, dy = c[0] - C[0], c[1] - C[1]; d = math.hypot(dx, dy); ux, uy = dx / d, dy / d
    x0, x1, y0, y1 = bbox(P[idx])
    dist = 115 * (1 - min(0.5, d / 1600))
    room = min([((x0 - MARGIN) / -ux) if ux < 0 else ((W - MARGIN - x1) / ux) if ux > 0 else 1e9,
                ((y0 - MARGIN) / -uy) if uy < 0 else ((H - MARGIN - y1) / uy) if uy > 0 else 1e9])
    dist = min(dist, room)
    hit = BLOW + 2 + int(d / 120)            # farther pieces feel the gust later
    spin = (1 if n % 2 else -1) * (40 if idx in (5, 6, 7) else 22)
    per = 45 if n % 2 else 30; ph = n * 1.3; amp = 5 + n % 3
    pk, rk = [], []
    for t in range(0, OP + 1):
        g = 0.0 if t < hit else (1 - math.exp(-(t - hit) / 3.0)) * math.exp(-max(0, t - hit - 4) / 14.0)
        g *= smooth((hit + 50 - t) / 12)
        fx = amp * 0.4 * math.sin(2 * math.pi * t / per + ph) - amp * 0.4 * math.sin(ph)
        fy = amp * math.sin(2 * math.pi * t / per + ph * 0.7) - amp * math.sin(ph * 0.7)
        pk.append((t, pos(c, ux * dist * g + fx, uy * dist * g + fy), 'lin'))
        rk.append((t, round(spin * g + 4 * math.sin(2 * math.pi * t / per + ph) - 4 * math.sin(ph), 3), 'lin'))
    D.layer(f'Confetti {idx}', grp(P, [idx], 'confetti'), c, p=anim(pk[::2] + ([pk[-1]] if OP % 2 else [])),
            r=anim(rk[::2] + ([rk[-1]] if OP % 2 else [])))
D.save('party_loop.json')
