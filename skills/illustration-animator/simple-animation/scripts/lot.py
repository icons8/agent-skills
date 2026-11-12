"""lot.py — tiny SVG -> Lottie toolkit for hand-authored looping animations.

Every shape is converted to ABSOLUTE canvas coordinates. Each animated part is a
shape layer whose anchor == position == pivot, so at rest geometry sits exactly
where the SVG drew it, and rotation/scale happen around the pivot you choose.

Typical build script:

    import sys; sys.path.insert(0, '<this skill>/scripts')
    from lot import *
    P = load_paths('art.svg')                 # [(d, fill), ...] in SVG paint order
    W, H = svg_size('art.svg')
    D = Doc('Bell ring loop', op=120, w=W, h=H)   # 4 s at 30 fps
    bell = D.layer('Bell', grp(P, [0, 1]), pivot=[1015, 322],
                   r=anim([(0, 0, 'io'), (12, 7, 'io'), (22, -24, 'io'), (80, 0, 'lin'), (120, 0, 'lin')]))
    D.layer('Clapper', grp(P, [2]), [1000, 900], r=sine(0, 6, 30, 120), parent=bell)
    D.save('bell_loop.json')

Layer stacking: add the FRONT-most layer first. A child (parent=...) is inserted
directly above its parent. Inside a layer, grp() keeps SVG paint order for you.
"""
import json, math, re
from svgpathtools import parse_path, Line, CubicBezier, QuadraticBezier

# ---------------------------------------------------------------- SVG input
def load_paths(svg_file):
    """All filled shapes (path/circle/rect/ellipse/polygon...) in SVG paint order,
    with group transforms baked in. Unfilled shapes, <defs>/clipPath geometry are skipped.
    Returns [(d, '#rrggbb'), ...]."""
    from svgelements import SVG, Shape, Path
    svg = SVG.parse(svg_file, reify=True)
    out = []
    for e in svg.elements():
        if not isinstance(e, Shape) or isinstance(e, SVG):
            continue
        if e.fill is None or e.fill.value is None or e.fill.alpha == 0:
            continue
        p = Path(e)
        p.reify()
        p.approximate_arcs_with_cubics()
        if len(p) == 0:
            continue
        out.append((p.d(), e.fill.hex[:7].upper()))
    return out

def svg_size(svg_file):
    from svgelements import SVG
    svg = SVG.parse(svg_file)
    if svg.viewbox:
        return round(svg.viewbox.width), round(svg.viewbox.height)
    return round(svg.width), round(svg.height)

def bbox(path):
    """(x0, x1, y0, y1) of one loaded path."""
    return parse_path(path[0]).bbox()

def centre(path):
    x0, x1, y0, y1 = bbox(path)
    return [round((x0 + x1) / 2, 1), round((y0 + y1) / 2, 1)]

# ---------------------------------------------------------------- shapes
def _cubic(seg):
    if isinstance(seg, CubicBezier):
        return seg.start, seg.control1, seg.control2, seg.end
    if isinstance(seg, Line):
        return seg.start, seg.start, seg.end, seg.end
    if isinstance(seg, QuadraticBezier):
        s, c, e = seg.start, seg.control, seg.end
        return s, s + 2/3*(c-s), e + 2/3*(c-e), e
    raise ValueError(f'unsupported segment {type(seg).__name__}')

def _r(z):
    return [round(z.real, 3), round(z.imag, 3)]

def shapes_from_d(d):
    shapes = []
    for sub in parse_path(d).continuous_subpaths():
        segs = [_cubic(s) for s in sub]
        segs = [s for s in segs if abs(s[3]-s[0]) > 1e-6 or abs(s[1]-s[0]) > 1e-6]
        if not segs:
            continue
        closed = abs(segs[-1][3] - segs[0][0]) < 1e-3
        v, i, o = [], [], []
        for k, (a, c1, c2, b) in enumerate(segs):
            v.append(_r(a)); o.append(_r(c1 - a))
            prev = segs[k-1] if (k > 0 or closed) else None
            i.append(_r(prev[2] - prev[3]) if prev else [0, 0])
        if not closed:
            a, c1, c2, b = segs[-1]
            v.append(_r(b)); i.append(_r(c2 - b)); o.append([0, 0])
        shapes.append({"ty": "sh", "ks": {"a": 0, "k": {"c": True, "v": v, "i": i, "o": o}}})
    return shapes

def rgba(h):
    h = h.lstrip('#')
    if len(h) == 3: h = ''.join(c*2 for c in h)
    return [round(int(h[k:k+2], 16)/255, 4) for k in (0, 2, 4)] + [1]

NEUTRAL = {'#FFFFFF', '#000000', '#111111', '#222222'}
ACCENT = [None]   # first non-neutral colour seen -> 'accentColor' slot

def group(name, path, slot=True):
    d, fill = path
    it = shapes_from_d(d)
    fc = {"a": 0, "k": rgba(fill)}
    if slot and fill.upper() not in NEUTRAL:
        if ACCENT[0] is None:
            ACCENT[0] = fill.upper()
        if fill.upper() == ACCENT[0]:
            fc["sid"] = "accentColor"
    it.append({"ty": "fl", "c": fc, "o": {"a": 0, "k": 100}, "r": 1})
    it.append({"ty": "tr", "p": {"a": 0, "k": [0, 0]}, "a": {"a": 0, "k": [0, 0]},
               "s": {"a": 0, "k": [100, 100]}, "r": {"a": 0, "k": 0}, "o": {"a": 0, "k": 100}})
    return {"ty": "gr", "nm": name, "it": it}

def grp(P, idxs, name='part'):
    """Groups for SVG path indices, in SVG paint order (later SVG path = drawn on top).
    Lottie draws the FIRST item of a shape list on top, so this reverses for you —
    getting this wrong hides text/details under white fills."""
    return [group(f'{name} {i}', P[i]) for i in sorted(idxs, reverse=True)]

# ---------------------------------------------------------------- keyframes
EASE = {  # (out.x, out.y, in.x, in.y) of the segment leaving a key
    'io':   (0.45, 0, 0.55, 1),       # sine-like in-out: pendulums, floats, on-screen moves
    'out':  (0.2, 0.75, 0.34, 0.94),  # entrance-sharp: pops, hits, arrivals
    'soft': (0.0, 0.65, 0.51, 0.99),  # settle-soft: landings, overshoot recovery
    'in':   (1.0, 0.02, 0.54, 0.42),  # exit-accelerate: collapses, departures
    'lin':  (0, 0, 1, 1),             # holds and dense sampled curves
}
S100 = [100, 100, 100]

def anim(keys):
    """keys: [(frame, value, ease_to_next)], value scalar or list. Frames must strictly increase —
    overlapping event keys (e.g. bursts closer together than their length) silently break playback,
    so this raises instead."""
    for a, b in zip(keys, keys[1:]):
        if not b[0] > a[0]:
            raise ValueError(f'keyframe times not increasing: {a[0]} -> {b[0]} (overlapping events?)')
    k = []
    for n, (t, val, e) in enumerate(keys):
        s = list(val) if isinstance(val, (list, tuple)) else [val]
        kf = {"t": t, "s": s}
        if n < len(keys) - 1:
            ox, oy, ix, iy = EASE[e]
            kf["o"] = {"x": [ox]*len(s), "y": [oy]*len(s)}
            kf["i"] = {"x": [ix]*len(s), "y": [iy]*len(s)}
        k.append(kf)
    return {"a": 1, "k": k}

def st(v):
    return {"a": 0, "k": v}

def pos(base, dx=0, dy=0):
    return [base[0] + dx, base[1] + dy, 0]

def sine(base, amp, period, op, phase=0.0, step=2):
    """Dense keys of base + amp*sin(2π(t/period + phase)). Seamless when op % period == 0."""
    keys = []
    for t in range(0, op + 1, step):
        s = math.sin(2 * math.pi * (t / period + phase))
        v = [round(b + a * s, 3) for b, a in zip(base, amp)] if isinstance(base, list) else round(base + amp * s, 3)
        keys.append((t, v, 'lin'))
    return anim(keys)

def bob(f, peak=(96, 106), settle=(103, 97)):
    """Squash/stretch 'talking / nodding' bob starting at frame f (22 frames). Scale keys segment."""
    return [(f, S100, 'out'), (f + 4, [104, 95, 100], 'io'), (f + 9, [peak[0], peak[1], 100], 'io'),
            (f + 15, [settle[0], settle[1], 100], 'soft'), (f + 22, S100, 'lin')]

def val_at(keys, t):
    keys = sorted(keys, key=lambda k: k[0])
    for a, b in zip(keys, keys[1:]):
        if a[0] <= t <= b[0]:
            u = 0 if b[0] == a[0] else (t - a[0]) / (b[0] - a[0])
            av = a[1] if isinstance(a[1], list) else [a[1]]
            bv = b[1] if isinstance(b[1], list) else [b[1]]
            r = [round(x + (y - x) * u, 3) for x, y in zip(av, bv)]
            return r if isinstance(a[1], list) else r[0]
    return keys[-1][1] if t > keys[-1][0] else keys[0][1]

def wrap_keys(keys, op):
    """For cyclic events placed at t-lap, t, t+lap: clip into [0, op] with equal end values."""
    ks = sorted([k for k in keys if 0 < k[0] < op], key=lambda k: k[0])
    v0 = val_at(keys, 0)
    out = []
    for k in [(0, v0, 'lin')] + ks + [(op, v0, 'lin')]:
        if out and abs(out[-1][0] - k[0]) < 1e-6:
            continue
        out.append(k)
    return anim(out)

# ---------------------------------------------------------------- masks
def rect_path(x0, y0, x1, y1):
    return {"c": True, "v": [[x0, y0], [x1, y0], [x1, y1], [x0, y1]], "i": [[0, 0]] * 4, "o": [[0, 0]] * 4}

def wipe_mask(layer, y0, y1, keys):
    """Left-to-right reveal of a filled shape that can't be trim-pathed.
    keys: [(frame, x_left, x_right, ease)]. Note: masks are less portable than transforms."""
    k = []
    for n, (t, xl, xr, e) in enumerate(keys):
        kf = {"t": t, "s": [rect_path(xl, y0, xr, y1)]}
        if n < len(keys) - 1:
            ox, oy, ix, iy = EASE[e]
            kf["o"] = {"x": [ox], "y": [oy]}; kf["i"] = {"x": [ix], "y": [iy]}
        k.append(kf)
    layer["hasMask"] = True
    layer["masksProperties"] = [{"inv": False, "mode": "a", "pt": {"a": 1, "k": k},
                                 "o": {"a": 0, "k": 100}, "x": {"a": 0, "k": 0}, "nm": "Reveal"}]

# ---------------------------------------------------------------- document
class Doc:
    def __init__(self, name, op, fr=30, w=1500, h=1500):
        self.name, self.op, self.fr, self.w, self.h = name, op, fr, w, h
        self.layers = []
        ACCENT[0] = None

    def layer(self, name, groups, pivot, r=None, s=None, o=None, p=None, parent=None):
        """Add a shape layer; returns its ind (use as parent=...). Add front-most layers first.
        pivot is in canvas coords; position defaults to pivot so geometry stays where the SVG put it.
        A parented layer's p is still given in canvas coords (parent space == canvas at rest)."""
        ind = len(self.layers) + 1
        L = {"ddd": 0, "ind": ind, "ty": 4, "nm": name, "sr": 1, "ip": 0, "op": self.op, "st": 0, "bm": 0,
             "ks": {"a": st(list(pivot) + [0]), "p": p or st(list(pivot) + [0]),
                    "s": s or st(S100), "r": r or st(0), "o": o or st(100)},
             "shapes": groups}
        if parent:
            L["parent"] = parent
            at = next(k for k, l in enumerate(self.layers) if l["ind"] == parent)
            self.layers.insert(at, L)
        else:
            self.layers.append(L)
        return ind

    def looped(self, name, shape_groups, period, pivot=(0, 0), parent=None):
        """Put shapes whose animation repeats every `period` frames (baked only for frames 0..period)
        into a precomp and replay it with a sawtooth time-remap: same motion, 1/n of the keyframes.
        Use for dangling legs, walk cycles, idle wiggles of heavy (chalk/brush) paths. Returns ind."""
        ref = f'loop_{len(getattr(self, "assets", []))}'
        if not hasattr(self, 'assets'): self.assets = []
        inner = {"ddd": 0, "ind": 1, "ty": 4, "nm": name, "sr": 1, "ip": 0, "op": period + 1, "st": 0, "bm": 0,
                 "ks": {"a": st([0, 0, 0]), "p": st([0, 0, 0]), "s": st(S100), "r": st(0), "o": st(100)},
                 "shapes": shape_groups}
        self.assets.append({"id": ref, "layers": [inner]})
        k, t = [], 0
        while t < self.op:
            k.append({"t": t, "s": [0], "o": {"x": [0], "y": [0]}, "i": {"x": [1], "y": [1]}})
            end = min(t + period, self.op)
            last = {"t": end - 0.001 if end < self.op else end, "s": [round((end - t) / self.fr - (0.001 / self.fr if end < self.op else 0), 5)]}
            if end < self.op:
                last["h"] = 1
            k.append(last)
            t = end
        ind = len(self.layers) + 1
        L = {"ddd": 0, "ind": ind, "ty": 0, "nm": name, "refId": ref, "sr": 1, "ip": 0, "op": self.op, "st": 0,
             "bm": 0, "w": self.w, "h": self.h, "tm": {"a": 1, "k": k},
             "ks": {"a": st([0, 0, 0]), "p": st([0, 0, 0]), "s": st(S100), "r": st(0), "o": st(100)}}
        if parent:
            L["parent"] = parent
            at = next(n for n, l in enumerate(self.layers) if l["ind"] == parent)
            self.layers.insert(at, L)
        else:
            self.layers.append(L)
        return ind

    def get(self, ind):
        return next(l for l in self.layers if l["ind"] == ind)

    def save(self, fn):
        doc = {"v": "5.12.0", "fr": self.fr, "ip": 0, "op": self.op, "w": self.w, "h": self.h,
               "nm": self.name, "ddd": 0, "assets": getattr(self, 'assets', []), "layers": self.layers}
        if ACCENT[0]:
            doc["slots"] = {"accentColor": {"p": {"a": 0, "k": rgba(ACCENT[0])}}}
        json.dump(doc, open(fn, 'w', encoding='utf-8', newline=''), separators=(',', ':'))
        print(fn, round(len(json.dumps(doc)) / 1024), 'KB,', self.op, 'frames @', self.fr, 'fps')

# ---------------------------------------------------------------- occlusion
def silhouette(P, idxs, size, close_px=8, simplify=1.5, shrink=0, region=None, close_lines=()):
    """Solid filled outline of the region enclosed by the given shapes (e.g. an UNFILLED bell
    drawn as a line). Returns a Lottie shape-path dict in canvas coords. Uses a raster pass:
    shapes -> bitmap -> close gaps -> fill holes -> largest outer contour -> polygon.
    shrink: erode by N px so a matte stays INSIDE the outline stroke (no hairline gaps next to it).
    region(x, y) -> bool: keep only that part (e.g. one leg of a whole-figure silhouette).
    close_lines: [((x0, y0), (x1, y1)), ...] extra strokes that close an outline left open in the
    drawing (e.g. where a leg joins the body) so its inside can be filled."""
    import io, cairosvg, numpy as np, cv2
    from PIL import Image
    from scipy import ndimage
    W, H = size
    body = ''.join(f'<path d="{P[i][0]}" fill="#000"/>' for i in idxs)
    body += ''.join(f'<line x1="{a[0]}" y1="{a[1]}" x2="{b[0]}" y2="{b[1]}" stroke="#000" stroke-width="16"/>' for a, b in close_lines)
    png = cairosvg.svg2png(bytestring=f'<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}" '
                                       f'viewBox="0 0 {W} {H}">{body}</svg>'.encode())
    a = np.asarray(Image.open(io.BytesIO(png)).convert('RGBA'))[..., 3] > 0
    st_ = np.ones((3, 3), bool)
    a = ndimage.binary_dilation(a, st_, iterations=close_px)
    a = ndimage.binary_fill_holes(a)
    a = ndimage.binary_erosion(a, st_, iterations=close_px + shrink)
    if region is not None:
        ys, xs = np.mgrid[0:a.shape[0], 0:a.shape[1]]
        a &= np.vectorize(region)(xs, ys).astype(bool)
    cs, _ = cv2.findContours(a.astype(np.uint8), cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE)
    c = max(cs, key=cv2.contourArea)
    c = cv2.approxPolyDP(c, simplify, True)[:, 0, :]
    v = [[float(x), float(y)] for x, y in c]
    return {"c": True, "v": v, "i": [[0, 0]] * len(v), "o": [[0, 0]] * len(v)}

def matte_layer(D, name, shape_path, pivot, parent=None, r=None, p=None, s=None):
    """Invisible layer that defines an alpha matte (td=1). Call set_matte(D, matte, target)
    afterwards to hide/show the target through it."""
    grpd = {"ty": "gr", "nm": name, "it": [
        {"ty": "sh", "ks": {"a": 0, "k": shape_path}},
        {"ty": "fl", "c": {"a": 0, "k": [0, 0, 0, 1]}, "o": {"a": 0, "k": 100}, "r": 1},
        {"ty": "tr", "p": {"a": 0, "k": [0, 0]}, "a": {"a": 0, "k": [0, 0]}, "s": {"a": 0, "k": [100, 100]},
         "r": {"a": 0, "k": 0}, "o": {"a": 0, "k": 100}}]}
    ind = D.layer(name, [grpd], pivot, parent=parent, r=r, p=p, s=s)
    D.get(ind)["td"] = 1
    return ind

def set_matte(D, matte_ind, target_ind, inverted=True):
    """Make target use the matte directly above it. inverted=True: target is HIDDEN where the
    matte is solid — use it to tuck parts behind an unfilled outline drawn in front of them."""
    m = D.get(matte_ind); t = D.get(target_ind)
    D.layers.remove(m)
    D.layers.insert(D.layers.index(t), m)
    t["tt"] = 2 if inverted else 1

# ---------------------------------------------------------------- sampling & physics baking
def _bez(x1, y1, x2, y2, u):
    """CSS-style cubic-bezier easing: progress u (time) -> value fraction."""
    lo, hi = 0.0, 1.0
    for _ in range(40):
        m = (lo + hi) / 2
        x = 3 * (1 - m) ** 2 * m * x1 + 3 * (1 - m) * m * m * x2 + m ** 3
        lo, hi = (m, hi) if x < u else (lo, m)
    m = (lo + hi) / 2
    return 3 * (1 - m) ** 2 * m * y1 + 3 * (1 - m) * m * m * y2 + m ** 3

def sample(keys, t):
    """Value of a keyframe list [(frame, value, ease)] at time t, with the same easing Lottie uses.
    Use it to drive simulations from animated properties."""
    keys = sorted(keys, key=lambda k: k[0])
    if t <= keys[0][0]: return keys[0][1]
    if t >= keys[-1][0]: return keys[-1][1]
    for a, b in zip(keys, keys[1:]):
        if a[0] <= t <= b[0]:
            u = (t - a[0]) / (b[0] - a[0]) if b[0] > a[0] else 1
            ox, oy, ix, iy = EASE[a[2]]
            f = _bez(ox, oy, ix, iy, u)
            if isinstance(a[1], list):
                return [x + (y - x) * f for x, y in zip(a[1], b[1])]
            return a[1] + (b[1] - a[1]) * f

def pendulum(pivot_world, frame_angle, op, rod, period_f=8.0, zeta=0.08, limits=(-20, 20),
             restitution=0.55, sub=20, gain=1.0):
    """Bake a hanging part (clapper, pendant, tag, earring) driven by the motion of what it hangs on.
    pivot_world(t) -> (x, y) of the hinge in canvas px; frame_angle(t) -> rotation (deg) of the
    carrier. rod = (dx, dy): vector from hinge to the bob in the drawing (canvas px). Simulates a damped pendulum (natural period `period_f` frames) in the carrier's frame,
    pushed by the carrier's angular and linear acceleration, bouncing off `limits` (deg, the walls).
    Returns (keys_relative_rotation, hit_frames). Rest angle = 0 = the pose in the drawing.
    Tip: put period_f near the carrier's shaking period for a lively, resonant swing.
    zeta can be a function of time: raise it when the story says the motion is stopped."""
    w0 = 2 * math.pi / period_f; dt = 1.0 / sub
    zf = zeta if callable(zeta) else (lambda t: zeta)   # zeta may be a function of time (e.g. a damper engages)
    length = math.hypot(*rod); rod0 = math.atan2(rod[1], rod[0])
    def acc(t):  # carrier accelerations (finite differences, per frame^2)
        h = 0.5
        th = [math.radians(frame_angle(t + k * h)) for k in (-1, 0, 1)]
        pw = [pivot_world(t + k * h) for k in (-1, 0, 1)]
        a_th = (th[2] - 2 * th[1] + th[0]) / h ** 2
        ax = (pw[2][0] - 2 * pw[1][0] + pw[0][0]) / h ** 2
        ay = (pw[2][1] - 2 * pw[1][1] + pw[0][1]) / h ** 2
        return a_th, ax, ay, th[1]
    psi = om = 0.0; keys, hits = [], []
    lo, hi = math.radians(limits[0]), math.radians(limits[1])
    for f in range(op + 1):
        keys.append((f, round(math.degrees(psi), 3), 'lin'))
        for s in range(sub):
            t = f + s * dt
            a_th, ax, ay, th = acc(t)
            # hinge acceleration acts as a pseudo-force -a on the bob: torque = d x (-a)
            ang = rod0 + th + psi
            dx, dy = math.cos(ang), math.sin(ang)
            tang = -(dx * ay - dy * ax) / length
            alpha = -w0 * w0 * psi - 2 * zf(t) * w0 * om - gain * a_th + gain * tang
            om += alpha * dt; psi += om * dt
            if psi > hi or psi < lo:
                psi = hi if psi > hi else lo
                if abs(om) > 0.01 and (not hits or f - hits[-1] > 3):
                    hits.append(f)
                om = -om * restitution
    return keys, hits

# ---------------------------------------------------------------- path deformation (bend, don't cut)
def simplify_shape(sh, tol=0.8):
    """Flatten a shape to a polyline and drop points within `tol` px (Douglas-Peucker). Rough chalk/brush
    outlines are hundreds of tiny curves; as a polyline they look identical and animate 3-5x lighter."""
    import numpy as np, cv2
    k = sh["ks"]["k"]; v, i, o = k["v"], k["i"], k["o"]; n = len(v); pts = []
    segs = n if k["c"] else n - 1
    for j in range(segs):
        a = v[j]; b = v[(j + 1) % n]; c1 = [a[0] + o[j][0], a[1] + o[j][1]]
        c2 = [b[0] + i[(j + 1) % n][0], b[1] + i[(j + 1) % n][1]]
        for s_ in range(4):
            u = s_ / 4
            pts.append([(1-u)**3*a[0] + 3*(1-u)**2*u*c1[0] + 3*(1-u)*u*u*c2[0] + u**3*b[0],
                        (1-u)**3*a[1] + 3*(1-u)**2*u*c1[1] + 3*(1-u)*u*u*c2[1] + u**3*b[1]])
    if not k["c"]:
        pts.append(v[-1])
    arr = np.array(pts, dtype=np.float32).reshape(-1, 1, 2)
    red = cv2.approxPolyDP(arr, tol, k["c"])[:, 0, :]
    vv = [[round(float(x), 1), round(float(y), 1)] for x, y in red]
    return {"ty": "sh", "ks": {"a": 0, "k": {"c": k["c"], "v": vv, "i": [[0, 0]] * len(vv), "o": [[0, 0]] * len(vv)}}}

def deform_group(name, path, warp, op, step=2, frames=None, simplify=None):
    """Animated-path version of group(): the shape's vertices are pushed through warp(t, x, y) -> (x, y)
    every `step` frames and baked as shape keyframes. Use it for anything that must BEND as one piece
    (arms, legs, tails, cloth, stems) instead of cutting it into rotating segments.
    Tangents are warped too, so curves stay smooth. Detailed (chalk/brush) paths get heavy: pass
    `frames` = only the frames where the deformation changes (see motion_frames) to keep files small."""
    base = shapes_from_d(path[0])
    if simplify:
        base = [simplify_shape(sh, simplify) for sh in base]
    def warp_shape(t, sh):
        k = sh["ks"]["k"]; v2, i2, o2 = [], [], []
        for (x, y), (ix, iy), (ox, oy) in zip(k["v"], k["i"], k["o"]):
            X, Y = warp(t, x, y)
            IX, IY = warp(t, x + ix, y + iy); OX, OY = warp(t, x + ox, y + oy)
            v2.append([round(X, 1), round(Y, 1)]); i2.append([round(IX - X, 1), round(IY - Y, 1)])
            o2.append([round(OX - X, 1), round(OY - Y, 1)])
        return {"c": k["c"], "v": v2, "i": i2, "o": o2}
    it = []
    for sh in base:
        kfs = []
        fr = frames or list(range(0, op + 1, step))
        fr = sorted(set(fr) | {0, op})
        for n, t in enumerate(fr):
            kf = {"t": t, "s": [warp_shape(t, sh)]}
            if n < len(fr) - 1:
                kf["o"] = {"x": [0], "y": [0]}; kf["i"] = {"x": [1], "y": [1]}
            kfs.append(kf)
        it.append({"ty": "sh", "ks": {"a": 1, "k": kfs}})
    d, fill = path
    it.append({"ty": "fl", "c": {"a": 0, "k": rgba(fill)}, "o": {"a": 0, "k": 100}, "r": 1})
    it.append({"ty": "tr", "p": {"a": 0, "k": [0, 0]}, "a": {"a": 0, "k": [0, 0]},
               "s": {"a": 0, "k": [100, 100]}, "r": {"a": 0, "k": 0}, "o": {"a": 0, "k": 100}})
    return {"ty": "gr", "nm": name, "it": it}

def bend_warp(root, tip, angle_fn, falloff=(0.0, 1.0)):
    """Warp for deform_group: bends a limb around `root` toward `tip`. Each point rotates by
    angle_fn(t) * w, where w ramps smoothly 0 -> 1 along root->tip (between falloff fractions).
    Points past the tip rotate fully (so a held object follows rigidly)."""
    rx, ry = root; dx, dy = tip[0] - rx, tip[1] - ry; L2 = dx * dx + dy * dy
    a0, a1 = falloff
    def warp(t, x, y):
        u = ((x - rx) * dx + (y - ry) * dy) / L2
        u = min(1, max(0, (u - a0) / (a1 - a0)))
        w = u * u * (3 - 2 * u)
        a = math.radians(angle_fn(t) * w)
        X, Y = x - rx, y - ry
        return rx + X * math.cos(a) - Y * math.sin(a), ry + X * math.sin(a) + Y * math.cos(a)
    return warp

def motion_frames(keys, op, step=2, eps=1e-3):
    """Frames worth baking for a sampled property: every `step` frames while it changes, plus the
    first and last frame of each still stretch (so a hold costs two keys instead of dozens)."""
    val = lambda t: (lambda v: v[0] if isinstance(v, list) else v)(sample(keys, t))
    moving = [abs(val(t + 1) - val(t)) > eps for t in range(op)]
    out = {0, op}
    t = 0
    while t < op:
        if moving[t]:
            s0 = t
            while t < op and moving[t]:
                t += 1
            out.update(range(s0, t + 1, step)); out.update({s0, t})
        else:
            t += 1
    return sorted(out)

def deform_path_keys(path_dict, warp, op, frames):
    """Animated Lottie path ('ks' value) from a static path dict pushed through warp(t, x, y)."""
    kfs = []
    fr = sorted(set(frames) | {0, op})
    for n, t in enumerate(fr):
        v2, i2, o2 = [], [], []
        for (x, y), (ix, iy), (ox, oy) in zip(path_dict["v"], path_dict["i"], path_dict["o"]):
            X, Y = warp(t, x, y); IX, IY = warp(t, x + ix, y + iy); OX, OY = warp(t, x + ox, y + oy)
            v2.append([round(X, 1), round(Y, 1)]); i2.append([round(IX - X, 1), round(IY - Y, 1)])
            o2.append([round(OX - X, 1), round(OY - Y, 1)])
        kf = {"t": t, "s": [{"c": path_dict["c"], "v": v2, "i": i2, "o": o2}]}
        if n < len(fr) - 1:
            kf["o"] = {"x": [0], "y": [0]}; kf["i"] = {"x": [1], "y": [1]}
        kfs.append(kf)
    return {"a": 1, "k": kfs}

def region_warp(parts):
    """Combine several warps by region: parts = [(inside(x, y) -> bool tested at REST, warp), ...].
    First match wins; points in no region stay put. Lets one silhouette follow several bending limbs."""
    def warp(t, x, y):
        for inside, w in parts:
            if inside(x, y):
                return w(t, x, y)
        return x, y
    return warp

def stroke_group(name, pts, width, color='#000000'):
    """Plain stroked polyline (e.g. to rebuild a piece of outline that was hidden behind something
    in the drawing and becomes visible once that thing moves)."""
    v = [[round(x, 1), round(y, 1)] for x, y in pts]
    return {"ty": "gr", "nm": name, "it": [
        {"ty": "sh", "ks": {"a": 0, "k": {"c": False, "v": v, "i": [[0, 0]] * len(v), "o": [[0, 0]] * len(v)}}},
        {"ty": "st", "c": {"a": 0, "k": rgba(color)}, "o": {"a": 0, "k": 100}, "w": {"a": 0, "k": width}, "lc": 2, "lj": 2},
        {"ty": "tr", "p": {"a": 0, "k": [0, 0]}, "a": {"a": 0, "k": [0, 0]}, "s": {"a": 0, "k": [100, 100]},
         "r": {"a": 0, "k": 0}, "o": {"a": 0, "k": 100}}]}

def fit_circle(path):
    """Least-squares circle (cx, cy, r) through the vertices of a roughly round outline."""
    import numpy as np
    pts = [v for sh in shapes_from_d(path[0]) for v in sh["ks"]["k"]["v"]]
    A = np.array([[x, y, 1] for x, y in pts]); b = np.array([-(x * x + y * y) for x, y in pts])
    D_, E_, F_ = np.linalg.lstsq(A, b, rcond=None)[0]
    cx, cy = -D_ / 2, -E_ / 2
    return cx, cy, math.sqrt(cx * cx + cy * cy - F_)

def hidden_patch(P, idx, occluder_idxs, size, grow=26, clip_idxs=None, close_lines=(), clip_disc=None):
    """The drawing stops a shape (e.g. a continent) where something in front covers it. When the front
    thing moves, that cut edge shows as a gap. This returns polygons that continue shape `idx` UNDER
    the occluder by `grow` px (optionally clipped to the inside of `clip_idxs`, e.g. the planet disc).
    Add them to the back layer, under the occluder's matte, so they only show when uncovered."""
    import io, cairosvg, numpy as np, cv2
    from PIL import Image
    from scipy import ndimage
    W, H = size
    def mask(idxs, fill_holes=False, extra=()):
        body = ''.join(f'<path d="{P[i][0]}" fill="#000"/>' for i in idxs)
        body += ''.join(f'<line x1="{a[0]}" y1="{a[1]}" x2="{b[0]}" y2="{b[1]}" stroke="#000" stroke-width="16"/>' for a, b in extra)
        png = cairosvg.svg2png(bytestring=f'<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}" viewBox="0 0 {W} {H}">{body}</svg>'.encode())
        m = np.asarray(Image.open(io.BytesIO(png)).convert('RGBA'))[..., 3] > 0
        if fill_holes:
            st_ = np.ones((3, 3), bool)
            m = ndimage.binary_erosion(ndimage.binary_fill_holes(ndimage.binary_dilation(m, st_, iterations=8)), st_, iterations=8)
        return m
    st_ = np.ones((3, 3), bool)
    shape = mask([idx])
    occ = mask(occluder_idxs, True, close_lines)
    near = ndimage.distance_transform_edt(~shape) < grow          # round growth, no square/diamond edges
    patch = near & ndimage.binary_dilation(occ, st_, iterations=6)
    if clip_idxs:
        patch &= ndimage.binary_erosion(mask(clip_idxs, True), st_, iterations=4)
    if clip_disc:                     # (cx, cy, r): use when the clipping outline itself has gaps
        ys, xs = np.mgrid[0:H, 0:W]
        patch &= (xs - clip_disc[0]) ** 2 + (ys - clip_disc[1]) ** 2 < clip_disc[2] ** 2
    patch |= shape & patch
    cs, _ = cv2.findContours(patch.astype(np.uint8), cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE)
    out = []
    for c in cs:
        if cv2.contourArea(c) < 30: continue
        c = cv2.approxPolyDP(c, 1.5, True)[:, 0, :]
        v = [[float(x), float(y)] for x, y in c]
        out.append({"c": True, "v": v, "i": [[0, 0]] * len(v), "o": [[0, 0]] * len(v)})
    return out

def poly_group(name, polys, color='#000000'):
    it = [{"ty": "sh", "ks": {"a": 0, "k": p}} for p in polys]
    it.append({"ty": "fl", "c": {"a": 0, "k": rgba(color)}, "o": {"a": 0, "k": 100}, "r": 1})
    it.append({"ty": "tr", "p": {"a": 0, "k": [0, 0]}, "a": {"a": 0, "k": [0, 0]}, "s": {"a": 0, "k": [100, 100]},
               "r": {"a": 0, "k": 0}, "o": {"a": 0, "k": 100}})
    return {"ty": "gr", "nm": name, "it": it}

def axis_reveal(layer, a, b, half_width, keys, overshoot=20):
    """Reveal a filled stroke (chalk line, connector) along any direction a -> b.
    keys: [(frame, u0, u1, ease)] — the visible part is the band between fractions u0..u1 of a->b.
    Draw on: u0=0, u1 0->1. Wipe away in the same direction afterwards: u0 0->1 with u1=1."""
    ax, ay = b[0] - a[0], b[1] - a[1]; L = math.hypot(ax, ay); ux, uy = ax / L, ay / L
    nx, ny = -uy * half_width, ux * half_width
    sx, sy = a[0] - ux * overshoot, a[1] - uy * overshoot; LL = L + 2 * overshoot
    def poly(u0, u1):
        p0 = (sx + ux * LL * u0, sy + uy * LL * u0); p1 = (sx + ux * LL * u1, sy + uy * LL * u1)
        v = [[p0[0] + nx, p0[1] + ny], [p1[0] + nx, p1[1] + ny], [p1[0] - nx, p1[1] - ny], [p0[0] - nx, p0[1] - ny]]
        return {"c": True, "v": [[round(x, 2), round(y, 2)] for x, y in v], "i": [[0, 0]] * 4, "o": [[0, 0]] * 4}
    k = []
    for n, (t, u0, u1, e) in enumerate(keys):
        kf = {"t": t, "s": [poly(u0, u1)]}
        if n < len(keys) - 1:
            ox, oy, ix, iy = EASE[e]; kf["o"] = {"x": [ox], "y": [oy]}; kf["i"] = {"x": [ix], "y": [iy]}
        k.append(kf)
    layer["hasMask"] = True
    layer["masksProperties"] = [{"inv": False, "mode": "a", "pt": {"a": 1, "k": k}, "o": {"a": 0, "k": 100},
                                 "x": {"a": 0, "k": 0}, "nm": "Reveal"}]

# ---------------------------------------------------------------- separating merged artwork
def ink_mask(svg_size_, d, K=2):
    """Raster (K x) boolean mask of one path's ink."""
    import io, cairosvg, numpy as np
    from PIL import Image
    W, H = svg_size_
    png = cairosvg.svg2png(bytestring=f'<svg xmlns="http://www.w3.org/2000/svg" width="{W*K}" height="{H*K}" '
                                       f'viewBox="0 0 {W} {H}"><path d="{d}" fill="#000"/></svg>'.encode())
    return np.asarray(Image.open(io.BytesIO(png)).convert('RGBA'))[..., 3] > 127

def mask_to_paths(mask, K=2, tol=0.6):
    """Vectorise a boolean mask (K x canvas) into Lottie paths (outer contours + holes).
    Use with group fill rule even-odd: mask_group(). Fidelity ~ 1/K px, fine for chalk/brush art."""
    import numpy as np, cv2
    cs, _ = cv2.findContours(mask.astype(np.uint8), cv2.RETR_CCOMP, cv2.CHAIN_APPROX_NONE)
    out = []
    for c in cs:
        if cv2.contourArea(c) < 4 * K * K: continue
        c = cv2.approxPolyDP(c, tol * K, True)[:, 0, :]
        v = [[round(float(x) / K, 2), round(float(y) / K, 2)] for x, y in c]
        out.append({"c": True, "v": v, "i": [[0, 0]] * len(v), "o": [[0, 0]] * len(v)})
    return out

def mask_group(name, paths, color='#000000'):
    it = [{"ty": "sh", "ks": {"a": 0, "k": p}} for p in paths]
    it.append({"ty": "fl", "c": {"a": 0, "k": rgba(color)}, "o": {"a": 0, "k": 100}, "r": 2})   # even-odd: holes stay holes
    it.append({"ty": "tr", "p": {"a": 0, "k": [0, 0]}, "a": {"a": 0, "k": [0, 0]}, "s": {"a": 0, "k": [100, 100]},
               "r": {"a": 0, "k": 0}, "o": {"a": 0, "k": 100}})
    return {"ty": "gr", "nm": name, "it": it}


# ---- smooth secondary motion: damped-spring simulation (see style-notes P11) ----
def spring_sim(drive, op, per, zeta, reps=4, sub=8):
    """Simulate a damped spring x'' = w^2 (drive(t) - x) - 2 zeta w x' over a looping timeline of `op` frames.
    drive(t) is the target (smooth forces: gaussian bumps, the body's velocity/acceleration...).
    Runs `reps` loops and returns the last one (op+1 samples, [op] == [0]): continuous position and velocity,
    seamless loop."""
    import math
    w = 2 * math.pi / per; x = v = 0.0; out = {}; dt = 1.0 / sub
    for i in range(reps * op * sub):
        t = (i / sub) % op
        a = w * w * (drive(t) - x) - 2 * zeta * w * v
        v += a * dt; x += v * dt
        if i >= (reps - 1) * op * sub and i % sub == sub - 1: out[round(t + dt) % op] = x
    return [out[t % op] for t in range(op + 1)]

def loop_bump(t, c, width, op):
    """Gaussian pulse centred at frame c that wraps around a loop of op frames."""
    import math
    d = min(abs(t - c), op - abs(t - c)); return math.exp(-(d / width) ** 2)
