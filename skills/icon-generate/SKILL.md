---
name: icon-generate
description: Draw a missing icon as SVG in the style of the project's Icons8 pack, with the pack's own icons open as references. Use when the locked pack has no icon for a concept after one filtered search and one reworded search, or when the user asks to draw or generate an icon in the Icons8 style. Keeps the screen on one pack instead of borrowing from a second pack or falling back to an emoji, marks the result as generated in icons8.json and names it in the report. Refuses brand logos, trademarks and characters from films, games and anime, and says where to get those instead.
---

# Draw a missing icon

Any pack misses two of the ~40 concepts a screen needs. When the `icons8` skill comes up empty,
there are two bad ways out: an icon from a second pack, which is the one mismatch users notice, or
an emoji. This skill is the third way: draw the icon yourself, in the locked pack's style, with
that pack's icons open in front of you. It costs a few free PNG downloads and one SVG of output.
No Icons8 call is paid for.

A drawn icon is yours, not the catalogue's. Say so every time: in the lock and in the report.

## When to draw

Draw only when one of these is true:

- **The pack has no icon for the concept.** You searched it once with `platform` set to the locked
  pack, reworded it once (the `icons8` skill has the vocabulary map), and nothing fits: zero
  results, only logos, only metaphors its rejection rules throw out, or only neighbours. A
  neighbour is an object from the same field that is not the concept: a stethoscope for
  "patient intake", a plain padlock for "two-factor login", a generic camera for "face scan". An icon fits
  when people already read that drawing as the concept (a bell for notifications), not when it
  merely sits near it.
- **The user asks for it**: "draw an icon for…", "generate an icon in the Icons8 style".

Do not draw:

- **An icon the pack has.** Search first, always. A catalogue icon beats your drawing.
- **A brand logo or trademark** (CapCut, Slack, Visa). Search the brand name in the pack: Icons8
  carries logos in many packs, category `Logos`. If it is not there, take the brand's official
  asset from its press kit or brand page. A redrawn logo is a trademark problem, not a style
  problem.
- **A character** from a film, a game, anime or a comic (Naruto, Mario, Elsa). Same answer: a
  licensed asset from the rights holder. If the screen only needs the category, draw the generic
  concept instead ("anime", "game controller") and say why.
- **An illustration.** Hero art, empty states and anything above ~128 px is the `ouch` skill.

When you refuse, say what you will not draw, why in one line, and where to get it.

## The steps

**1. Pick the pack and the canvas.** The pack is `icons.pack` in `icons8.json`. No lock and the user
asked for "Icons8 style"? Ask which pack, or pick one by the context table in the `icons8` skill
and write the lock. The canvas is the pack's recommended size, square:

| Pack | viewBox |
| --- | --- |
| `ios7`, `ios_filled` | `0 0 50 50` |
| `color`, `fluency`, `pulsar-color`, `liquid-glass` | `0 0 48 48` |
| `m_outlined`, `androidL`, `m_rounded`, `m_sharp`, `m_two_tone`, `fluent-systems-regular`, `fluent-systems-filled`, `forma-*`, `plumpy` | `0 0 24 24` |
| `ios11` | `0 0 30 30` |
| `win10` | `0 0 32 32` |
| `p1em`, `tiny-glyph` | `0 0 16 16` |

Any other pack: `list_platforms` gives `recommendedSize`; use it for both sides of the viewBox.

**2. Collect 4-5 references from the same pack, as PNG.** The URL is free and needs no MCP call:
`https://img.icons8.com/?id=ID&format=png&size=100`. Take:

- 1-2 icons from the search that came up empty, the nearest in meaning. They show how this pack
  draws the parts you need (a pin, a person, a shield).
- 3 plain anchors that show the pack's hand: icons already in `icons.items` first (your icon will
  sit next to them), then `home`, `user`, `calendar`, `trash` with
  `search_icons(query=…, platform=<pack>, amount=1)`. Not `settings`: in `ios7` its first hit is
  the Apple logo.

Download them into a temporary folder, not the project, as `ref-1.png`, `ref-2.png` and so on,
and look at every one. If you cannot view
images in this client, say so in the report: the icon then matches the pack by its numbers only.

For a color pack, read the palette instead of guessing it, when ImageMagick is there:
`magick ref-1.png -background white -alpha remove +dither -colors 6 -unique-colors txt:-` lists the
main colors of one reference; the near-white one is the background.

**3. Draw one `<svg>`.** Match the references, in this order:

1. Fill or outline. An outline pack gets outlines, a glyph pack gets solid shapes.
2. Stroke weight relative to the canvas. Measure it on a 100 px reference and scale: a 4 px line on
   a 100 px PNG of a 50-unit pack is `stroke-width="2"`.
3. Padding: how much empty margin the references leave around the drawing, and how much of the
   canvas the shape fills.
4. Corners, line caps and joins: round or square, as the references have them.
5. Level of detail. Count the parts in the references and stay at or under that count.
6. Color. A monochrome pack uses only `currentColor`, for both `fill` and `stroke`, so CSS sets the
   color. A color pack uses the palette from its references and nothing else.

Pick the simplest metaphor a person who searched the word would recognise at 24 px. One object
beats a scene; two objects is the limit (a person plus a badge, a document plus a check).

The file is one `<svg xmlns="http://www.w3.org/2000/svg" viewBox="…">` with paths and basic shapes.
No `<text>`, no letters unless the concept is a letterform, no `<image>` or embedded raster, no
comments, no `<script>`, no external references, no fixed `width` and `height`. A `<mask>`,
`<clipPath>` or gradient gets an id prefixed with the concept (`headcount-cut`, not `m`): two
inlined icons with the same id break each other.

**4. Look at it next to the references.** If `rsvg-convert`, `magick` or a browser is available,
render it and compare on one sheet:

```bash
rsvg-convert -w 100 -h 100 icon.svg -o icon.png
magick montage ref-*.png icon.png -tile x1 -geometry 100x100+12+12 compare.png
```

Read `compare.png`. Fix once if something is plainly off: a heavier or thinner line, a tighter or
looser margin, more detail than its neighbours. Then stop: a second round of tweaks seldom helps.
Nothing to render with? Say so in the report.

**5. Write the file and the lock.** Save it as `assets/icons/<concept>.svg`, or in the folder where
the project already keeps its icon files. Then add the item to `icons8.json`:

```json
"items": {
  "settings": { "id": "82535", "commonName": "settings" },
  "heat-pump": { "generated": true, "file": "assets/icons/heat-pump.svg", "pack": "ios7" }
}
```

No `id` and no `commonName`: there is no catalogue icon behind it, and an id is never invented.
`pack` records the style it was drawn in, so a later pack change shows which drawings to redo.
Leave every other field of the lock as you found it.

**6. Use it like any icon of the set.** Inline the SVG or reference the file at one of the sizes in
`icons.sizes`. A screen still on PNG previews renders them black, while an inlined monochrome SVG
takes the text color: give the PNG URLs the same color with `&color=<hex>`, or set `color` on the
SVG to match them. A generated icon never animates: there is no Lottie for it.

## What to hand back

Name every drawn icon, apart from the catalogue picks:

| Concept | File | Pack | Source |
| --- | --- | --- | --- |
| heat pump | `assets/icons/heat-pump.svg` | `ios7` | drawn by the agent, not from the Icons8 catalogue |

Add what you could not check (no renderer, no image viewing), and offer to swap each one for the
catalogue icon once the pack has it. The next session that touches the screen searches the concept
once more; if the pack now has it, it replaces the drawing and drops `generated` from the lock.
