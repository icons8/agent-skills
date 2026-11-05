"""Example: microphone + player. Play pressed -> playhead runs, waveform bars follow a speech-like level,
mic head tilts with the loudness a few frames late, sound lines burst on peaks -> stop pressed ->
playhead rewinds -> restart after a short pause. Pole hidden inside the tilting head via a matte."""
import sys, os, math; sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'scripts'))
from lot import *
SRC = sys.argv[1] if len(sys.argv) > 1 else 'mic.svg'
P = load_paths(SRC); W, H = svg_size(SRC); OP = 120
D = Doc('Microphone playback loop', OP, w=W, h=H)
C = {i: centre(P[i]) for i in range(len(P))}

PLAY, STOP = 4, 96            # button pressed -> playback runs -> button pressed again -> silence
START, END = PLAY + 6, STOP - 2
MOUNT = [708, 868]             # mic head sits on the pole top
HEAD = [690, 420]              # sound radiates from the grille

def env(t):                    # loudness envelope: fades in after play, out before stop
    a = min(1, max(0, (t - START) / 8)); b = min(1, max(0, (END - t) / 8))
    return a * a * (3 - 2 * a) * b * b * (3 - 2 * b)
def level(t, ph):              # speech-like level: a few incommensurate sines
    v = 0.55 + 0.25 * math.sin(2 * math.pi * (t / 13 + ph)) + 0.2 * math.sin(2 * math.pi * (t / 7.3 + 2.1 * ph))
    return max(0, min(1, v)) * env(t)
loud = lambda t: level(t, 0.0)

def press(f):
    return [(f - 3, S100, 'io'), (f, [114, 82, 100], 'out'), (f + 4, [92, 108, 100], 'io'), (f + 9, S100, 'soft')]

# ---- sound lines burst from the grille on loud peaks (accents, timed to the level)
peaks = [t for t in range(START + 2, END - 4) if loud(t) > 0.62 and loud(t) >= loud(t - 1) and loud(t) >= loud(t + 1)]
beats = []
for t in peaks:
    if not beats or t - beats[-1] >= 12: beats.append(t)
for n, (name, idxs) in enumerate([('Sound line top', [36, 37]), ('Sound line right', [34]), ('Sound line low', [35])]):
    c = C[idxs[0]]; dx, dy = c[0] - HEAD[0], c[1] - HEAD[1]; L = math.hypot(dx, dy); ux, uy = dx / L, dy / L
    sk, pk = [(0, S100, 'lin')], [(0, pos(c), 'lin')]
    for b in beats:
        f = b + n                                              # tiny stagger between lines
        sk += [(f - 2, S100, 'out'), (f + 2, [118, 118, 100], 'io'), (f + 8, S100, 'soft')]
        pk += [(f - 2, pos(c), 'out'), (f + 2, pos(c, round(ux * 16, 1), round(uy * 16, 1)), 'io'), (f + 8, pos(c), 'soft')]
    D.layer(name, grp(P, idxs, 'line'), c, s=anim(sk + [(OP, S100, 'lin')]), p=anim(pk + [(OP, pos(c), 'lin')]))

# ---- mic head: rides the loudness a few frames late (overlapping action), rigid capsule
tilt = [(t, round(-2.2 * loud(t - 3) + 0.8 * math.sin(2 * math.pi * t / 18) * env(t - 3), 3), 'lin') for t in range(0, OP + 1, 2)]
tilt = [(t, v if t < STOP + 10 else 0, e) for t, v, e in tilt]
head = D.layer('Mic head', grp(P, [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13], 'mic'), MOUNT, r=anim(tilt))
sil = silhouette(P, [2, 7, 12, 13], (W, H), shrink=5)
m = matte_layer(D, 'Mic head silhouette (matte)', sil, MOUNT, parent=head)

# ---- waveform: bars follow the level, each with its own phase (centre line y ≈ 940)
bars = [[21, 22], [23], [24], [25, 26], [27, 28], [29, 30], [31], [32, 33]]
for n, idxs in enumerate(bars):
    x0, x1, y0, y1 = bbox(P[idxs[0]]); c = [round((x0 + x1) / 2, 1), 940]
    ph = 0.13 * n + 0.05 * (n % 3)
    k = [(t, [100, round(100 * (0.45 + 0.75 * level(t - n, ph)) if START <= t <= END + 4 else 100, 2), 100], 'lin')
         for t in range(0, OP + 1, 2)]
    # rest = drawn size; quietly settles back after the stop
    k = [(t, v if (START <= t <= END + 4) else S100, e) for t, v, e in k]
    D.layer(f'Wave bar {n+1}', grp(P, idxs, 'bar'), c, s=anim(k))

# ---- player: button pressed to play and to stop; playhead runs along the bar, rewinds in the hold
D.layer('Play button', grp(P, [19, 20], 'button'), C[19],
        s=anim([(0, S100, 'lin')] + press(PLAY) + press(STOP) + [(OP, S100, 'lin')]))
HEADX0 = C[17]
D.layer('Playhead', grp(P, [17, 18], 'playhead'), HEADX0,
        p=anim([(0, pos(HEADX0), 'lin'), (START, pos(HEADX0), 'lin'), (END, pos(HEADX0, 150, -2), 'soft'),
                (END + 4, pos(HEADX0, 150, -2), 'io'), (END + 18, pos(HEADX0), 'soft'), (OP, pos(HEADX0), 'lin')]))
D.layer('Player', grp(P, [14, 15, 16], 'player'), [380, 1080])
pole = D.layer('Stand', grp(P, [0, 1], 'stand'), [700, 1300])
set_matte(D, m, pole, inverted=True)
D.save('mic_loop.json')
print('beats', beats)
