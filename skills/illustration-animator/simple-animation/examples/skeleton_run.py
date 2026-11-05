"""Example: cut-out character rig from a drawing whose bones/limbs are separate shapes.
Torso is the root; skull, arms and pelvis are children; legs hang off the pelvis; each limb is a
chain upper -> lower -> hand/foot. Everything is driven by phased sines, so the loop is exact when
OP is a multiple of every period (here run cycle T=30, OP=90 -> 3 strides)."""
import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'scripts'))
from lot import *

SRC = sys.argv[1] if len(sys.argv) > 1 else 'skeleton.svg'
P = load_paths(SRC); W, H = svg_size(SRC); OP, T = 90, 30
D = Doc('Skeleton run loop', OP, w=W, h=H)

ROOT = [830, 820]
torso = D.layer('Torso', grp(P, [6, 7, 8, 9, 10, 11, 12, 23, 24, 25, 26, 27, 28], 'rib'), ROOT,
                p=sine(pos(ROOT), [0, 16, 0], T / 2, OP, 0.25),      # two bounces per stride
                r=sine(0, 2.5, T, OP))
skull = D.layer('Skull', grp(P, [0, 3, 4, 5, 51, 52, 53], 'skull'), [815, 400], parent=torso,
                r=sine(0, 5, T, OP, -0.15))                             # lags the body = follow-through
D.layer('Jaw', grp(P, [1, 2], 'jaw'), [790, 335], r=sine(0, 6, T / 4, OP), parent=skull)
a1 = D.layer('Arm L upper', grp(P, [30, 33]), [634, 485], r=sine(0, 14, T, OP, 0.5), parent=torso)
a2 = D.layer('Arm L fore', grp(P, [31, 34]), [467, 672], r=sine(0, 10, T, OP, 0.4), parent=a1)
D.layer('Hand L', grp(P, [32, 35, 36, 37]), [310, 830], r=sine(0, 12, T, OP, 0.3), parent=a2)
b1 = D.layer('Arm R upper', grp(P, [13, 17]), [1018, 515], r=sine(0, 12, T, OP), parent=torso)
b2 = D.layer('Arm R fore', grp(P, [14, 16]), [1150, 669], r=sine(0, 10, T, OP, -0.1), parent=b1)
D.layer('Hand R', grp(P, [15, 18, 19, 20, 21, 22]), [1232, 468], r=sine(0, 18, T / 2, OP), parent=b2)
pelvis = D.layer('Pelvis', grp(P, [29]), [820, 830], r=sine(0, -3, T, OP), parent=torso)
l1 = D.layer('Leg L thigh', grp(P, [38]), [720, 975], r=sine(0, 13, T, OP), parent=pelvis)
l2 = D.layer('Leg L shin', grp(P, [41, 47]), [578, 1272], r=sine(0, 12, T, OP, -0.15), parent=l1)
D.layer('Foot L', grp(P, [48, 49, 50]), [299, 1155], r=sine(0, 10, T, OP, -0.3), parent=l2)
r1 = D.layer('Leg R thigh', grp(P, [39]), [935, 1008], r=sine(0, 12, T, OP, 0.5), parent=pelvis)   # opposite phase
r2 = D.layer('Leg R shin', grp(P, [40, 46]), [1020, 1305], r=sine(0, 10, T, OP, 0.35), parent=r1)
D.layer('Foot R', grp(P, [42, 43, 44, 45]), [920, 1585], r=sine(0, 8, T, OP, 0.2), parent=r2)
D.save('skeleton_run_loop.json')
