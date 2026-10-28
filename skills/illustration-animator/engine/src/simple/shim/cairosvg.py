# env shim: no cairo DLL on Windows -> render SVG with PyMuPDF (same call signature as cairosvg.svg2png)
# url + write_to: a file with a background (his check and inspect scripts); bytestring: PNG bytes with an alpha channel (his masks)
import re
import fitz
def svg2png(bytestring=None, url=None, write_to=None, output_width=None, background_color=None, **kw):
    doc = fitz.open(stream=bytestring, filetype='svg') if bytestring is not None else fitz.open(url)
    page = doc[0]
    w = output_width
    if w is None and bytestring is not None:
        m = re.search(rb'<svg[^>]*?\swidth="([\d.]+)"', bytestring)
        if m: w = float(m.group(1))
    z = (w / page.rect.width) if w else 1.0
    pix = page.get_pixmap(matrix=fitz.Matrix(z, z), alpha=background_color is None)
    if write_to: pix.save(write_to)
    else: return pix.tobytes('png')
