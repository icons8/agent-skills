---
name: icons8
description: "Use when a screen, page, deck, doc, README, or component needs visual symbols — icons, glyphs, status markers, step indicators, section-header art, feature-list bullets, or anything replacing emoji/placeholder text with real graphics. Covers one icon or forty, at 16px or 128px. Fetches real icons from Icons8 via MCP and keeps a project on a single coherent family: one pack locked for the whole project, plain metaphors instead of brand logos or literal machinery, free PNG URLs for previewing and prototyping, SVG only for the approved final set. Use it when building or filling in UI (nav, toolbars, cards, tables, checklists, empty states), when making text-only rows or slides read visually, when swapping emoji for icons, when auditing icons already in a file for consistency, or when Icons8 is mentioned. Not for logo design, illustration, CSS/rendering bugs, accessibility labeling, or billing questions."
---

# Icons8 icons

The MCP is a thin wrapper over the Icons8 search API. It gives you 5 tools and no taste:
`search_icons`, `list_categories`, `list_platforms`, `get_icon_svg`, `get_icon_png_url`.
You will often see only 4 of them: `get_icon_svg` appears solely on a paid plan, see step 6.
Default behaviour is bad in three specific ways, and this skill exists to fix them.

**1. Unfiltered search returns one metaphor in ten styles.** `search_icons("delete")` with
`amount=12` returns the same trash can in 12 different packs. You see one idea and no
alternatives, and whatever you pick will not match the icon you picked five minutes ago.

**2. Ranking is not taste-ranking.** `search_icons("settings")` puts four Apple logos
(`apple-settings`, category `Logos`) above the plain gear. `search_icons("dashboard")` puts a
car dashboard gauge first. The API matches names and tags, it does not know you are building
a settings screen.

**3. SVG is the slow, paid path.** `get_icon_svg` is one call per icon (~1s each, serial) and
the payload runs from 600 characters (Flat Color) to 46,000 (Color Hand Drawn, about 11k
tokens for a single icon). PNG previews are free, instant and need no MCP call at all.

## The loop

**0. Read the lock.** Look for `icons8.json` next to the project you are working in. If it
exists, that pack is the only pack, no exceptions, even for one extra icon. If it does not
exist yet, you will write it in step 5.

```json
{ "pack": "m_outlined", "size": 24, "color": "1F2937",
  "icons": { "settings": { "id": "82535", "commonName": "settings" } } }
```

**1. List every concept before searching.** Write the full list of icons the screen needs
(nav, actions, states, empty states). Pack choice depends on coverage of the whole list, not
of the first icon. Two of ~40 concepts are always missing from any given pack.

**2. Pick the pack once.** See `references/PACKS.md`. One pack per project, chosen from the
context table below. Use the exact `apiCode`. Never a partial name: `wired` silently resolves
to `Dusk_Wired`, `material` to `androidL` (Material Filled), `office` to `office40`, while
`forma`, `glyph`, `sf` and `tiny` return zero results.

**3. One search per concept, always with `platform`.**
`search_icons(query="settings", platform="m_outlined", amount=10)`
The filter is what makes search useful: those 10 results are now 10 different metaphors
instead of 10 styles of one. Cost is about 1k tokens at `amount=10`, 2.6k at 30 (max 100).
Do not search the same concept twice, and do not re-search to "double check" a pick.

**4. Score the candidates** with the rules below, then **look at them**. Build one contact
sheet and open it, no MCP calls needed:

```html
<!-- sheet.html: each cell is <img src="https://img.icons8.com/?id=ID&format=png&size=48"> + commonName -->
```

`open sheet.html` for the user. For any pick you are unsure about, download the PNG and read
it yourself, that is a real check and it costs one Read.

**5. Prototype with PNG, write the lock.** In HTML/JSX use the URL directly:
`https://img.icons8.com/?id=82535&format=png&size=24`. Add `&color=1F2937` to recolor any
monochrome icon (ignored by color packs). Zero MCP calls, zero latency, works for free and
paid icons alike. Then write `icons8.json` so the next session and the next agent stay on
the same pack.

**6. Fetch SVG last, only for the approved set.** When the prototype is agreed, call
`get_icon_svg` for those icons and inline them. Set `fill="currentColor"` on monochrome
icons so CSS drives the color. Skip this step entirely for color, 3D and hand-drawn packs:
their SVG is huge and a PNG at 2x is the better asset.

SVG is the one paid part of this workflow, and the gate is the connection's API key, not the icon.
Three states, read them correctly:

- **`get_icon_svg` is missing from your tool list.** The account has no SVG plan. The tool still
  exists on the server and still answers if you call it; the server just stops advertising it without
  a key. Its absence is not a broken server, not proof the server is PNG-only, and not a reason to
  rewrite this skill.
- **It answers `{"error": "You don't have access to this tool. Use get_icon_png_url instead."}`.**
  The usual case, and the clearest one: no key on the connection. One call is enough to confirm it,
  so you never have to guess.
- **It answers `{"svg": ""}`.** Quieter and rarer: a key is attached but does not cover SVG. Check
  the id against your search results once; if the id is right, it is the plan.

In all three, say it in one line and keep moving: SVG needs a plan from
https://icons8.com/icons/pricing, and the key goes into the MCP server config as an
`Authorization: Bearer <key>` header — per-client setup at https://icons8.com/mcp. Then ship the PNG
version at 2x. The design does not wait on a subscription.

**If the requirement is `currentColor`, PNG still gets you there.** This is the one thing inline SVG
buys in product UI, and a plain `<img>` cannot do it — but the same PNG used as an alpha mask can,
because the browser paints `background-color` through the icon's transparency:

```css
.icon { width: 24px; height: 24px; background-color: currentColor;
        mask: url("https://img.icons8.com/?id=82535&format=png&size=48") center / contain no-repeat;
        -webkit-mask: url("https://img.icons8.com/?id=82535&format=png&size=48") center / contain no-repeat; }
```

Ask for the PNG at 2x the CSS size, and keep the `-webkit-` prefix for Safari before 15.4. The icon
now inherits the theme token exactly as `fill="currentColor"` would. It is a raster mask, so it has a
ceiling inline SVG doesn't — say that rather than implying parity. This is a real technique, not a
workaround: the asset is still the genuine Icons8 drawing.

Do not go looking for another way in. These all cost turns and produce something worse:

| Detour | What you actually get |
| --- | --- |
| `img.icons8.com` with `format=svg` | 403 `PAID_FORMAT` — the same paywall, a different door |
| Tracing or vectorising the PNG | a path that is not the Icons8 drawing, usually visibly worse at 24px |
| `<svg><image href="data:image/png…">` | a raster in an SVG wrapper: no `currentColor`, no clean scaling. The CSS mask above is the honest version of this idea and actually inherits the color |
| Writing the path by hand | an invented icon, which breaks the one-pack rule harder than a wrong pack |
| Substituting Lucide, Heroicons, Font Awesome | a second icon set, the one thing this skill exists to prevent |

## Reject these

The user's complaint is "settings should be a plain gear, not a gear with extra parts". Concretely:

| Reject | Why | Real example |
| --- | --- | --- |
| `Logos` as the only category, or a name ending in `-logo` | brand icon, not a UI icon | `settings` → `apple-settings` (top 4 results) |
| `Industry`, `Transport`, `Household` for a UI action | literal machine part, reads wrong in a toolbar | `settings` → `gear`, `gears`, `automatic`, `settings-3`; `dashboard` → car gauge |
| Compound icons when a plain one exists | extra objects add meaning you did not ask for | `laptop-settings`, `sync-settings`, `api-settings` for a plain settings item |
| `--v2` / `--v3` when the plain `commonName` exists and looks right | suffixed variants are alternates, often decorated | `star--v2` and `star--v3` in `m_outlined` are a star inside a star; `filled-star` is the clean one |
| Any icon whose display name does not match the concept | search matched a substring, not the idea | `webhook` → `webtoon-logo`; `dark mode` → `do-not-disturb`, `film-noir` |
| Color or 3D packs at 16-24px | detail turns to mud | `plasticine`, `isometric`, `badges` in product UI |
| 1px-stroke mono packs at 96px+ | looks thin and unfinished | `p1em`, `tiny-glyph` on a landing hero |
| A second pack anywhere on the screen | this is the one thing users notice | `m_outlined` plus `ios7`, both mono, still visibly mismatched |

Prefer, in order: exact plain `commonName` match, then `category: Popular` or `User Interface`,
then the shortest name that still means the concept.

`category` is a comma-joined list. Read it as a set: one bad label inside it does not condemn the
icon. The plain bell is tagged `Business,Logos,User Interface`, the standard warning triangle
`error` is tagged `Industry,User Interface`. A category rule that fires on substring alone throws
both of them away.

## Criteria by context

| Context | Size | Packs | What matters |
| --- | --- | --- | --- |
| Product UI, toolbars, nav | 16-24 | mono only: `m_outlined`, `ios7`, `fluent-systems-regular`, `forma-light`, `p1em` at 16 | one family; grab the outline/filled pair for inactive/active states (`ios7` + `ios_filled`, `m_outlined` + `androidL`); same optical weight; recolor via `currentColor` |
| Marketing, landing, feature grid | 48-128 | color: `color`, `plumpy`, `pulsar-color`, `liquid-glass`, `dusk`, `cotton` | brand color harmony over literal accuracy; at 200px+ an illustration beats a scaled icon (Ouch! is in-house, not in this MCP) |
| Slides, decks, docs | 40-80 | `color`, `office40`, `m_two_tone`, `ultraviolet` | readable at projector distance; one pack across all slides |
| Friendly, informal, human tone | 50-100 | `claude-hand-drawn`, `carbon_copy`, `plasticine`, `doodle` | PNG only, never inline these SVGs |
| Dev docs, dense tables, IDE-like | 16 | `p1em`, `tiny-glyph`, `glyph-neue` | legibility at 16px is the only criterion |
| OS-native mockups | native | iOS `ios7`/`ios_filled`/`ios11`, Windows `fluent-systems-filled`, Android `m_*` | match the platform the mock claims to be |

## Gotchas that will cost you time

- `get_icon_svg` with a bad id returns `{"svg": ""}` and no error. Always check the string is
  non-empty before writing a file.
- `img.icons8.com` with `format=svg` returns 403 `PAID_FORMAT`. SVG only comes through
  `get_icon_svg`, which the server offers only when the connection carries a paid account's key
  (step 6). There is no shortcut.
- `list_platforms` returns 98 packs and still misses live ones (`fluent` and
  `fluent-systems-regular` work in search but are not in the list). A missing code is not proof
  the pack is gone.
- The `category` filter takes an `apiCode` (`user-interface`), not a display name (`Logos`
  returns 0). `category="free-icons"` is a working free-only filter.
- Platform codes are case sensitive: `FLUENT` returns 0.
- `commonName` is shared across packs only where the pack has that icon (`filled-trash` exists
  in 12 packs, `ios7` calls its trash `full-trash`). To move a set to another pack, re-run the
  searches, do not translate ids.
- `isFree: true` marks the free set (attribution required). Paid icons **omit the field entirely**
  rather than setting it to `false`, so read absence as paid: a test for `isFree == false` never
  matches, and indexing the key blindly raises on every paid icon. It does not affect PNG previews,
  both work. If the assets ship in a product, confirm the license before handing over paid icons —
  a set that looks free because nothing said otherwise is the easy way to get this wrong.

## Recovering from a bad search

Zero results or junk means the wording is wrong, not that the icon is missing. Search matches
names and tags, so ask for the object Icons8 would have drawn:

| Instead of | Search | You get |
| --- | --- | --- |
| `ellipsis`, `changelog`, `onboarding` | `more`, `document`, `guide` | `more` is the three dots |
| `webhook`, `integration` | `api`, `code`, `plugin` | `api`, `source-code`, `plugin` |
| `dark mode` | `moon` | `full-moon`, `moon` |
| `trending up` | `growth` | `positive-dynamic`, `bullish` |
| `notification` | `bell` | `appointment-reminders` (a plain bell) |
| `warning` | `error` | `error` is the triangle with `!`; `high-priority` is a diamond |

If `countAll` is 1-2 and the single hit is a logo, treat it as a miss and reword. Full map in
`references/VOCABULARY.md`.

## Reference files

- `references/PACKS.md`: which pack for which job, outline plus filled pairs, coverage numbers.
- `references/VOCABULARY.md`: concept to `commonName` map, verified visually, plus the traps.
- `references/KITS.md`: ready concept lists for SaaS UI, landing, ecommerce, dev docs,
  analytics, empty states. Start from a kit instead of inventing the list.

## What to hand back

Per icon: `commonName`, id, pack, and the preview URL. Never invent or construct an id, they
come from `search_icons` only.

If `search_icons` is not in your tool list, the server is not connected for you, and that is the
finding to report: say it plainly and tell the user to connect it, because they can fix it and you
cannot. What you must not do is paper over it — an id you remember from a previous session or from
this skill's own examples is unverified, and shipping one is worse than shipping a gap. Leave the icon
out with a note on what it needs, hand over whatever else is genuinely verified, and be explicit that
this part of the task is unfinished.
