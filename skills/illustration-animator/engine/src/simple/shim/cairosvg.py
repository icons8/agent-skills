# Stand-in for cairosvg.svg2png, always first on the path: renders with resvg (package resvg-py, MIT; resvg is MIT or Apache-2.0),
# so neither cairosvg nor the Cairo library is needed;
# same call signature. url + write_to: a file with a background (the module's check and inspect scripts);
# bytestring: PNG bytes with an alpha channel (the module's masks)
import resvg_py
def svg2png(bytestring=None, url=None, write_to=None, output_width=None, background_color=None, **kw):
    if bytestring is None:
        with open(url, 'rb') as f:
            bytestring = f.read()
    svg = bytestring.decode('utf-8') if isinstance(bytestring, bytes) else bytestring
    opt = {}
    if output_width:
        opt['width'] = int(round(output_width))
    if background_color:
        opt['background'] = background_color
    png = bytes(resvg_py.svg_to_bytes(svg_string=svg, **opt))
    if write_to:
        with open(write_to, 'wb') as f:
            f.write(png)
    else:
        return png
