import sys, math; sys.path.insert(0, __import__('os').path.join(__import__('os').path.dirname(__import__('os').path.abspath(__file__)), '..', 'scripts'))
from lot import *
SRC = 'ghost.svg'   # copy from assets/approved/
P = load_paths(SRC); W, H = svg_size(SRC); OP = 120
D = Doc('Ghost and moon loop', OP, w=W, h=H)

TOP, BOT = 386, 1402
BX, AY, LAG = 30.0, 27.0, 1.15       # drift (x over the loop, y twice per loop), cloth lag top -> hem (rad)
HEM_R, HEM_L, HEM_P = 12.0, 260.0, 30  # hem ripple: amplitude, wavelength (px), period (f)
w1 = 2 * math.pi / OP

def smooth(u):
    u = min(1.0, max(0.0, u)); return u * u * (3 - 2 * u)

def drift(t, h):
    """Float offset of a point at relative height h (0 top .. 1 hem): lower parts trail behind."""
    ph = LAG * h          # minus the frame-0 value: frame 0 is exactly the drawing
    return (BX * (math.sin(w1 * t - ph) - math.sin(-ph)),
            -AY * (math.sin(2 * w1 * t - ph * 1.4) - math.sin(-ph * 1.4)))

def warp(t, x, y):
    h = min(1.0, max(0.0, (y - TOP) / (BOT - TOP)))
    dx, dy = drift(t, h)
    k = smooth((h - 0.72) / 0.28)                       # the hem ripples, the head stays clean
    a = 2 * math.pi * x / HEM_L; b = 2 * math.pi * t / HEM_P
    dy += k * HEM_R * (math.sin(a - b) - math.sin(a))
    dx += k * 4.0 * (math.cos(a - b) - math.cos(a))
    return x + dx, y + dy

D.layer('Ghost', [deform_group('ghost', P[0], warp, OP, step=3, simplify=1.8)], [0, 0])

# eyes ride on the head (same drift as the body at their height); they glance up at the moon and blink
GL0, GL1 = 62, 96                      # glance toward the moon and back
BL = [44, 84]                          # blinks
for idx in (3, 2):
    c = centre(P[idx]); h = (c[1] - TOP) / (BOT - TOP)
    pk, sk = [], []
    for t in range(OP + 1):
        dx, dy = drift(t, h)
        g = smooth((t - GL0) / 8) - smooth((t - GL1) / 8)
        dx += -9 * g; dy += -7 * g
        pk.append((t, pos(c, dx, dy), 'lin'))
        sy = 100.0
        for b in BL:
            if b <= t <= b + 7:
                sy = 100 - 90 * math.sin(math.pi * (t - b) / 7) ** 1.5
        sk.append((t, [100, round(sy, 2), 100], 'lin'))
    D.layer(f'Eye {idx}', grp(P, [idx], 'eye'), c, p=anim(pk[::2] + [pk[-1]] * (OP % 2)), s=anim(sk))

# moon: a slow rock on its own; stars twinkle one after another (grow + small twist and back)
mc = centre(P[1])
D.layer('Moon', grp(P, [1], 'moon'), mc,
        r=anim([(t, round(4.5 * math.sin(w1 * t + 0.6) - 4.5 * math.sin(0.6), 3), 'lin') for t in range(0, OP + 1, 2)]))
for idx, times in ((6, (14, 74)), (4, (34, 98)), (5, (54,)), (7, (22, 86))):
    c = centre(P[idx]); sk, rk = [], []
    for t in range(OP + 1):
        v, r = 100.0, 0.0
        for t0 in times:
            if t0 <= t <= t0 + 14:
                u = (t - t0) / 14; e = math.sin(math.pi * u) ** 2
                v += 36 * e; r += 22 * e
        sk.append((t, [round(v, 2), round(v, 2), 100], 'lin')); rk.append((t, round(r, 2), 'lin'))
    D.layer(f'Star {idx}', grp(P, [idx], 'star'), c, s=anim(sk[::2]), r=anim(rk[::2]))
D.save('ghost_loop.json')
