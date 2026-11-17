# Packs

98 packs, one project. `list_platforms` returns them all with `apiCode`, `isColor`,
`iconsCount` and `recommendedSize`. Always pass the exact `apiCode` to `search_icons`.

## Choosing, in order

1. **Monochrome or color?** Product UI is monochrome, no exceptions. Marketing, slides and
   onboarding can be color.
2. **Coverage.** Take the 3 rarest concepts from your list and search them in the candidate
   pack before committing. `kanban` exists in `m_outlined` and in no other pack tested
   (`ios7`, `color`, `win10`, `p1em`, `carbon_copy`, `dusk`, `fluent-systems-regular` all miss it).
   High-coverage packs: `color` (13,078), `ios7` (11,177), `ios_filled` (10,661), `win10` (9,196),
   `fluent-systems-filled` (8,785), `ios11` (8,223), `androidL` (7,840). `m_outlined` has 5,579,
   good vocabulary but expect holes.
3. **Do you need two states?** Tab bars and toggles need an outline plus a filled twin of the
   same drawing. Use a pair from the list below, never two unrelated packs.
4. **Size.** `recommendedSize` is the size the pack was drawn for. Render at that size or 2x it.
   A 16px pack blown up to 96px looks thin, a 100px pack shrunk to 16px turns to mud.

## Monochrome, for product UI

| apiCode | Name | Icons | Rec. size | Use for |
| --- | --- | --- | --- | --- |
| `m_outlined` | Material Outlined | 5,579 | 24 | web apps, the safe default |
| `androidL` | Material Filled | 7,840 | 24 | filled twin of `m_outlined` |
| `m_rounded` | Material Rounded | 5,515 | 24 | softer product tone |
| `m_sharp` | Material Sharp | 5,343 | 24 | technical, dense tools |
| `ios7` | iOS 27 Outlined | 11,177 | 50 | best coverage in outline |
| `ios_filled` | iOS 27 Filled | 10,661 | 50 | filled twin of `ios7` |
| `ios11` | iOS 27 Glyph | 8,223 | 30 | small solid glyphs |
| `fluent-systems-regular` | Windows 11 Regular | not listed | 24 | Windows apps (works in search, missing from `list_platforms`) |
| `fluent-systems-filled` | Windows 11 Filled | 8,785 | 24 | filled twin of the above |
| `win10` | Windows 10 | 9,196 | 32 | desktop, wide coverage |
| `forma-light` / `-regular-filled` / `-bold` / `-thin` | Forma family | ~3,450 each | 24 | when you need a specific stroke weight; `-sharp` variants for square corners |
| `p1em` | Simple Small | 5,300 | 16 | 16px UI, dense tables |
| `tiny-glyph` | Tiny Glyph | 2,919 | 16 | 16px solid |
| `glyph-neue` | Glyph Neue | 6,373 | 64 | large monochrome, headers |
| `sf-regular` / `sf-black` / `sf-ultralight` | Apple SF Symbols | ~2,290 each | 25-64 | Apple-native mockups |
| `parakeet-line` / `parakeet-filled` | Parakeet | 3,133 / 2,320 | 48 | friendly rounded line pair |
| `puffy` / `puffy-filled` | Puffy | 3,111 / 3,080 | 32 | thick, playful strokes |
| `Dusk_Wired` | Cute Outline | 3,950 | 64 | outline twin of `dusk` |
| `carbon_copy` | Outline Hand Drawn | 3,890 | 100 | sketchy, informal |
| `dotty` | Dotted | 5,976 | 80 | decorative, not for UI |

## Color, for marketing and slides

| apiCode | Name | Icons | Rec. size | Use for |
| --- | --- | --- | --- | --- |
| `color` | Flat Color | 13,078 | 48 | the widest color set, safe default |
| `plumpy` | Plumpy | 7,513 | 24 | soft color, works small |
| `pulsar-color` / `pulsar-gradient` | Pulsar | ~6,900 | 48 | modern gradient landing pages |
| `liquid-glass` / `liquid-glass-color` | Liquid Glass | 4,822 / 3,083 | 48 | glassy, current Apple-ish look |
| `dusk` | Cute Color | 4,148 | 64 | friendly consumer products |
| `cotton` | Pastel | 4,631 | 128 | soft large hero icons |
| `office40` / `office80` | Office M / L | 4,809 / 4,882 | 40 / 80 | decks, docs, enterprise |
| `m_two_tone` | Material Two Tone | 5,569 | 24 | color that still reads as UI |
| `ultraviolet` | Blue UI | 4,500 | 40 | single-hue UI illustrations |
| `nolan` | Gradient Line | 4,291 | 64 | outline plus gradient |
| `badges` | Badges | 5,085 | 48 | status, achievements |
| `claude-hand-drawn` | Claude Hand Drawn | 2,309 | 50 | hand-drawn warmth, AI products |
| `plasticine` | Color Hand Drawn | 3,905 | 100 | playful, tactile |
| `isometric` / `isometric-line` | Isometric | 1,245 / 1,222 | 50 | technical diagrams, never UI |
| `doodle`, `comic`, `retro`, `neon`, `papercut`, `matisse`, `stitch`, `arcade` | themed | 1,000-2,500 | 32-120 | when the whole page has that voice |

Everything else (`emoji`, `hands`, `mini-stickers`, `flat_round`, `poly`, `tapes`, `3d-*`, ...)
is a niche set under 2,500 icons. Call `list_platforms` when you need one.

## Outline plus filled pairs

For inactive plus active states, take both from the same family:

`ios7` + `ios_filled` · `m_outlined` + `androidL` · `fluent-systems-regular` +
`fluent-systems-filled` · `parakeet-line` + `parakeet-filled` · `puffy` + `puffy-filled` ·
`forma-light` + `forma-light-filled` · `Dusk_Wired` + `dusk` · `softteal-line` + `softteal-color` ·
`connect` + `connect-color` · `keek-line` + `keek` · `isometric-line` + `isometric`

The same `commonName` usually exists in both halves of a pair, so the drawings line up.

## Traps

- **Partial names resolve silently.** `wired` gives `Dusk_Wired`, `material` gives `androidL`,
  `ios` gives `ios7`, `office` gives `office40`. Others (`forma`, `glyph`, `sf`, `tiny`) return
  zero. Codes are case sensitive: `FLUENT` returns zero. Always check the `platform` field in
  the response equals what you asked for.
- **`list_platforms` is incomplete.** `fluent` and `fluent-systems-regular` return results in
  search but are absent from the 98-item list.
- **Coverage is per pack, not per catalog.** `m_outlined` has no plain outline `star`
  (`star--v2` and `star--v3` are a star inside a star, `filled-star` is the clean one) while
  `ios7` has a plain `star` (id 104). Same for `home`: `m_outlined` starts at `home--v2`.
- **A pack switch means re-searching everything.** Ids are pack-specific and `commonName`
  overlaps only partly (`filled-trash` exists in 12 packs, `ios7` calls it `full-trash`).
