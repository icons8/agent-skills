"""Verify a looping Lottie: render every frame with Skottie, then
  - contact sheet of chosen frames  -> <name>_sheet.png   (look at it!)
  - loop seam: |last-first| should be no bigger than a normal |last-prev| step
  - fidelity: rest frame vs the source SVG (mean abs pixel diff, ~0-1 = identical art)
  - GIF preview -> <name>_preview.gif
usage: python check.py anim.json [--svg art.svg --rest N] [--frames 0,12,30] [--width 500]
Needs NODE_PATH pointing at a node_modules with canvaskit-wasm (see the tools command of the skill)."""
import sys, os, glob, json, subprocess, argparse, shutil
import numpy as np
from PIL import Image

ap = argparse.ArgumentParser()
ap.add_argument('json'); ap.add_argument('--svg'); ap.add_argument('--rest', type=int)
ap.add_argument('--frames'); ap.add_argument('--width', type=int, default=500)
a = ap.parse_args()
name = os.path.splitext(os.path.basename(a.json))[0]
fdir = f'frames_{name}'
shutil.rmtree(fdir, ignore_errors=True)
here = os.path.dirname(os.path.abspath(__file__))
subprocess.run(['node', os.path.join(here, 'render.js'), a.json, fdir, str(a.width), 'all'], check=True)
fs = sorted(glob.glob(f'{fdir}/f*.png'))
doc = json.load(open(a.json, encoding='utf-8'))
def shapes_animated(l):
    return '"a": 1' in json.dumps(l.get('shapes', []))
static = [l['nm'] for l in doc['layers'] if not l.get('td') and not shapes_animated(l) and not l.get('tm') and
          not any(isinstance(v, dict) and v.get('a') == 1 for v in l['ks'].values()) and not l.get('hasMask')]
print('static layers:', ', '.join(static) if static else 'none',
      '<- make sure each of these is MEANT to stay still')
A = lambda f: np.asarray(Image.open(f).convert('RGB'), float)
seam = abs(A(fs[-1]) - A(fs[0])).mean(); step = abs(A(fs[-1]) - A(fs[-2])).mean()
ok = seam <= max(step * 1.5, 0.05)
diffs = [abs(A(fs[i]) - A(fs[(i + 1) % len(fs)])).mean() for i in range(len(fs))]
run = best = 0
for d in diffs + diffs:
    run = run + 1 if d < 0.01 else 0; best = max(best, run)
best = min(best, len(fs))
print(f'longest fully still stretch: {best} frames ({best / json.load(open(a.json, encoding='utf-8'))["fr"]:.2f} s)'
      + ('  <- too long, reads as frozen (keep <= ~12 f)' if best > 12 else ''))
print(f'frames {len(fs)} | seam {seam:.2f} vs step {step:.2f} -> {"OK" if ok else "JUMP at loop point!"}')
# frame-edge check: nothing may leave the comp. Skottie clips to the comp, so render a copy whose
# comp is 30% bigger with everything shifted into the middle, then look for ink outside the original rect.
big = json.load(open(a.json, encoding='utf-8')); M = 0.15; mx, my = round(big['w'] * M), round(big['h'] * M)
big['w'] += 2 * mx; big['h'] += 2 * my
for l in big['layers']:
    if 'parent' not in l: l['parent'] = 99999
big['layers'].append({"ddd": 0, "ind": 99999, "ty": 3, "nm": "edge-check offset", "sr": 1, "ip": 0, "op": big['op'], "st": 0,
                      "bm": 0, "ks": {"a": {"a": 0, "k": [0, 0, 0]}, "p": {"a": 0, "k": [mx, my, 0]},
                      "s": {"a": 0, "k": [100, 100, 100]}, "r": {"a": 0, "k": 0}, "o": {"a": 0, "k": 100}}})
json.dump(big, open('_edge.json', 'w', encoding='utf-8', newline=''))
bdir = f'frames_{name}_edge'; shutil.rmtree(bdir, ignore_errors=True)
subprocess.run(['node', os.path.join(here, 'render.js'), '_edge.json', bdir, '650', 'all'], check=True, stdout=subprocess.DEVNULL)
worst = (0, None)
for f in sorted(glob.glob(f'{bdir}/f*.png')):
    im = np.asarray(Image.open(f).convert('L'), float); h_, w_ = im.shape
    px, py = round(w_ * mx / big['w']), round(h_ * my / big['h'])
    out = im.copy(); out[py:h_ - py, px:w_ - px] = 255
    n = int((out < 245).sum())
    if n > worst[0]: worst = (n, os.path.basename(f))
shutil.rmtree(bdir, ignore_errors=True); os.remove('_edge.json')
print('frame edge:', 'OK — nothing leaves the frame' if worst[0] == 0 else f'CUT OFF at the frame edge — {worst[0]} px outside the comp at {worst[1]}')
if a.svg is not None and a.rest is not None:
    import cairosvg
    f = Image.open(fs[a.rest]).convert('RGB')
    cairosvg.svg2png(url=a.svg, write_to='_ref.png', output_width=f.width, background_color='white')
    r = Image.open('_ref.png').convert('RGB').resize(f.size)
    diff = abs(np.asarray(r, float) - np.asarray(f, float)).mean()
    print(f'rest frame {a.rest} vs source: {diff:.2f} ({"matches" if diff < 1.5 else "DIFFERS — check paint order / missing shapes"})')
    os.remove('_ref.png')
pick = [int(x) for x in a.frames.split(',')] if a.frames else \
    sorted(set([0] + [round(len(fs) * k / 6) for k in range(1, 6)] + [len(fs) - 1]))
ims = [Image.open(fs[i]).convert('RGB') for i in pick]
tw = 300; th = round(tw * ims[0].height / ims[0].width)
sheet = Image.new('RGB', (tw * len(ims), th), 'white')
for k, im in enumerate(ims):
    sheet.paste(im.resize((tw, th)), (k * tw, 0))
sheet.save(f'{name}_sheet.png'); print('sheet', f'{name}_sheet.png', 'frames', pick)
fr = json.load(open(a.json, encoding='utf-8'))['fr']
pal = [Image.open(f).convert('P', palette=Image.ADAPTIVE) for f in fs]
pal[0].save(f'{name}_preview.gif', save_all=True, append_images=pal[1:], duration=round(1000 / fr), loop=0, disposal=2)
print('gif', f'{name}_preview.gif')
