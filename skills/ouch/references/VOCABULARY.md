# Slot to subject

The catalog is organised by what is drawn. Your list is organised by where the
picture goes. This file is the translation, measured against the live server on
2026-09-07: every `total` below is what the query actually returned with no
style filter.

Rules first, table second.

**The table gives you half the query. The product gives the other half.** Every
row below is a state; a real query pairs it with the product's own noun:
`no results` + `invoice`, `upload failed` + `photo`. Run the state alone and
you get artwork about software in the abstract, which is how an app about
houseplants ends up with an empty browser window in its empty state. One
exception, from hard rule 2 of the skill: for absence states the noun goes
into the missing container (`empty` + `pot`, `empty` + `shelf`), never into
the inhabitant — `empty state` + `plant` finds a plant, and the heading next
to it says there are none. If the paired query comes back thin, keep the noun
and change the state word, not the other way round.

**Two words beat one.** A single interface word finds the literal object:
`empty` (1416) returns empty pockets, an empty safe with a cobweb, an empty gift
box. `empty state` (1580) returns inbox empty states and "List is empty"
notifications. Describe the moment, not the noun.

**Some one-word queries return type, not art.** `welcome` gives the word WELCOME
as lettering (456×86); `error` gives isometric "404" numerals. The catalog has a
whole `lettering` category, 5797 works. A preview that is very wide and short is
almost always a word. Check the shape, and look before you commit.

**A one-word heading does not mean lettering.** The top `thank you` result is a
real scene, a woman making a heart with her hands. Heading length proves
nothing; the picture does.

**Thin subjects are thin everywhere.** `offline` (47), `onboarding` (92),
`upgrade` (168), `thank you` (175). If a slot needs one of these, check coverage
before promising it, and expect to fall back on a neighbouring subject.

## The table

| Slot in the product | Search this | total | What comes back |
| --- | --- | --- | --- |
| Sign in | `sign up` | 8783 | registration forms on screens, users with a key. `login` (538) is the trap: it returns padlocks, keys and fingerprint scanners, a security metaphor, not a sign-in screen |
| Registration success | `sign up` | 8783 | includes "thanks for signing up" lettering, useful only if you want the words |
| Welcome, first run | `onboarding` | 92 | waving hands at open doorways, a chick hatching, employee onboarding. Thin, but on target. `welcome` gives lettering |
| Empty list, no content | `empty state` | 1580 | inbox empty states, a basket with a zero badge, "List is empty" |
| No search results | `no results` | 1068 | error pop-ups, a bird with a magnifier and a cross, puzzled colleagues |
| No data yet | `no results` | 1068 | `no data` (4917) is broader and drifts into generic failure scenes |
| 404 | `404` | 217 | genuine 404 artwork in every result, one of the few UI words that lands |
| Access denied | `access denied` | 1370 | padlocks with crosses, biometric login failure, warning triangles |
| Offline, lost connection | `connection lost` | 1487 | astronaut drifting from the ship, disconnected phone call, facepalm over dead wi-fi. `offline` alone is only 47 works |
| Loading | `loading` | 379 | spinners as objects, not scenes |
| Notification | `notification` | 1031 | bells and badges |
| Error, something broke | `error` | 848 | mixed: numerals and scenes. Prefer the specific slot (`no results`, `access denied`, `connection lost`) |
| Success, done | `success` | 2596 | rising charts, a runner crossing the finish line with confetti |
| Celebration, thanks | `celebration` | 2244 | gift box with confetti, trophies, high fives |
| Search | `search` | 1358 | search bars and magnifiers as objects |
| Security, privacy | `security` | 2290 | shields, keyholes, cybersecurity scenes |
| Team, collaboration | `team` | 1090 | people finishing a puzzle, hands joined in a circle, avatar rows |
| Meeting, call | `team meeting` | 1981 | online meeting windows, colleagues at laptops; `animated: true` narrows it to 103 (remeasured 2026-09-07) |
| Calendar, scheduling | `calendar` | 650 | wall and desk calendars, deadline clocks, planning scenes |
| Pricing | `pricing` | 432 | price tags, percent badges, plan comparison |
| Upgrade to paid | `upgrade` | 168 | crowned mountain, hardware upgrades. Thin and literal, check it fits |
| Integrations, API | `integration` | 415 | API dashboards, connected services, workflow diagrams |
| Feedback, reviews | `feedback` | 547 | star ratings, thumbs up, comment boxes |
| AI | `ai` | 2372 | robots, glossy brains, chatbots on screens. `artificial intelligence` (2063) returns works simply titled that |
| Analytics | `analytics` (category `analytics`, 263) | — | narrow with the category, the bare word is broad |

## Narrowing

`category` takes a `pretty_id` from `list_illustrations_categories` and is the
right tool for a broad noun: `cat` alone is over a thousand hits, inside
`animal` it is 855, inside `business` far fewer. Useful category ids:
`finance` (4992), `e-commerce` (1563), `teamwork` (1056),
`artificial-intelligence` (1819), `robot` (1607), `saas` (532), `calendar` (498),
`mental-health` (340), `support` (646), `woman` (11244), `man` (9946). A category
id is one flat segment, not a path: `business/analytics` is not a value the API
knows and returns `{"total": 0, "illustrations": []}`.

Sub-category ids work directly: `category="calendar"` is accepted, no need to
name the parent.

Do not expect miracles from it on a word that already matches its subject:
`calendar` alone returns 650, inside `objects` 544, inside `calendar` 490. The
filter earns its keep on ambiguous words (`cat`, `bank`, `spring`), not on
precise ones.

Remember the category call is expensive: fetch it once with `parent_id`, not
repeatedly at a large `limit`.

## Recovering from a bad search

Zero results means the wording is wrong, or the style id is. Check the style
first: a mistyped `style` returns `total: 0` and looks exactly like a subject
that does not exist.

If the total is healthy but the pictures are wrong, you asked for a noun where
you meant a moment. Add the second word (`state`, `lost`, `denied`, `meeting`)
and search again. Do not page deeper into a wrong query, and do not repeat a
search you have already run.
