# Icons8 — Agent Skills

An [Agent Skill](https://agentskills.io) that gives coding agents taste when picking icons, so a
project ends up with **one consistent set** instead of a pile of mismatched icons.

Ships as a Claude Code plugin that bundles the [Icons8 MCP server](https://github.com/icons8/icons8-mcp)
(368,000+ icons across 100+ styles). Works out of the box, no account and no API key required.

## Why

The MCP server is a thin wrapper over the Icons8 search API. It gives an agent five tools and no
judgement, and the default behaviour fails in three specific ways:

1. **Unfiltered search returns one metaphor in ten styles.** Asking for `delete` twelve times
   returns the same trash can in twelve different packs — one idea, no alternatives, and whatever
   gets picked won't match the icon picked five minutes earlier.
2. **Ranking is not taste-ranking.** `settings` puts four Apple logos above the plain gear;
   `dashboard` puts a car dashboard gauge first. The API matches names and tags — it doesn't know
   you're building a settings screen.
3. **SVG is the slow, paid path.** One call per icon, and payloads run from 600 characters to
   46,000. PNG previews are free, instant, and need no MCP call at all.

The skill fixes all three: it lists every concept a screen needs *before* searching, picks one pack
for the whole project and locks it in `icons8.json`, filters every search by that pack so results are
ten different metaphors instead of ten styles of one, rejects the brand logos and machine parts that
search ranks first, previews on a free PNG contact sheet, and fetches SVG only for the approved
final set.

## Install

### Claude Code

```
/plugin marketplace add icons8/agent-skills
/plugin install icons8@icons8
```

That registers both the skill and the Icons8 MCP server. Nothing else to configure — approve the
server on first use and start asking for icons.

### OpenAI Codex

```
codex plugin marketplace add icons8/agent-skills
```

Then install **icons8** from the plugin browser (`/plugins`, or the Plugins section in the Codex app).
The skill triggers by intent — just ask for icons; slash commands are Claude Code-only.

The plugin **bundles the MCP server here too**, so installing it registers `icons8mcp` — check with
`codex mcp list`. No sign-in step: the free PNG tier needs no key. `.codex-plugin/plugin.json` points
`mcpServers` at `./.codex-plugin/mcp.json` (Codex takes a *path* here, unlike Claude Code's inline
object), declaring the same `npx mcp-remote` command Claude Code uses.

On an older Codex that doesn't read `mcpServers` from a plugin manifest, add it yourself:

```
codex mcp add icons8mcp -- npx mcp-remote https://mcp.icons8.com/mcp/
```

or in `~/.codex/config.toml`:

```toml
[mcp_servers.icons8mcp]
command = "npx"
args = ["mcp-remote", "https://mcp.icons8.com/mcp/"]
```

Either way the server has to be there: icon ids come from `search_icons` and nowhere else, so without
it the skill reports that it isn't connected rather than guessing an id.

### Any agent via npx

Using the community [`skills`](https://www.npmjs.com/package/skills) installer (installs the bare
skill, not the plugin/marketplace):

```
npx skills add icons8/agent-skills --skill icons8 -a claude-code
# -a codex to target Codex instead, or '*' for every detected agent; add -g for a global install
```

This route installs the skill alone, so no MCP server is registered — add it for your client following
the [icons8-mcp README](https://github.com/icons8/icons8-mcp#pick-your-plan). Until you do, the skill
has nothing to search and will say so.

## Pick your plan

**Free high-res PNG** — what the plugin bundles. No key, no account. The server exposes
`search_icons`, `list_categories`, `list_platforms` and `get_icon_png_url`, which is everything the
skill needs to choose a pack, build the contact sheet, and prototype straight from
`https://img.icons8.com/?id=…&format=png&size=24`. Free icon usage requires attribution — see the
[Icons8 license](https://icons8.com/license).

**Full SVG access** — [subscribe for $15](https://icons8.com/icons/pricing), then add the
authenticated server yourself, following the
[MCP README](https://github.com/icons8/icons8-mcp#pick-your-plan). In Claude Code:

```bash
claude mcp add icons8mcp-svg -- \
  npx mcp-remote https://mcp.icons8.com/mcp/ \
  --header "Authorization: Bearer YOUR_API_KEY"
```

A fifth tool, `get_icon_svg`, becomes available and the skill's final step inlines real SVG for the
approved set. Two things worth knowing:

- The server only advertises `get_icon_svg` when a non-empty bearer token is present, which is why
  the keyless bundled server shows four tools rather than a fifth one that fails.
- Your authenticated server sits *alongside* the bundled one, so the PNG tools appear twice. If that
  bothers you, disable the `icons8` plugin and keep only your own server entry — the skill itself
  works either way.

Without a key the skill stays on the PNG path, which is its recommended path for prototyping
regardless of plan.

## What's inside

```
skills/icons8/
├── SKILL.md                  # the loop, the rejection rules, criteria by context, gotchas
└── references/
    ├── PACKS.md              # which pack for which job, outline+filled pairs, coverage numbers
    ├── VOCABULARY.md         # concept → commonName map, verified visually, plus the traps
    └── KITS.md               # ready concept lists: SaaS UI, landing, ecommerce, dev docs, analytics
```

Reference files load on demand, so the cost of having them is close to zero until they're needed.

## The lock file

One pack per project is the whole point, and it has to survive across sessions and across agents.
The skill writes `icons8.json` next to the project and treats it as binding — no second pack, not
even for one extra icon:

```json
{
  "pack": "m_outlined",
  "size": 24,
  "color": "1F2937",
  "icons": {
    "settings": { "id": "82535", "commonName": "settings" }
  }
}
```

Commit it. The next session picks up where this one left off.

## Requirements

- A client that supports the Agent Skills standard (Claude Code, Codex, VS Code + Copilot, Cursor, …)
- [Node.js](https://nodejs.org/) — the bundled server runs through `npx mcp-remote`
- Network access to `https://mcp.icons8.com/mcp/`
- An Icons8 API key **only** for SVG delivery

## License

Apache-2.0 — see [LICENSE](LICENSE) and [NOTICE](NOTICE).

The license covers this repository, not the icon artwork. Icons are licensed separately under the
[Icons8 license](https://icons8.com/license): free icons require attribution, SVG delivery requires
a paid plan. If the assets ship in a product, confirm the license before handing over paid icons.
