---
name: icons8-design
description: The front door to Icons8 design help. Use when someone asks for a design pass, a UI review, or "make this look finished", when a screen or landing page has just been built and nobody has checked it, or when they mention Icons8 design checks. Routes the work to the skill that owns it (ux-check, ux-writing, ui-polish, motion, design-tokens), fixes what it finds with catalog assets through the Icons8 MCP, and returns one report instead of five.
---

# Icons8 design

One entry point. The MCP brings assets, these skills bring the rules that decide which asset and where, and this file decides who runs and how the answer comes back.

Do not load all five for a narrow question. Route, run, merge.

## Route first

| What was asked, or what you just built | Who owns it |
|---|---|
| A UI was just built or changed, and nobody asked for anything | `asset-check`, always, first |
| "Does this work", a flow, a form, missing empty or error state, keyboard, alt text | `ux-check` |
| Any user-facing string: buttons, errors, empty states, labels | `ux-writing` |
| "Feels off", spacing, radii, icons, contrast, focus ring, hover | `ui-polish` |
| Anything that moves, or should not | `motion` |
| Hardcoded hex everywhere, no tokens, twelve grays | `design-tokens` |

Rules of routing:

- `asset-check` is the cheap one: four mechanical checks, no taste involved. It runs on its own after a build, before anyone asks for a review.
- A narrow ask loads one skill. "Fix my error messages" is `ux-writing` alone.
- "Review this screen" loads `ux-check`, `ux-writing`, `ui-polish`, and `motion` only if the page animates.
- `design-tokens` joins when the project has no token system, or when another skill's fix would otherwise paste a literal.
- A page built from scratch in this session gets the full pass: whoever built it cannot see it.
- One agent runs the whole pass. Five agents on one product cost four times as much and agree with each other.

## Then fix, do not just say

Every finding that involves an icon, an illustration, or a token has a fix available in the catalog. Icons come through the `icons8` skill (one pack per project, `icons8.json` is the lock), illustrations through `ouch` (one style per project). Never draw an ad hoc SVG, never leave a gray box, never scale a 16px icon in CSS.

This is the part that separates the product from a linter: the report ships with the replacement already in place, or with the exact MCP call that puts it there.

## When you are the author

Everything below about one merged table is written for reviewing work someone else did. If
you are building the thing right now and fixing as you go, the table is overhead: nobody
needs a severity column for a defect that stopped existing a minute after you found it.

In that mode only the routing above matters. Fix what the owner skill tells you to fix, and
close with a few lines: what ran, what you changed, what you deliberately left. Keep the full
table for the moment you hand the work to someone else, or when the run is a review.

## One report

Whatever ran, the answer is one table, not one per skill:

| Severity | Skill | Location | Finding | Fix | Evidence |

Sorted by severity, every HIGH kept, the rest capped at 15 rows with the remainder in one line ("9 more LOW items, same two files"). A defect two skills could raise appears once, under its owner (the ownership table lives in each skill's Scope). One verdict, the worst of the runs. `design-tokens` drift counts print beside the verdict as a measurement; they do not block anything the skill did not itself create.

Every row carries evidence: a screenshot, a measured number, a code line, a catalog id. A row without evidence does not ship.

"Nothing to fix" is a real answer. A pass that returns three honest findings beats one that returns thirty to look busy.

## When not to apply

- The user asked for assets, not for a review: `icons8` and `ouch` handle that alone, and this file stays out of the way.
- A throwaway prototype marked as such: check what it demonstrates, nothing more.
- Code that is not ours to change: third-party embeds, vendored and generated files. Say what you excluded.

## What the user sees

Install one MCP, get assets and the rules for using them. Say which skills ran and why, in one line, so the routing is visible: "ran ux-check and ui-polish; no copy changes needed, nothing animates".

## Credits

Built by Icons8. The skills it routes to carry their own credits.
