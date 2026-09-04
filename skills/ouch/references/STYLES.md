# Which style for which job

The MCP catalog holds **345 styles**. Two things follow from that: nobody can
choose from a list that long, and the choice has to be made once for the whole
project.

## Resolve the id first

Pass `style` as the exact `pretty_id` from `list_illustrations_styles`. A
partial or invented value does not raise an error, it returns
`{"total": 0, "illustrations": []}` — which reads like an empty catalog and
sends you looking for a different subject instead of a different id.
Measured: `style="3d"` returns zero, `style="3d-casual-life"` returns 30 for the
same query.

The list is paginated (`limit`, `page`, default 50). Names in this file are a
map, not the source of truth: if a style is missing from the API response, it is
gone whatever this file says.

## The first tier

43 styles picked by the Icons8 side as the ones worth reaching for first. This
is a taste call from the people who own the catalog, not a measurement: treat it
as the shortlist you start from, not as a fence.

**How to use it.** Build the candidate list for a brief out of these. Going
outside is allowed and sometimes right, but it needs a reason you can name: no
first-tier style covers the slots, or the brief asks for a look none of them
has. Write that reason in the run notes.

Counts verified against the API on 2026-09-04; `pretty_id` is what
`search_illustrations` expects.

| `pretty_id` | Title | Count | Free | Animated flag |
| --- | --- | --- | --- | --- |
| `3d-casual-life` | 3D Casual life | 2653 | | yes |
| `3d-business` | 3D Business | 1487 | | yes |
| `journal` | Journal | 1001 | | yes |
| `transistor` | Transistor | 949 | | yes |
| `3d-glassy` | 3D Glassy | 813 | | yes |
| `beam` | Beam | 727 | | yes |
| `notion-line-art` | Notion Line Art | 625 | | |
| `kindy` | Kindy | 532 | | |
| `3d-hygge` | 3D Hygge | 409 | | yes |
| `airy` | Airy | 401 | | yes |
| `mochi` | Mochi | 328 | | yes |
| `3d-stickle` | 3D Stickle | 317 | | yes |
| `burst` | Burst | 313 | | |
| `company` | Company | 302 | | |
| `marks` | Marks | 284 | | |
| `weekday` | Weekday | 270 | | yes |
| `concept` | Concept | 259 | | |
| `sketchbook` | Sketchbook | 241 | | yes |
| `organic` | Organic | 234 | | |
| `network` | Network | 234 | | yes |
| `anthropic-claude-hand-drawn` | Anthropic Claude Hand Drawn | 212 | | yes |
| `ballpoint-pen` | Ballpoint Pen | 210 | | |
| `twirl` | Twirl | 202 | | |
| `willowy` | Willowy | 171 | | |
| `bold-people` | Bold People | 148 | | |
| `black-chalk` | Black Chalk | 123 | | |
| `flare` | Flare | 120 | | |
| `grain` | Grain | 113 | | |
| `tint` | Tint | 111 | | |
| `scribbles` | Scribbles | 99 | **free** | yes |
| `3d-plush-icons` | 3D Plush icons | 98 | | |
| `3d-techny` | 3D Techny | 84 | | yes |
| `rough-sketch` | Rough Sketch | 79 | | |
| `watercolor-sketch` | Watercolor sketch | 79 | | |
| `3d-blueprint` | 3D Blueprint | 73 | | |
| `3d-isometric-1` | 3D Isometric | 50 | | yes |
| `3d-plastic` | 3D Plastic | 48 | | |
| `3d-airy` | 3D Airy | 43 | | yes |
| `open-doodles` | Open Doodles | 37 | **free** | yes |
| `3d-kindy` | 3D Kindy | 35 | | |
| `3d-rondi` | 3D Rondi | 31 | | yes |
| `3d-product` | 3D Product | 28 | | |
| `cole` | Cole | 27 | | |

Three names are easy to get wrong: it is `anthropic-` not `antropic-`,
`scribbles` not "skribbles", and `3d-plush-icons` not "3d-plush". Also note
`airy` (401) and `3d-airy` (43) are two different styles, and `3d-isometric-1`
is the small 3D one, while plain `isometric` (772) is a different, older style
outside the tier.

Only two of these are free-tier, and both are small: for a public repo the tier
will usually not be enough, and `cherry` or `fogg-5` come in from outside it.

Half the tier carries `animated: true`. That flag means the style has animated
versions somewhere in Ouch; the MCP returns static files only, so it changes
nothing about what you can ship.

## Start from the surface, not from the popularity list

The shortlist below ranks styles by demand. Demand is not fitness: the styles
that sell best are 3D marketing art, and picking one for a docs page or a dark
slide is how testing produced a colourful docs page and an invisible phone.

First-tier candidates come first in each row; the styles after the semicolon sit
outside the tier and are the fallback when coverage or contrast rules the tier
out. Names in **bold** are the ones this skill has actually been run against;
the rest are candidates the gates still have to confirm.

| Surface | Take from | Avoid |
| --- | --- | --- |
| Docs, help centre | **`notion-line-art`**, `marks`, `black-chalk`, `ballpoint-pen`; outside: `system`, `graphite`, `line` | colour-saturated flat (`little`, `cherry`), all 3D |
| Product UI states | `concept`, `tint`, `organic`, `burst`; outside: **`little`**, **`neat`**, `plain`, `system` | busy scenes, crowds |
| Dark backgrounds, decks | **`3d-glassy`**, `3d-airy`, `mochi`, `flare`; outside: **`quantum`**, `3d-boost`, `bright` | line art of any kind, dark-object 3D, `midnight` (it is line art for light pages, the name lies) |
| Marketing landing | **`3d-casual-life`**, `3d-business`, **`journal`**, `beam` | thin line art |
| Slide deck | **`3d-glassy`**, `3d-plastic`, `3d-plush-icons`; outside: **`quantum`** | thin strokes, fine hatching |
| Public repo, free tier | `scribbles`, `open-doodles` (tiny); outside: **`cherry`**, `fogg-5` (the only two big enough) | everything paid |
| Extending a page | the exact style already there | a neighbouring style that "looks close" |

Rule for dark grounds: judge by the artwork, not the style name. Download one
file, drop it on the real background, look. Reject anything whose main object is
dark grey, black or navy, and anything built from thin dark strokes.

## The shortlist

Counts are illustrations available through the MCP. Downloads and trend are
Icons8 internal figures for 12 months to June 2026, where we have them: they say
what sells, the count says what you can actually pull.

| `pretty_id` | Title | In MCP | Downloads | Trend | Use it for |
| --- | --- | --- | --- | --- | --- |
| `3d-casual-life` | 3D Casual life | 2653 | 10 491 | −33% | the safe default: people and objects, warm, broad coverage |
| `3d-business` | 3D Business | 1487 | 4 110 | −32% | offices, finance, literal business scenes |
| `3d-glassy` | 3D Glassy | 813 | 5 102 | −13% | premium feature blocks and pricing |
| `3d-enterprise` | 3D Enterprise | 439 | 4 454 | **+349%** | B2B and corporate, the fastest growing paid style |
| `3d-stickle` | 3D Stickle | 317 | 4 452 | +64% | playful 3D, onboarding and empty states |
| `journal` | Journal | 1001 | 3 434 | −27% | editorial, blog headers, long-form |
| `neat` | Neat | 1059 | 1 555 | +10% | clean flat scenes for dense pages |
| `isometric` | Isometric | 772 | 1 785 | −44% | dashboards and system diagrams |
| `little` | Little | 770 | 1 601 | −24% | small spot scenes next to text |
| `3d-playful` | 3D Playful | 742 | 1 135 | +222% | consumer apps, games, kids |
| `techny` | Techny | 502 | 2 111 | −26% | flat technology pages |
| `3d-techny` | 3D Techny | 84 | 2 349 | +16% | technology in 3D; strong demand, thin catalog |
| `3d-hygge` | 3D Hygge | 409 | 1 381 | −18% | soft, domestic, wellness |
| `social` | Social | 618 | 492 | **+696%** | community and social pages |
| `quantum` | Quantum | 851 | 581 | +412% | abstract tech, backgrounds |
| `clip` | Clip | 2152 | 1 259 | −11% | spot illustrations, large catalog |
| `3d-fluency` | 3D Fluency | 2229 | 7 180 | **−80%** | Microsoft-style objects and brand logos; see the warning below |

Styles with large catalogs but no download history of their own to lean on:
`flame` (2181), `taxi` (1682), `urban` (1289), `urban-line` (1277),
`marginalia` (1255), `pablo-1` (1129), `abstract` (1060), `kingdom` (1050),
`juicy` (1043), `pablita` (1041), `sammy` (1032), `cyborg` (1011).
They are fine picks when the brief calls for their look; just verify coverage of
your slot list before locking one.

New arrivals worth knowing (small but current): `anthropic-claude-hand-drawn`
(212, animated), `notion-line-art` (625), `3d-pro` (374), `watercolor-sketch`
(79), `rough-sketch` (79), `ballpoint-pen` (210).

**Premium and corporate styles are thinner than their reputation.**
`3d-glassy` (813) and `3d-enterprise` (439) look like the obvious answer for an
expensive product, and in testing both came up empty on ordinary subjects
(appraisal, vault, shipping) before the run fell back to `3d-pro` (374), which
covered all of them. Treat the tone table as a first guess and let the coverage
check decide: for a premium brief, shortlist `3d-glassy`, `3d-pro`, `lucent`
and `graphite` together rather than committing to the most obvious name.

## The free tier is 15 styles, and only two are big

`free_distribution: true` styles, complete list from the API:

| `pretty_id` | Title | In MCP |
| --- | --- | --- |
| `cherry` | Cherry | 1313 |
| `fogg-5` | Fogg | 724 |
| `bouncy` | Bouncy | 285 |
| `scribbles` | Scribbles | 99 |
| `metallic` | Metallic | 84 |
| `biomorphic` | Biomorphic | 71 |
| `fluid` | Fluid | 71 |
| `gummy` | Gummy | 71 |
| `pixeltrue` | Pixeltrue | 65 |
| `pixeltrue-icons` | Pixeltrue icons | 57 |
| `3d-blocks` | 3D Blocks | 40 |
| `open-doodles` | Open Doodles | 37 |
| `delesign` | Delesign | 35 |
| `vitrum` | Vitrum | 32 |
| `textures` | Textures | 21 |

Only `cherry` and `fogg-5` are large enough to dress a whole page. Everything
else runs out after a few slots.

Do not turn `free_distribution: false` into a licence warning. For a subscriber
paid work is the ordinary case, and every format comes down normally: SVG where
the artwork is vector, PNG up to 3000px. Say which tier the asset came from and
move on.

What the flag does change: on an account **without** an active subscription,
paid originals are refused ("needs an Icons8 sign-in") while the free tier keeps
working. If that happens, report the subscription instead of quietly retreating
to a free style the brief did not ask for.

## Rules that come out of the numbers

**One style per project.** Mixing is more visible than with icons: palette, line
weight and level of detail change at once. Write the choice into `ouch.json` and
keep to it.

**Check coverage before locking.** A style's headline count says nothing about
your slots: `3d-casual-life` holds 2653 illustrations but only 30 answer
`empty`. Run one search per slot against the candidate before committing.

**Simple beats elaborate.** The most downloaded works of the year are single
objects (glass star, megaphone, check mark, rocket) and plain human poses, not
multi-character scenes. On a tie, take the simpler one.

**Do not build on a collapsing style.** 3D Fluency is down 80% year on year and
is packed with social-network logos: the single most downloaded illustration of
the year is a 3D WhatsApp logo. Those logos surface in unrelated searches, and a
brand logo is not an illustration for your feature block.

**3D is what paying customers use**, and 3D Enterprise is where the growth is.
For a human, not-machine-made tone the current options are the hand-drawn and
sketch styles, all of them small: check coverage first.

## Sizing and shape

- Prototype on `preview.url`: public webp, 30-66 KB, permanent, no second call.
- **Aspect ratios vary inside one style.** Measured in a single search against
  `3d-casual-life`: 456×301, 456×430, 456×456, 238×456, 456×376, 374×456,
  405×456, 456×256, 456×291. The long side is capped at 456, the other side is
  whatever the artwork is. Read `preview.width/height` and pick candidates that
  share a shape, or the feature row will look broken even in one style.
- Below ~200 px a scene turns to mud. A simple single object still reads down
  to ~64 px (docs spots, per the surface table); below that use an icon.
- `animated: true` exists on styles and as a search filter, but no tool returns
  an animated file. Do not promise animation.
