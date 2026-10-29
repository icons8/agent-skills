"""Inspect an SVG before animating: lists every filled shape with index, colour and bbox,
and writes <name>_labels.png (render with red index numbers) to identify parts.
usage: python inspect_svg.py art.svg [out_dir]"""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from lot import load_paths, svg_size, bbox
import cairosvg
from PIL import Image, ImageDraw

src = sys.argv[1]; out = sys.argv[2] if len(sys.argv) > 2 else '.'
name = os.path.splitext(os.path.basename(src))[0]
P = load_paths(src); W, H = svg_size(src)
print(f'{name}: canvas {W}x{H}, {len(P)} filled shapes (SVG paint order: later = on top)')
px = 1200
cairosvg.svg2png(url=src, write_to=os.path.join(out, f'{name}_src.png'), output_width=px, background_color='white')
im = Image.open(os.path.join(out, f'{name}_src.png')).convert('RGB'); d = ImageDraw.Draw(im); k = px / W
for i, p in enumerate(P):
    x0, x1, y0, y1 = bbox(p)
    print(f'{i:3d} {p[1]}  x {x0:6.0f}-{x1:<6.0f} y {y0:6.0f}-{y1:<6.0f}')
    d.text(((x0 + x1) / 2 * k, (y0 + y1) / 2 * k), str(i), fill=(230, 0, 0))
im.save(os.path.join(out, f'{name}_labels.png'))
print('wrote', os.path.join(out, f'{name}_labels.png'))
