# Layout measurements

The numbers behind steps 5 and 6 of the skill. Every figure here was taken in
a real browser or with `scripts/measure.py`; the rules in `SKILL.md` are the
short form.

## Proportions inside one style

One search in `3d-casual-life` returned 456×301, 238×456, 456×256 and 405×456.
Coverage is often two to four candidates per slot, so filtering candidates by
ratio empties the shortlist. Four test runs tried to filter and every one of
them shipped a mixed row anyway. Shape is fixed in the layout: one box height
per row or per set, artwork centred inside it, `object-fit: contain`.

## `max-height: 100%` versus a repeated number

Measured in a browser inside a 180 px box:

| CSS on the `<img>` | 269×563 illustration rendered as | Row |
| --- | --- | --- |
| `max-height: 100%` | 262×548, covering the heading under it | broken |
| `max-height: 180px` | 86×180 (and the other three: 257×180, 180×180, 211×180) | level, nothing cropped |

Percentage heights on SVG fail silently; the page looks broken only after you
render it.

## `max-height` never upscales

Intrinsic sizes of served files vary from ~60 px to 1000 px with no relation to
the artwork's importance (a `cherry` hero came as 85×109, a companion piece as
61×134). When the file is smaller than its box, `max-height` leaves it small:
the 85×109 hero rendered 109 px tall inside a 340 px box and the row read as
broken. So the rule is per image: larger than the box, `max-height: <box>px`;
smaller than the box, an explicit `height: <box>px` or a width. Both size
failures in testing were caught only by looking at a render, never by reading
the CSS.

## 3D artwork is not centred by its own box

The file is cropped tight, so the box centre sits in the middle of pixels, not
in the middle of the object: a render carries a shadow and a ground contact
that pull the mass down, or floats the object high. Measured on eight works
from `3d-casual-life` and `3d-enterprise`, the centre of mass sits up to 14% of
the frame away from the centre of the box: −14.1%, −12.5%, +10.2% vertically,
and −7.7% horizontally on one. In a row of cards that reads as "one of them
slipped".

## Ground line, not centre of mass

Objects that sit on a surface (a pack, a box, a calendar, a phone) line up by
their bottoms, and the bottom is a stable statistic. The centre of mass is not:
anything detached from the main object drags it. Measured on a coffee pack with
beans flying above it, the centroid asked for a 14.2% nudge while the bottoms
of the same three step illustrations were already within 5 points of each
other. A run that followed the centroid over-corrected and had to catch it in
a render. So: bottoms for anything that stands, centroid only for subjects
that genuinely float (a balloon, an abstract shape, a character mid-air).

## Every set is a row, and every member gets normalised

A run nudged the three desktop cards and left the pair of phone screens
untouched, because the brief only used the word "row" for the cards. If a
reader sees pictures together, they are a row.

Inside a row, measure every picture and nudge each one by its own offset so
all masses (or bottoms) land on the same line. At a 200 px box:

```
appraisal −16.4% → translateY(+32.8px)
vault      +8.8% → translateY(−17.6px)
transit    −3.2% → translateY(+6.4px)    ← small, but the row needs it too
```

Skipping the small one is what a blind review caught: two cards were pulled to
a common line, the third was left at 3.2% because it was "under the threshold",
and it became the one that read as slipped. A threshold only makes sense for a
single picture standing alone. Flat and line styles rarely need any of this;
every style with a drop shadow does.

## One style id is not one look

Measured inside `little`: two picks came back effectively monochrome (mean
saturation 0.04 and 0.06) next to three coloured ones (0.50 to 0.59), and a
blind reviewer called the set "split in half". Styles hold both plain-ink and
duotone drawings, and there is no recolour tool to fix it afterwards. The
thresholds in the skill, under 0.10 next to over 0.35, are calibrated against
the formula in `scripts/measure.py` (black pixels stay in the denominator);
gates and skill import the same function so they cannot drift apart again.

The number only catches the gross split: four blue icons and one steel-grey one
measure alike and still read as two sets. After the number, look at hue
family, accent and amount of colour per picture.

## Register: figures versus objects

Equal box heights do not equalise scale. A full-length human figure and a
single object, both fitted to a 200 px box and both filling their frame, still
read at different scales: the figure shrinks its own head to fit while the
object keeps its bulk. Measured on a real pair, both occupied 0.99 of the frame
and still looked mismatched. Decide the register up front, all figures or all
objects, and hold it across the set; mixing them cannot be fixed in CSS.
