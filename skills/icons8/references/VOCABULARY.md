# Vocabulary

Icons8 search matches names and tags, not meaning. The word you would use in a spec is often
not the word that finds the icon. This file is the translation layer.

`✓` means the icon was rendered at 48px and checked. Rows without it come from search metadata,
so look at them before shipping.

## The counter-intuitive ones

| You want | Search | Pick this `commonName` | Note |
| --- | --- | --- | --- |
| notification bell | `bell` | `appointment-reminders` ✓ | a plain bell, despite the name. `filled-appointment-reminders` is the solid twin |
| warning triangle | `error` | `error` ✓ | triangle with `!`. `high-priority` ✓ is a diamond, not a triangle |
| close (bare X) | `close` | `delete-sign` ✓ | `cancel` ✓ is the same X inside a circle |
| success | `success` | `ok` ✓ | circled checkmark. `checkmark` ✓ is the bare tick |
| logout | `logout` | `exit` ✓ | box with an arrow leaving it |
| overflow menu (three dots) | `more options` | `more` ✓ | `ellipsis` returns zero results |
| sort | `sort` | `generic-sorting` ✓ | lines plus a down arrow |
| analytics | `analytics` or `chart` | `combo-chart` ✓ | line chart in axes. Also `bar-chart`, `pie-chart`, `statistics` |
| dashboard | `dashboard` | `dashboard-layout` ✓ | plain `dashboard` is a **car** dashboard gauge |
| edit | `pencil` | `pencil` ✓ | `create-new` ✓ is a pencil on a square, use it for "new" |
| delete | `delete` or `trash` | `trash`, `filled-trash` | `delete-forever` adds an X |
| rating star | `star rating` | `filled-star` ✓ | in `m_outlined` the outline `star--v2` / `star--v3` ✓ are a star inside a star |
| favorite / like | `heart` or `wishlist` | `like` ✓ | plain heart outline, `filled-like` is solid |
| show / hide | `visible` / `hide` | `visible`, `hide` | not `eye` |
| settings | `settings` | `settings` ✓ | `gear` ✓ and `gears` are industrial cogs (category `Industry`), `apple-settings` is a logo |
| comment | `comment` | `comments`, `speech-bubble-with-dots` | `speech-bubble` ✓ is the empty round bubble |
| list | `list` | `list` ✓ | bulleted list |
| plain folder | `folder` | `folder-invoices` ✓ | a plain closed folder, the name lies. `opened-folder` ✓ is the same folder with an open tab |
| login | `login` | `login-rounded-right` ✓ | arrow entering a circle |
| growth | `growth` | `positive-dynamic`, `bullish` | `trending up` returns plain arrows |
| dark mode | `moon` | `moon`, `full-moon` | `dark mode` returns `do-not-disturb` and `film-noir` |
| API / webhook | `api`, `code`, `plugin` | `api`, `source-code`, `plugin` | `webhook` returns `webtoon-logo`, a brand |
| lightbulb | `lightbulb` or `idea` | `idea` | |
| terminal | `terminal` | `console`, `command-line` | `terminal` alone also returns airports and POS terminals |
| team | `team` | `conference-call`, `groups` | |
| attachment | `attachment` | `attach` | |
| translate | `translate` | `translation`, `language` | only 3 results, thin |

## Returns nothing or junk

`ellipsis`, `changelog`, `onboarding`, `roadmap` (returns `journey`, `itinerary`),
`webhook`, `dark mode`, `trending up`, `target` (returns `goal`, `define-location`, no bullseye),
`sparkle` (returns `sparkling`, `bard`, mostly logos), `integration`, `scan` (returns
`touch-id`, `fingerprint`, `barcode`).

Rule: if `countAll` is 0-2, or the only hit sits in category `Logos`, the wording is wrong.
Reword to the physical object an illustrator would draw, then search again. One retry, then
tell the user the concept is missing from this pack.

## Suffixes and prefixes

- No suffix is the original drawing. `--v2`, `--v3`, `--v4` are alternates, usually more
  decorated, sometimes just a redesign. Try the plain name first, and if the pack has only
  suffixed variants, look at them before picking.
- `filled-*` is the solid twin of an outline icon (`filled-trash`, `filled-star`, `filled-like`,
  `filled-appointment-reminders`). Use the pair for inactive plus active states.
- `*-2`, `*-3` are unrelated drawings of the same idea, not versions (`lock-2` is a different
  padlock from `lock`).
- Names ending in `-logo` or sitting in category `Logos` are brands. Never use them as generic
  UI icons.

## Category as a quality signal

The `category` field in every search result predicts whether the icon belongs in a UI:

| Category | Verdict |
| --- | --- |
| `Popular`, `User Interface` | UI-safe, these are the curated everyday icons |
| `Editing`, `Files`, `Arrows`, `Data`, `Messaging`, `Media Controls` | fine, check the drawing |
| `Industry`, `Transport`, `Household`, `Science`, `Farming` | literal objects, wrong in a toolbar |
| `Logos` alone, or a name ending in `-logo` | a brand, never a generic UI icon |

**`category` is a comma-joined list, so read it as a set, not as one label.** `Logos` appearing
in that list does not make the icon a brand: the plain bell `appointment-reminders` is tagged
`Business,Logos,User Interface`. Reject on `Logos` only when it is the sole category (that is
what `apple-settings` looks like) or when the name itself is brand-shaped. The same applies to
the literal-object categories: `error`, the standard warning triangle, is tagged
`Industry,User Interface`.

`category` in filters takes the `apiCode` (`user-interface`, `free-icons`, `time-and-date`), not
the display name. `list_categories` returns all 60 with their subcategories.
`category="free-icons"` narrows to the free set.
