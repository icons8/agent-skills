#!/usr/bin/env python3
"""One measuring tool for the skill and its gates: ground line, mass, saturation.

The single source of these formulas. SKILL.md calls this script in steps 5
and 6, and the eval gates import the functions from here: two hand-copied
versions of the saturation formula once drifted apart (black pixels in the
denominator), so they are not copied anymore.

    python3 measure.py <files...>

Prints per file: the ground-line offset as % of the frame (for subjects that
stand), the mass offset as % of the frame (for subjects that float), and the
mean saturation, 0..1. SVG is rasterized through headless Chrome; override
the binary path with $CHROME.
"""
import os
import re
import subprocess
import sys

from PIL import Image

_CHROME_CANDIDATES = [
    os.environ.get("CHROME", ""),
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/usr/bin/google-chrome",
    "/usr/bin/chromium",
    "/usr/bin/chromium-browser",
]


def chrome_path():
    for c in _CHROME_CANDIDATES:
        if c and os.path.exists(c):
            return c
    return None


def is_svg(path):
    """By content, not by suffix: the gates download files with no extension."""
    try:
        with open(path, "rb") as f:
            head = f.read(512).lstrip()
    except OSError:
        return False
    return head.startswith(b"<") and (b"<svg" in head or b"<?xml" in head)


def _svg_aspect(path):
    """h/w of the frame: viewBox first, then the tag's width/height, else 1.0."""
    with open(path, "rb") as f:
        head = f.read(4096)
    start = head.find(b"<svg")
    tag = head[start:head.find(b">", start)] if start >= 0 else head
    m = re.search(rb'viewBox\s*=\s*["\']\s*[\d.eE+-]+[\s,]+[\d.eE+-]+'
                  rb'[\s,]+([\d.eE+-]+)[\s,]+([\d.eE+-]+)', tag)
    if not m:
        w = re.search(rb'\bwidth\s*=\s*["\']([\d.]+)', tag)
        h = re.search(rb'\bheight\s*=\s*["\']([\d.]+)', tag)
        m = (w, h) if w and h else None
        if m:
            w, h = float(w.group(1)), float(h.group(1))
            return h / w if w > 0 and h > 0 else 1.0
        return 1.0
    w, h = float(m.group(1)), float(m.group(2))
    return h / w if w > 0 and h > 0 else 1.0


def rasterize(path, out=None):
    """SVG to PNG through headless Chrome. Anything else is returned as is.

    An SVG cannot be screenshotted in a fixed-size window directly: a file
    with small width/height attributes renders in a corner, and the frame
    geometry lies (a perfectly seated work reported a ground line of -60%).
    So the window takes the frame's aspect from the viewBox, and a wrapper
    page stretches the image to fill the whole window.
    """
    if not is_svg(path):
        return path
    out = out or path + ".png"
    if os.path.exists(out):
        return out
    c = chrome_path()
    if c is None:
        raise RuntimeError("no Chrome to rasterize SVG with; set $CHROME")
    aspect = _svg_aspect(path)
    w, h = 300, max(20, min(1200, round(300 * aspect)))
    wrapper = out + ".wrap.html"
    with open(wrapper, "w") as f:
        f.write('<style>html,body{margin:0;padding:0}'
                'img{display:block;width:100vw;height:100vh}</style>'
                f'<img src="file://{os.path.abspath(path)}">')
    r = subprocess.run(
        [c, "--headless", "--disable-gpu", "--hide-scrollbars",
         f"--window-size={w},{h}", "--default-background-color=00000000",
         f"--screenshot={out}", "file://" + os.path.abspath(wrapper)],
        capture_output=True)
    os.remove(wrapper)
    if r.returncode != 0 or not os.path.exists(out):
        raise RuntimeError(f"Chrome failed to rasterize {path}")
    return out


def _pixels(path, size):
    im = Image.open(rasterize(path)).convert("RGBA").resize((size, size))
    return im.load()


def ground_offset(path):
    """% from the frame bottom to the object's lowest point. 0 = seated on the edge.

    The stable statistic for anything that stands on a surface. None when the
    image has no opaque pixels.
    """
    px = _pixels(path, 160)
    ys = [y for y in range(160) for x in range(160) if px[x, y][3] > 24]
    if not ys:
        return None
    return round((max(ys) - 159) / 160 * 100, 1)


def mass_offset(path):
    """% offset of the centre of mass from the frame centre. Floating subjects only:

    for standing ones it is dragged by anything detached from the main object
    (beans flying over a coffee pack asked for a 14.2% nudge while the bottoms
    were already level).
    """
    px = _pixels(path, 160)
    ys = [y for y in range(160) for x in range(160) if px[x, y][3] > 24]
    if not ys:
        return None
    return round((sum(ys) / len(ys) - 80) / 160 * 100, 1)


def saturation(path):
    """Mean saturation of the opaque pixels, 0..1.

    Black pixels stay in the denominator with a contribution of 0: the
    0.10/0.35 thresholds (a split = a colourless work next to a colourful
    one) are calibrated against this version of the formula. A fully
    transparent image returns None rather than dividing by zero.
    """
    px = _pixels(path, 120)
    tot = n = 0
    for y in range(120):
        for x in range(120):
            r, g, b, a = px[x, y]
            if a > 32:
                mx, mn = max(r, g, b), min(r, g, b)
                if mx:
                    tot += (mx - mn) / mx
                n += 1
    return round(tot / n, 3) if n else None


if __name__ == "__main__":
    files = sys.argv[1:]
    if not files:
        print(__doc__)
        sys.exit(2)
    print(f"{'file':<44} {'ground %':>8} {'mass %':>8} {'sat.':>7}")
    bad = 0
    for f in files:
        name = os.path.basename(f)[:43]
        try:
            row = [ground_offset(f), mass_offset(f), saturation(f)]
            g, m, s = ["-" if v is None else v for v in row]
            print(f"{name:<44} {g:>8} {m:>8} {s:>7}")
        except Exception as e:
            bad += 1
            print(f"{name:<44} error: {e}")
    sys.exit(1 if bad else 0)
