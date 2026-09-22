---
name: icons8
description: Pick and fetch icons through the Icons8 MCP so a project ends up with one consistent set instead of a pile of mismatched icons. Locks the whole project to one pack, rejects wrong metaphors (settings is a plain gear, not an Apple logo), previews with free PNG URLs and pulls SVG only for the final set. Use whenever a UI, prototype, landing page, slide deck or doc needs icons, when the user mentions Icons8, an icon set or a specific icon, and when replacing or auditing icons already in a file.
---

# Icons8 icons

The MCP is a thin wrapper over the Icons8 search API. It gives you 5 tools and no taste:
`search_icons`, `list_categories`, `list_platforms`, `get_icon_svg`, `get_icon_png_url`.
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


**There are no animated icons in this MCP.** All 133 platforms are static, and
`search_icons` has neither an `animated` filter nor a download tool for one
(measured 2026-09-21). Do not promise one. Ouch illustrations do have animated
versions; that is a different catalog and a different skill.

## The loop

**0. Read the lock.** Look for `icons8.json` next to the project you are working in. If it
exists, that pack is the only pack, no exceptions, even for one extra icon. If it does not
exist yet, you will write it in step 5.

```json
{
  "version": 2,
  "icons": {
    "pack": "m_outlined",
    "sizes": [16, 20, 24],
    "color": "currentColor",
    "items": { "settings": { "id": "82535", "commonName": "settings" } }
  },
  "illustrations": {
    "style": "notion-line-art",
    "slots": { "hero": { "id": "6a3d01f2fae3aa473512807f", "file": "assets/hero.svg" } }
  },
  "tokens": { "iconColor": "--foreground", "accent": "--primary", "radius": "--radius" }
}
```

The lock holds everything the next screen needs to match this one:

- `icons.pack` is binding. `icons.sizes` lists the sizes this project actually uses, so the
  next icon is exported at one of them instead of a new number nobody chose.
- `illustrations` is written by the `ouch` skill into this same file. Read it, never edit it.
- `tokens` records the CSS variable **names** the project uses, not their values: the next
  asset is wired to the same variables. Values drift, names do not. Creating those variables
  is somebody else's job, not yours: read the names, never invent them.

**Older locks.** A file with `pack` at the top level and no `version` is the first format
(`{"pack": …, "size": 24, "color": …, "icons": {…}}`). Read it as if `pack` were
`icons.pack`, `size` were the only entry in `icons.sizes` and `icons` were `icons.items`.
Leave it alone until you have something new to write; when you do write, save it in the
shape above and carry every old value over. Never silently drop a field you did not
understand.

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

**When nobody is watching.** In a subagent, a batch job or any run with no human at the other
end, opening the sheet is theatre: nobody sees it. Build it anyway and read it yourself, then
say in your report which picks you were unsure about. A silent pick nobody can question is
worse than a named doubt.

**5. Prototype with PNG, write the lock.** In HTML/JSX use the URL directly:
`https://img.icons8.com/?id=82535&format=png&size=24`. Add `&color=1F2937` to recolor any
monochrome icon (ignored by color packs). Zero MCP calls, zero latency, works for free and
paid icons alike. Then write `icons8.json` so the next session and the next agent stay on
the same pack. Write `icons.pack`, `icons.sizes`, `icons.color` and `icons.items`; leave
`illustrations` and `tokens` exactly as you found them. If a separate `ouch.json` sits next
to the project, fold its content into `illustrations` here, leave the old file on disk and
say in your report that it is now superseded: deleting someone's file without asking is not
your call.

**6. Fetch SVG last, only for the approved set.** When the prototype is agreed, call
`get_icon_svg` for those icons and inline them. Building the thing yourself in one pass, with
no round of approval in between? Then "approved" means "the set you just used on the screen":
finish the layout on PNG, look at it, and only then fetch SVG for the icons that stayed. The
rule exists to stop you pulling forty SVGs while still choosing, not to make you ship PNG
where the project wants vectors. Set `fill="currentColor"` on monochrome
icons so CSS drives the color. Skip this step entirely for color, 3D and hand-drawn packs:
their SVG is huge and a PNG at 2x is the better asset.

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
- `img.icons8.com` with `format=svg` returns 403 `PAID_FORMAT`. SVG only comes through the MCP,
  which uses the account's key. There is no shortcut.
- `list_platforms` returns 98 packs and still misses live ones (`fluent` and
  `fluent-systems-regular` work in search but are not in the list). A missing code is not proof
  the pack is gone.
- The `category` filter takes an `apiCode` (`user-interface`), not a display name (`Logos`
  returns 0). `category="free-icons"` is a working free-only filter.
- Platform codes are case sensitive: `FLUENT` returns 0.
- `commonName` is shared across packs only where the pack has that icon (`filled-trash` exists
  in 12 packs, `ios7` calls its trash `full-trash`). To move a set to another pack, re-run the
  searches, do not translate ids.
- `isFree: true` marks the free set (attribution required). Everything else needs a license.
  It does not affect PNG previews, both work. If the assets ship in a product, confirm the
  license before handing over paid icons.

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
come from `search_icons` only. If the MCP tools are unavailable, say so and stop.
