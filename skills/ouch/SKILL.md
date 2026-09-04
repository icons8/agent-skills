---
name: ouch
description: Choose and ship Icons8 illustrations (Ouch!) through the Icons8 MCP so a deliverable ends up with pictures that are about the product, read as one set, and can legally and technically be published. Use when a landing page, app screen, empty state, onboarding, 404, docs page, slide deck or project site needs illustrations, when the user mentions Ouch, Icons8 illustrations or a style by name, and when extending or auditing illustrations already in a file. For small symbols in buttons, menus, toolbars and tables use the `icons8` skill instead.
---

# Icons8 illustrations

A picking skill. It turns a brief into a set of illustrations that survives a
designer's review: right subject, one family, shippable files. It does not pick
icons (that's `icons8`) and does not design the page around them.

## Operating posture

You are the designer choosing artwork for someone else's product. The bar: a
person who knows that product looks at the page and says "yes, that's ours".
Generic correctness is not the bar. An empty state that is technically an empty
state but shows a browser window on an app about houseplants fails.

Three failure modes, worst first:

1. **The picture is about the interface, not about the product.** This is the
   one that gets through review unnoticed and is the most common failure in
   testing. The slot is "empty plant list"; the answer is an empty pot, a bare
   shelf. It is not a plant (the heading says there are none), not a generic
   empty box, and definitely not an empty browser window.
2. **The file cannot be shipped.** The permanent link is watermarked; the clean
   link dies in an hour. Get this wrong and the page is unpublishable, however
   good the picks.
3. **The set does not read as a set.** Mixed shapes in one row, mixed drawing
   manner, the same picture used for two different states.

Never present a menu of options. Pick, say why in one line, move on.

## Hard rules

1. **Never invent an id or a style `pretty_id`.** Both come from tool responses.
   A wrong style returns `{"total": 0}` with no error, which looks exactly like
   a subject that does not exist.
2. **Every slot query carries the product's own noun.** `empty` + `plant`,
   `offline` + `warehouse`, `invoice` + `payment`. State alone is not a query.
   **Except where the state is an absence** — of content or of connectivity.
   "Nothing here yet", offline and 404 are settled conventions: an empty box,
   an empty shelf, a dead wifi fan, the 404 numerals. Showing the product
   present contradicts the words next to it, and reviewers read that as a
   mistake, not as domain flavour. Tested: "No bikes added" got a person
   standing with a bicycle, and the bicycle is right there in the frame.
   For absence, obey the convention; put the product noun in the object that is
   missing (an empty bike rack, an empty plant pot), never in a happy owner.
   **Show the container, not the inhabitant.** "Your team is empty" is an empty
   seat, an empty invite card, an outlined placeholder; it is not one person,
   and a lone figure is no better than a crowd. Two independent runs shipped a
   single user under that heading and a blind reviewer failed both.
3. **Preview links never ship, and originals are never pulled for candidates.**
   `preview.url` is watermarked, so it is for choosing only; the clean file from
   `get_illustration_png_url` or `get_illustration_svg` goes into the project.
   Paid works count against the account's download allowance (free-tier ones do
   not), so fetch originals once, for the approved set. One sanctioned
   exception: the single download the contrast gate needs (step 4) when the
   background is not white.
4. **Shape is a layout problem, not a picking problem.** One fixed box per row
   plus `object-fit: contain`. Never crop or stretch artwork to match a
   neighbour.
5. **One illustration, one slot, and one motif.** Reusing the same artwork for
   two states is a defect even when both states are errors. Different ids are
   not proof of different pictures: the catalog holds near-twins with identical
   headings, and a blind reviewer reads "Calendar with marked days" in two slots
   as one picture used twice. Compare headings, not just ids.
6. **Test the style against the real background before locking it**, whenever
   the background is not white.
7. **Public or redistributable deliverable means `free_only=True`**, and the
   page says where the art came from.

## When rules collide

Resolve in this order, higher wins:

1. The file can be shipped: licence (`free_only` for public work) and format.
2. An existing page's style. Matching it beats everything below.
3. Subject coverage: the style must draw your slots.
4. Surface and contrast on the real background.
5. Tone.
6. The first tier.

A higher rule overriding a lower one is normal work, not a violation; name the
override in the run notes. Tested: the bakery run failed because tone (5) was
allowed to veto coverage (3).

## The sequence

### 1. Name the surface

Everything downstream follows from this. Pick one row.

| Surface | Style family | Size on screen | Disqualifies |
| --- | --- | --- | --- |
| Product UI, empty and error states | one flat or line style, simple single objects | 120-180 px | busy scenes, crowds, anything needing detail to read |
| Docs, help centre, changelog | monochrome or two-tone line art | 64-140 px | colour-saturated art, 3D, anything that outshouts a code block |
| Marketing landing, feature blocks | 3D or rich flat | 280-560 px | thin line art that disappears at hero size |
| Slide deck | solid filled shapes, high contrast | 300-600 px | thin strokes, fine hatching, small internal detail |
| Open-source or public repo page | free-tier styles only | any | anything with `free_distribution: false` |
| Extending an existing page | the style already on the page, nothing else | match what's there | a "close enough" neighbour style |

Tested consequence: on a docs page, a colourful flat style reads as marketing
even when every subject is right. On a dark deck, a style picked for its
business tone put a dark grey phone on a near-black slide.

**Then narrow by the voice the product speaks in.** The surface says how loud;
the tone says which family. Read the product's own copy before deciding: a
warm second-person landing and an enterprise security page are not the same
brief even when both are marketing.

Candidates before the semicolon are first tier (the curated shortlist in
`references/STYLES.md`); after it are fallbacks for when the tier does not cover
the slots. Leaving the tier is allowed, with the reason written into the run
notes.

**The "avoid" column is a preference, not a filter.** It ranks styles that all
have your subject. If the only styles drawing your subject sit in the avoid
column, they win: a warm bakery brief is better served by a 3D loaf than by a
sketch of a picnic basket that is not bread.

| Tone | Take from | Avoid |
| --- | --- | --- |
| Warm, human, informal | `anthropic-claude-hand-drawn`, `rough-sketch`, `watercolor-sketch`, `ballpoint-pen`, `black-chalk`, `scribbles`, `open-doodles` | polished 3D, glassy, anything that reads rendered |
| Neutral product voice | `concept`, `tint`, `organic`, `burst`, `company`; outside: `little`, `neat`, `plain`, `system` | painterly, ornate, heavy 3D |
| Corporate, enterprise | `3d-business`, `3d-blueprint`, `marks`, `network`; outside: `3d-enterprise`, `3d-pro`, `isotech` | playful and kids styles |
| Premium, high-ticket | `3d-glassy`, `3d-product`, `3d-plastic`, `grain`; outside: `lucent`, `graphite` | doodle, crayon, sketch |
| Playful, consumer, kids | `kindy`, `3d-kindy`, `mochi`, `3d-plush-icons`, `3d-rondi`; outside: `3d-playful`, `bouncy` | corporate 3D, line art |
| Developer-facing | `notion-line-art`, `network`, `marks`; outside: `line`, `system`, `isotech` | character scenes, mascots |

**Platform changes the complexity, not just the size.** On mobile the picture
lands at 120-180 px: one object, no crowds, no text inside the artwork, no
scenes that need reading. On desktop a hero at 280-560 px can hold a scene with
two or three actors. A deck at projector distance wants solid shapes and no
internal detail at all. Same style can serve all three; the pick inside it
cannot.

### 2. List the slots, each with its subject noun

Write the list before searching. Each line is `slot + product noun`:

```
empty plant list      → empty pot, bare shelf      (absence: container, no plant)
no search results     → magnifier + plant
offline               → wifi, disconnected         (connectivity convention)
photo upload failed   → plant photo, upload, error
```

The state-to-query translations live in `references/VOCABULARY.md` and the
slot kits per project type in `references/SLOTS.md`; open them before writing
the list.

Style choice depends on covering this whole list. A style that nails the hero
and has nothing for the failure states is the wrong style.

### 2b. If the product has a specific noun, find out who draws it first

Before shortlisting styles in step 3, run **one unfiltered search on the
product's noun** and
read the `styles` field of the results. That single call tells you which styles
actually carry the subject, and the shortlist starts from the intersection of
that list with the tone.

```
search_illustrations(query="bread loaf bakery", amount=6)   → 318 hits
→ styles seen: pablita, clip, burgundy, 3d-casual-life ×3
```

Skipping this is how a bakery app ends up with no bread in it. Tested failure: a
run took the tone table at its word ("warm and human, avoid polished 3D"),
checked fourteen styles that fit the tone, found bread in none of them, left the
tier for one more style without bread, and shipped a picnic basket, a trolley, a
bank card and a cardboard box. `3d-casual-life` is first tier, holds several
loaves, and was never tried, because the tone rule had already excluded it.

**Subject availability outranks the tone table.** Tone decides between styles
that have your subject; it does not get to veto the only styles that have it.
When they conflict, take the subject and say so in the run notes.

### 3. Shortlist styles, then resolve the exact id

`references/STYLES.md` opens with the **first tier**: 43 styles the Icons8 side
picked out of 345 as the ones worth reaching for first. Build the shortlist from
there, take two or three, call `list_illustrations_styles` to get exact
`pretty_id` values, and run one search per slot against each candidate. Count
hits, then commit.

The tier is a preference, not a fence. Two situations override it outright, and
both are correct:

- **An existing page already has a style.** Matching it beats the tier, always.
- **The deliverable must be redistributable.** The tier holds only two free
  styles, `scribbles` (99) and `open-doodles` (37), too small for a page, so a
  public repo usually lands on `cherry` or `fogg-5` from outside.

Otherwise go outside when no first-tier style covers the slots or when the brief
asks for a look none of them has. Either way name it in the run notes in those
words: which style, and which rule sent you outside the tier. Silently ignoring
the tier and silently obeying it are both wrong; the reason is the deliverable.

Coverage is per slot, not per style size: `3d-casual-life` holds 2653
illustrations and only 30 of them answer `empty`.

### 4. Contrast gate, when the background is not white

Before locking, look at one candidate on the real background:

| Background | Reject |
| --- | --- |
| Dark (below ~#2a2a2a) | artwork whose main object is dark grey, black or navy; thin dark outlines; line art built from black strokes |
| Coloured or brand-tinted | artwork whose dominant hue fights the ground |
| Photo or gradient | artwork with an opaque light rectangle behind it |

Download one file, put it on the actual background, and look. A style name
means nothing here: "Midnight" is line art for light pages.

### 5. Even out shape in the layout, not in the picking

Illustrations in one style come in every proportion: one search returned
456×301, 238×456, 456×256 and 405×456. Coverage is often two to four candidates
per slot, so filtering by ratio would leave you with nothing. Four test runs
tried to filter and every one of them ended up with a mixed row anyway.

So fix it where it is always fixable, in CSS:

```css
.slot-art { height: 180px; display: grid; place-items: center; overflow: hidden; }
.slot-art img { max-height: 180px; max-width: 100%; width: auto; object-fit: contain; }
```

**Repeat the number, do not write `max-height: 100%`.** Measured in a browser:
with the percentage version a 269×563 illustration rendered 262×548 inside a
180px box and covered the heading under it. With `max-height: 180px` the same
four illustrations came out 86×180, 257×180, 180×180 and 211×180, a level row
with nothing cropped. Percentage heights on SVG fail silently, and the page
looks broken only after you render it.

**And `max-height` never upscales.** Intrinsic sizes of served files vary from
~60 px to 1000 px with no relation to the artwork's importance. When the
file is smaller than its box, `max-height` leaves it small: measured, a hero
with intrinsic 85×109 rendered 109 px tall inside a 340 px box and the row
read as broken. So pick per image: artwork larger than the box gets
`max-height: <box>px`; artwork smaller than the box gets an explicit
`height: <box>px` (or a width). Then screenshot the page: both size failures
in testing were caught only by looking at a render, never by reading the CSS.

One box height per row or per set, artwork centred inside it. Then the row is
even whatever the catalog gave you.

**3D artwork is not centred by its own box.** The file is cropped tight, so the
box centre sits in the middle of pixels, not in the middle of the object: a
render carries a shadow and a ground contact that pull the mass down, or floats
the object high. Measured on eight works from `3d-casual-life` and
`3d-enterprise`, the centre of mass sits up to **14% of the frame** away from
the centre of the box (−14.1%, −12.5%, +10.2% vertically; −7.7% horizontally on
one). In a row of cards that reads as "one of them slipped".

**Align the ground line, not the centre of mass.** Objects that sit on a
surface (a pack, a box, a calendar, a phone) line up by their bottoms, and the
bottom is a stable statistic. The centre of mass is not: anything detached from
the main object drags it. Measured on a coffee pack with beans flying above it,
the centroid asked for a 14.2% nudge while the bottoms of the same three step
illustrations were already within 5 points of each other. A run that followed
the centroid over-corrected and had to catch it in a render.

So: bottoms for anything that stands, centroid only for subjects that genuinely
float (a balloon, an abstract shape, a character mid-air).

```
python3 scripts/measure.py assets/illustrations/*
# ships with this skill; per file: ground-line offset %, mass offset %, saturation
```

Do not re-derive the formulas inline: two hand-copied versions have already
drifted apart once. The script is the single source; the eval gates import
the same functions.

**Every set on the page counts as a row.** Two phone screens side by side, four
state mockups, three cards: if a reader sees them together, they are a row.
Tested failure: a run nudged the three desktop cards and left the pair of phone
screens untouched, because the brief only used the word "row" for the cards.

**In a set, normalise all of them, do not apply a threshold.** Measure every
picture in it, then nudge each one by its own offset so all masses land on
the same line. Skipping the small ones is what a blind review caught: two cards
were pulled to a common line, the third was left at 3.2% because it was "under
the threshold", and it became the one that read as slipped. A threshold only
makes sense for a single picture standing alone.

```
appraisal −16.4% → translateY(+32.6px)   ← at a 200px box
vault      +8.8% → translateY(−17.6px)
transit    −3.2% → translateY(+6.4px)    ← small, but the row needs it too
```

Flat and line styles rarely need this; every style with a drop shadow does.

Two things still belong to picking: prefer candidates whose ratio is closer to
the box when you have the choice, and never stretch or crop artwork to force a
shape.

### 6. Look at the set before you commit

Build one contact sheet from `preview.url` (free, no calls) and open it:

```html
<!-- sheet.html: each cell = <img src="PREVIEW_URL"> + heading + WxH -->
```

Check five things: every picture is about the product, no two pictures are the
same, the drawing manner is identical across the set, **every picture is the
same kind of subject**, and **every picture uses the same colour treatment**.

One style id is not one look. Measured inside `little`: two picks came back
effectively monochrome (mean saturation 0.04 and 0.06) next to three coloured
ones (0.50 to 0.59), and a blind reviewer called the set "split in half".
Styles hold both plain-ink and duotone drawings, and there is no recolour tool
to fix it afterwards, so the fix is to replace the odd ones at selection time.
Do not eyeball this, measure it. Near-grey and low-saturation colour look the
same on a contact sheet and different on the page:

```
python3 scripts/measure.py <files>   # same tool as step 5; saturation column
```

Run it over the set. A truly colourless work (under 0.10) next to a colourful
one (over 0.35) is a broken set, replace the odd one. A run that had this rule
in words still shipped such a set, so treat the number as the check, not the
intention.

The number only catches the gross split. Four blue icons and one steel-grey
one all measure alike and still read as two sets, so after the number, look:
same hue family, same accent, same amount of colour per picture. If one picture is doing a different job from the others
(an icon among characters, a scene among single objects), replace it.

That last one is not the same as equal box heights. A full-length human figure
and a single object, both fitted to a 200px box and both filling their frame,
still read at different scales: the figure shrinks its own head to fit while the
object keeps its bulk. Measured on a real pair, both occupied 0.99 of the frame
and still looked mismatched. So decide the register up front, all figures or all
objects, and hold it across the set. Mixing them cannot be fixed in CSS.

Selection happens entirely on previews, and previews are free: the link arrives
inside the search response, needs no second call and costs no download. Pulling
an original for a candidate you have not committed to is the one thing that
wastes the account's allowance.

### 7. Download the clean files, write the lock

One call per approved slot, save into the project, point the HTML at local
files.

| Need | Call | Result |
| --- | --- | --- |
| Flat, line, hand-drawn art | `get_illustration_svg` | vector, 1-20 KB measured |
| Anything at card size | `get_illustration_png_url(size="standard")` | 456 px long side |
| A real hero | `get_illustration_png_url(size="hd")` | largest source; size varies per artwork (2048-3000 px seen), read the returned `width`/`height`, resize before shipping |
| 3D styles | PNG only | 3D artwork has no SVG at all |

Then write `ouch.json` next to the project so the next session stays on the
style:

```json
{ "style": "notion-line-art", "target_ratio": 1.0,
  "slots": { "hero": { "id": "6a3d01f2fae3aa473512807f",
                       "heading": "Hotline assistant answering customer inquiry",
                       "file": "assets/illustrations/hero.svg",
                       "width": 1000, "height": 1000,
                       "free_distribution": false } } }
```

## Reject these

| Reject | Why | Seen in testing |
| --- | --- | --- |
| A UI-generic picture where the product has a subject | reads as a stock screenshot of nothing | "Empty browser window" for an empty houseplant list |
| The same artwork in two slots | states stop being distinguishable | one warning triangle used for both "offline" and "upload failed" |
| An icon-shaped object among characters | breaks a set faster than a wrong subject | a line-art rocket dropped into a page of drawn people |
| Brand logos, especially from `3d-fluency` | a logo is not an illustration for your block | most downloaded work of the year is a 3D WhatsApp logo |
| Lettering where a scene belongs | you get the word, not the picture | `welcome` returns the word WELCOME at 456×86 |
| Dark artwork on a dark ground | invisible from two metres | dark grey phone on a `#12151a` slide |
| A style with 20-60 works as a project base | runs out after a few slots | most of the free tier |
| Promising animation | `animated: true` filters, no tool returns an animated file | a style marked animated still hands you a static webp |

## Gotchas, all measured

- **A wrong `style` is silent, and zero results are not proof of anything.**
  `{"total": 0, "illustrations": []}` comes back both for a mistyped id and for
  a subject this style does not cover. In testing an agent declared three live
  styles "gone" on this evidence alone. Before writing a style off, search it
  with one plain word (`people`, `phone`, `box`). Results mean the style is
  alive and your subject is the problem; zero on that too means the id is wrong,
  and `list_illustrations_styles` settles it.
- **`search_illustrations` returns `total`.** A `total` of 30 means the style
  barely covers that subject. Use it as the coverage number.
- **Context is spent on searching, not on files.** Measured order of magnitude:

  | Call | Cost |
  | --- | --- |
  | `list_illustrations_categories`, `limit=30` | ~8k tokens |
  | `list_illustrations_styles`, `limit=100` | ~3.4k |
  | `search_illustrations`, `amount=10` | ~1.6-1.9k |
  | `search_illustrations`, `amount=3-5` | ~0.5-0.9k |
  | `get_illustration_svg` / `get_illustration_png_url` | ~150-200 |

  The file tools are cheap because they return a URL, not the artwork: a 1-20 KB
  SVG never enters the conversation unless you open it, and there is no reason to
  open it. Budget goes on categories and wide searches instead: narrow the
  category call, keep `amount` at 5 for probing and 10 only for the slot you are
  actually filling.
- **No documented pixel size is real; read the response.** `standard` returned
  456×456 against a documented 410×456; `hd` returned 3000 px one day and
  2048 px the next, depending on the artwork's source. The returned
  `width`/`height` is the only truth.
- **Do not trust the size attributes inside the SVG file.** On 2026-09-03
  fresh downloads carried no `width`/`height` (only a `viewBox`), collapsed to
  zero inside `<img>` and silently disappeared; on 2026-09-04 the same call
  returned files with both attributes. The server moves under you. The tool
  response always carries the numbers: put an explicit size on the `<img>`
  (step 5 says when `height` and when `max-height`) instead of relying on
  what is inside the file.
- **Presigned URLs live one hour.** `preview.url` is the only permanent link and
  it is watermarked. There is no link that is both.
- **Two error texts, two causes.** "needs an Icons8 sign-in" means the account
  has no active subscription, even when you signed in through OAuth. "No
  illustration <id>, or no svg for it" means this artwork has no such format,
  which is normal for 3D and for some flat styles too. Neither means a bad id.
- **`free_distribution: false` is not a licence warning.** For a subscriber it
  is the ordinary case. But when the deliverable is public, filter with
  `free_only=True` and credit Icons8 on the page.

## What to hand back

Per slot: the `heading`, the **id**, the style `pretty_id`, the local file path,
the downloaded file's intrinsic `width`×`height`, and **`free_distribution`
copied from the server response**, not guessed. Those last two are what someone else needs to check your licence and
your layout, and in testing they were the fields runs quietly dropped. Ids come
from `search_illustrations` only. If a format is refused,
say which and why rather than silently switching style. If the illustration
tools are unavailable, say so and stop.

## Reference files

- `references/STYLES.md`: styles by surface, the free tier in full, catalog facts.
- `references/SLOTS.md`: slot lists per project type, and thin subjects.
- `references/VOCABULARY.md`: slot to subject map, phrases that work.
- `scripts/measure.py`: ground line, mass offset and saturation for steps 5-6;
  the single source of those formulas.
