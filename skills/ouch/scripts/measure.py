#!/usr/bin/env python3
# /// script
# dependencies = ["pillow"]
# ///
"""One measuring tool for the skill and its gates: ground line, mass, saturation.

The single source of these formulas. SKILL.md calls this script in steps 5
and 6, and the eval gates import the functions from here: two hand-copied
versions of the saturation formula once drifted apart (black pixels in the
denominator), so they are not copied anymore.

    python3 measure.py <files...>        # macOS, Linux
    py measure.py <files...>             # Windows
    uv run measure.py <files...>         # any OS; installs Pillow on the fly

Needs Python 3 with Pillow (python3 -m pip install pillow). SVG files are
rasterized through headless Chrome or Edge; override the browser binary with
$CHROME. PNG and WebP need no browser.

Prints per file: the ground-line offset as % of the frame (for subjects that
stand), the mass offset as % of the frame (for subjects that float), and the
mean saturation, 0..1. Wildcards in arguments are expanded by the script
itself, so `assets/illustrations/*` works in cmd and PowerShell too.
Rasters go to a temporary directory and are deleted on exit; nothing is
written next to the source files.
"""
import atexit
import glob
import os
import re
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

_PIL_HINT = ("measure.py needs Pillow. Install it with `python3 -m pip install pillow` "
             "(Windows: `py -m pip install pillow`), or run the script with `uv run`.")


def _image_module():
    try:
        from PIL import Image
    except ImportError:
        raise RuntimeError(_PIL_HINT) from None
    return Image


def _chrome_candidates():
    env = os.environ.get("CHROME", "")
    local = os.environ.get("LOCALAPPDATA", "")
    pf = os.environ.get("PROGRAMFILES", r"C:\Program Files")
    pf86 = os.environ.get("PROGRAMFILES(X86)", r"C:\Program Files (x86)")
    paths = [
        env,
        # macOS
        "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
        "/Applications/Chromium.app/Contents/MacOS/Chromium",
        "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
        # Linux
        "/usr/bin/google-chrome",
        "/usr/bin/google-chrome-stable",
        "/usr/bin/chromium",
        "/usr/bin/chromium-browser",
        "/snap/bin/chromium",
        "/usr/bin/microsoft-edge",
        # Windows
        os.path.join(pf, "Google", "Chrome", "Application", "chrome.exe"),
        os.path.join(pf86, "Google", "Chrome", "Application", "chrome.exe"),
        os.path.join(local, "Google", "Chrome", "Application", "chrome.exe") if local else "",
        os.path.join(pf86, "Microsoft", "Edge", "Application", "msedge.exe"),
        os.path.join(pf, "Microsoft", "Edge", "Application", "msedge.exe"),
    ]
    for name in ("google-chrome", "google-chrome-stable", "chromium",
                 "chromium-browser", "chrome", "msedge", "microsoft-edge"):
        found = shutil.which(name)
        if found:
            paths.append(found)
    return paths


def chrome_path():
    for c in _chrome_candidates():
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


def is_image(path):
    """SVG or anything Pillow can open. Directories and other files are skipped."""
    if not os.path.isfile(path):
        return False
    if is_svg(path):
        return True
    try:
        with _image_module().open(path) as im:
            im.verify()
        return True
    except Exception:
        return False


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


_TMP = None
_RASTERS = {}


def _tmpdir():
    global _TMP
    if _TMP is None:
        _TMP = tempfile.mkdtemp(prefix="ouch-measure-")
        atexit.register(shutil.rmtree, _TMP, ignore_errors=True)
    return _TMP


def rasterize(path, out=None):
    """SVG to PNG through headless Chrome. Anything else is returned as is.

    An SVG cannot be screenshotted in a fixed-size window directly: a file
    with small width/height attributes renders in a corner, and the frame
    geometry lies (a perfectly seated work reported a ground line of -60%).
    So the window takes the frame's aspect from the viewBox, and a wrapper
    page stretches the image to fill the whole window.

    Without `out` the raster lands in a temporary directory that is removed
    when the process exits, and is reused within the process. With `out`
    (the gates pass their own cache path) an existing file is reused.
    """
    if not is_svg(path):
        return path
    key = os.path.abspath(path)
    if out is None:
        if key in _RASTERS:
            return _RASTERS[key]
        out = os.path.join(_tmpdir(), f"{len(_RASTERS)}-{os.path.basename(path)}.png")
    elif os.path.exists(out):
        return out
    c = chrome_path()
    if c is None:
        raise RuntimeError("no Chrome or Edge to rasterize SVG with; set $CHROME "
                           "to the browser binary")
    aspect = _svg_aspect(path)
    w, h = 300, max(20, min(1200, round(300 * aspect)))
    wrapper = out + ".wrap.html"
    with open(wrapper, "w", encoding="utf-8") as f:
        f.write('<style>html,body{margin:0;padding:0}'
                'img{display:block;width:100vw;height:100vh}</style>'
                f'<img src="{Path(path).resolve().as_uri()}">')
    try:
        r = subprocess.run(
            [c, "--headless", "--disable-gpu", "--hide-scrollbars",
             f"--window-size={w},{h}", "--default-background-color=00000000",
             f"--screenshot={out}", Path(wrapper).resolve().as_uri()],
            capture_output=True)
    finally:
        try:
            os.remove(wrapper)
        except OSError:
            pass
    if r.returncode != 0 or not os.path.exists(out):
        raise RuntimeError(f"Chrome failed to rasterize {path}")
    _RASTERS[key] = out
    return out


def _pixels(path, size):
    Image = _image_module()
    with Image.open(rasterize(path)) as im:
        return im.convert("RGBA").resize((size, size)).load()


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


def expand_args(args):
    """Expand wildcards the shell did not (cmd, PowerShell); keep order, drop dupes."""
    files, seen = [], set()
    for a in args:
        hits = sorted(glob.glob(a)) if any(ch in a for ch in "*?[") else [a]
        for f in hits or [a]:
            if f not in seen:
                seen.add(f)
                files.append(f)
    return files


def main(argv):
    files = expand_args(argv)
    if not files or any(a in ("-h", "--help") for a in argv):
        print(__doc__)
        return 2
    try:
        _image_module()
    except RuntimeError as e:
        print(e, file=sys.stderr)
        return 2
    print(f"{'file':<44} {'ground %':>8} {'mass %':>8} {'sat.':>7}")
    bad = 0
    for f in files:
        name = os.path.basename(f.rstrip("/\\"))[:43]
        if not os.path.exists(f):
            bad += 1
            print(f"{name:<44} error: no such file")
            continue
        if not is_image(f):
            print(f"{name:<44} skipped: not an image")
            continue
        try:
            row = [ground_offset(f), mass_offset(f), saturation(f)]
            g, m, s = ["-" if v is None else v for v in row]
            print(f"{name:<44} {g:>8} {m:>8} {s:>7}")
        except Exception as e:
            bad += 1
            print(f"{name:<44} error: {e}")
    return 1 if bad else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
