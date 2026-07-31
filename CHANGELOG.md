# Changelog

All notable changes to the **icons8** plugin are documented here.
Format: [Keep a Changelog](https://keepachangelog.com); versioning: [SemVer](https://semver.org).
The plugin version lives in `.claude-plugin/plugin.json`.

## [0.1.0] — 2026-07-30

First release. Packages the `icons8` skill to the
[Agent Skills standard](https://agentskills.io/specification) and ships it as a self-hosted plugin
marketplace, with the [Icons8 MCP server](https://github.com/icons8/icons8-mcp) bundled so a fresh
install needs no configuration and no subscription.

### Added

- **`icons8` skill** — one consistent icon set per project instead of a pile of mismatched ones: list
  every concept before searching, pick one pack and lock it in `icons8.json`, filter every search by
  that pack so results are different metaphors rather than ten styles of one, reject brand logos and
  literal machinery, preview on a free PNG contact sheet, and fetch SVG only for the approved final
  set. Bundled references: `PACKS.md` (pack selection, outline+filled pairs, coverage), `VOCABULARY.md`
  (concept → `commonName`, verified visually), `KITS.md` (ready concept lists per project type).

- **SVG paywall handling that an agent can act on.** Step 6 separates the three states that actually
  occur. `get_icon_svg` missing from the tool list means the account has no SVG plan — the tool exists
  server-side and answers when called, the server simply stops advertising it without a key. An
  explicit `{"error": "You don't have access to this tool. Use get_icon_png_url instead."}` is the
  common case and settles the question in one call. A quiet `{"svg": ""}` means a key that does not
  cover SVG. All three route to the same answer: the plan is at
  <https://icons8.com/icons/pricing>, the key goes into the MCP config as an
  `Authorization: Bearer <key>` header, and PNG at 2x ships meanwhile. Written because an agent read a
  four-tool list as "this server has no SVG at all" and proposed rewriting the skill to PNG-only.

- **A real free-tier answer to `currentColor`.** Colour inheritance is the one thing inline SVG buys
  in product UI, and a plain `<img>` cannot do it — but the same PNG used as a CSS alpha mask over
  `background-color: currentColor` can, keeping the genuine Icons8 drawing. Documented with the
  `-webkit-` prefix for Safari before 15.4 and with its raster ceiling stated, so it is not sold as
  parity with SVG. Explicitly separated from the `<svg><image>` wrapper it superficially resembles.
  Two independent eval runs invented this technique unprompted, which is why it is in the skill rather
  than rediscovered each session.

- **Discipline about unverified ids.** Ids come from `search_icons` and nowhere else. When
  `search_icons` is absent, the skill treats that as the finding to report — the user can connect the
  server, the agent cannot — then hands over whatever is genuinely verified and marks the rest
  unfinished. What it forbids is substituting an id remembered from a previous session or from the
  skill's own examples, which ships a wrong drawing under a right-looking name.

- **A detour table for the paywall**, naming what each shortcut actually produces: `format=svg`
  returns 403 `PAID_FORMAT`, tracing the PNG yields a path that is not the Icons8 drawing,
  `<svg><image href="data:image/png…">` is a raster in an SVG wrapper, a hand-written path is an
  invented icon, and swapping in Lucide or Heroicons introduces the second icon set this skill exists
  to prevent.

- **Correct licensing signal.** Paid icons omit `isFree` rather than setting it to `false`, so absence
  is the paid signal: a test for `isFree == false` never matches and indexing the key raises on every
  paid icon. Measured across 534 unique icons from seven searches — 228 with `isFree: true`, 306 with
  no such key, zero with `isFree: false`.

- **Trigger-tuned description.** The shipped wording was selected by a 20-query A/B run (10
  should-trigger, 10 should-not, 60/40 train/held-out split): it fires on 5 of 10 real-world phrasings
  against 0 of 10 for the first draft, with no false triggers on either — including the deliberate
  traps of an Icons8 billing question and a `mask-image` Safari bug. It names the carriers (screen,
  page, deck, doc, README, component), both extremes of scale, and explicit negative boundaries: not
  logo design, illustration, CSS bugs, accessibility labelling or billing.

- **Bundled Icons8 MCP server.** Installing the plugin registers `icons8mcp`
  (`npx mcp-remote https://mcp.icons8.com/mcp/`, exactly as the
  [MCP README](https://github.com/icons8/icons8-mcp#pick-your-plan) documents it) — check it with
  `/mcp` in Claude Code or `codex mcp list` in Codex. Keyless, so a fresh install works on the free
  PNG tier with nothing to configure and no sign-in step. Claude Code takes the server inline in
  `.claude-plugin/plugin.json`; Codex takes a path, so `.codex-plugin/plugin.json` points `mcpServers`
  at `./.codex-plugin/mcp.json`. Clients without plugin support get the skill on its own — the server
  is added per client, see README. Requires Node.js.

- **Plugin marketplace** — `.claude-plugin/marketplace.json`, installable with
  `/plugin marketplace add icons8/agent-skills` then `/plugin install icons8@icons8`.
  `.codex-plugin/plugin.json` carries `interface` metadata and default prompts for the Codex plugin
  browser; `.agents/plugins/marketplace.json` exposes the same plugin over a `git-subdir` source.

- **Apache-2.0 licensing** — `LICENSE` plus a `NOTICE` that separates the repository license from the
  [Icons8 icon license](https://icons8.com/license).

### Notes

- **SVG needs a key by design.** The MCP server only advertises `get_icon_svg` when the connection
  carries a non-empty bearer token. The bundled server is keyless, so subscribers add their own
  authenticated server entry (see README) — it sits alongside the bundled one, which means the PNG
  tools appear twice. Without a key the skill stays on free PNG URLs, its recommended path for
  prototyping regardless of plan.
