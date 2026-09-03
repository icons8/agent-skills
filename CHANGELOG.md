# Changelog

All notable changes to the **icons8** plugin are documented here.
Format: [Keep a Changelog](https://keepachangelog.com); versioning: [SemVer](https://semver.org).
The plugin version lives in three manifests that have to agree: `plugin.json`,
`.claude-plugin/plugin.json` and `.codex-plugin/plugin.json`.

## [0.2.0] — 2026-09-03

Two things land together here. The plugin now ships as a conforming
[Agent Plugins v1](https://agent-plugins.org/specification) package, so clients that implement the
standard install it from the repository root instead of needing a Claude Code or Codex specific
path. And the Icons8 server moved to OAuth, so signing in replaces pasting a key — which changes how
the skill reads the SVG paywall, and what the README tells you to do about it. The way the skill
picks icons is untouched.

### Added

- **`plugin.json` at the repository root** — the portable manifest, `$schema` pinned to
  `https://agent-plugins.org/schemas/1.0.0/plugin.schema.json`. Its schema is closed, so the fields
  the client-specific manifests carry outside that set (`skills`, `mcpServers`, `interface`) are not
  repeated here: `skills/` is already the location the spec fixes for discovery, and MCP
  configuration belongs in its own file.

- **`mcp.json` at the repository root** — the MCP configuration, at the path the specification fixes
  for it and with `$schema` pinned to `https://agent-plugins.org/schemas/1.0.0/mcp.schema.json`. A
  conforming client reads the server from here and from nowhere else, so this is where the Icons8
  server is now declared — once, rather than once per packaging format, with both client manifests
  pointing `mcpServers` at it.

### Changed

- **The bundled server connects over HTTP instead of through `npx mcp-remote`.** `mcp.icons8.com`
  speaks the MCP Streamable HTTP transport directly, so the entry is now
  `"type": "streamable-http"` with a `url`. That removes the bridge process and the Node.js
  requirement from every client that reads this file — Claude Code accepts `streamable-http` as an
  alias for its own `http` type. `npx mcp-remote` is gone from the documentation entirely: the
  older-Codex fallback is now `codex mcp add icons8mcp --url …`, so no path through these docs still
  needs the bridge or a Node.js runtime.

- **The Codex manifest's `description` now matches the other three.** It had been missing the closing
  "Bundles the Icons8 MCP server." since 0.1.0 — true then and truer now, since that manifest points
  at the same `mcp.json` as everything else.

- **The server authenticates with OAuth, so the README's plan section is rewritten.** Signing in
  through the browser is now the whole setup, and search and high-res PNG follow from it — the old
  "no account and no API key required" no longer describes what happens on first use. SVG needs no
  separate server either: the subscribed account carries the plan and `get_icon_svg` joins the other
  four tools. An API key in an `Authorization` header remains the path for a client that cannot do
  OAuth, and for CI, where nobody is around to sign in.

- **The skill reads the SVG gate as a plan, not as a key.** Step 6 used to tell the agent that the
  gate was "the connection's API key", so a signed-in paid user with no key in sight read as
  keyless — the wrong diagnosis, and the wrong advice to hand back. It now names the plan the
  connection carries, whether that comes from the signed-in account or from a bearer header, and
  adds the state no tool call can diagnose: when the client reports the whole server as needing
  authentication, nobody has signed in yet.

- **README names the install path per client.** VS Code takes a repository URL through
  `Chat: Install Plugin From Source` with no marketplace; Copilot CLI uses `copilot plugin install`;
  Cursor installs from marketplaces only. The section used to say "whatever install path that client
  documents", which is where the reader's actual question starts.

- **`.claude-plugin/` and `.codex-plugin/` keep their own manifests.** Claude Code is not on the
  [compatible clients](https://agent-plugins.org/compatible-clients) list and Codex still documents
  `.codex-plugin/plugin.json`, so the portable files are additive rather than a replacement — which
  is what the spec's own migration guidance calls for. What they no longer keep is their own copy of
  the server definition.

### Fixed

- **Codex found no plugin in the marketplace.** `codex plugin marketplace add icons8/agent-skills` —
  the command the README gives — added the marketplace and then listed nothing in the plugin browser,
  so the documented install path dead-ended. It had been broken since 0.1.0. The entry in
  `.agents/plugins/marketplace.json` declared a `git-subdir` source with `"path": "."`, and Codex
  resolves that source only for a real subdirectory: `"."`, `"./"` and `""` all yield an empty
  listing, while a genuine subdirectory resolves. The source is now `local` with `"path": "./"`,
  which resolves against the marketplace root and so covers a clone, a fork and a local checkout
  alike. Nothing else about the entry changes, and both `.codex-plugin/plugin.json` and the skill
  were always fine — only the marketplace index pointed into the void.

- **`claude plugin details` counted no MCP servers.** It reported `MCP servers (0)` while
  `claude mcp list` showed the server connected. Claude Code builds that inventory by reading a file
  named `.mcp.json` at the plugin root and does not resolve the path a manifest's `mcpServers`
  declares, so a manifest pointing at `mcp.json` left the count empty. The Agent Plugins
  specification fixes the configuration filename as `mcp.json` and forbids any alternative path, so
  `.mcp.json` is a symlink to it rather than a second file: one definition, reachable under both
  names. Where a checkout cannot create symlinks the count falls back to `0` and the server still
  loads, which is the behaviour before this change.

## [0.1.1] — 2026-08-11

Two facts the skill stated about the MCP server no longer held. Re-checked against the live API and
corrected; no behaviour of the skill's workflow changes.

### Fixed

- **`get_icon_svg` never answers with an empty string.** Every failure comes back as
  `{"error": ...}` — a bad id as `{"error": "Icons8 API: Icon not found (HTTP 404)"}` — so the two
  places that told the reader to test the `svg` string for emptiness were guarding a state that
  cannot occur. Both now test for the `error` key. Step 6's third state is rewritten the same way and
  says to read the message before blaming the plan: `Icon not found` is a wrong id, `Authentication
  data is invalid or missing (HTTP 401)` is the key.

- **`list_platforms` returns 130 packs, not 98, and `fluent` and `fluent-systems-regular` are both in
  it.** Three places said otherwise. `fluent-systems-regular` reports 9,186 icons, which puts it in
  the high-coverage group beside `win10` (9,196) — the old "not listed" cell in `PACKS.md` had kept it
  out of consideration for Windows work. The caution is kept without the stale example: a code
  missing from the list is still not proof the pack is gone.

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
