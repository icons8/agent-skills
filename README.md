# Icons8 — Agent Skills

Two [Agent Skills](https://agentskills.io) that give coding agents taste when picking Icons8
artwork: `icons8` for icons and `ouch` for Ouch! illustrations, so a project ends up with
**one consistent set** instead of a pile of mismatched pieces.

Ships as a Claude Code plugin that bundles the [Icons8 MCP server](https://github.com/icons8/icons8-mcp)
(420,000+ icons across 132 styles). Installing it is the whole setup: sign in through the browser
once on first use, and search and high-res PNG are free from there. No API key to paste.

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

That registers both the skill and the Icons8 MCP server. Approve the server on first use, sign in
when the browser opens, and start asking for icons. `/mcp` signs in again later if you need it.

### OpenAI Codex

```
codex plugin marketplace add icons8/agent-skills
```

Then install **icons8** from the plugin browser (`/plugins`, or the Plugins section in the Codex app).
The skill triggers by intent — just ask for icons; slash commands are Claude Code-only.

The plugin **bundles the MCP server here too**, so installing it registers `icons8mcp` — check with
`codex mcp list`, and sign in with `codex mcp login icons8mcp`. `.codex-plugin/plugin.json` points
`mcpServers` at the root `./mcp.json`, the same file Claude Code and every Agent Plugins v1 client
read, so there is one server definition rather than one per format.

On an older Codex that doesn't read `mcpServers` from a plugin manifest, add it yourself:

```
codex mcp add icons8mcp --url https://mcp.icons8.com/mcp/
```

or in `~/.codex/config.toml`:

```toml
[mcp_servers.icons8mcp]
url = "https://mcp.icons8.com/mcp/"
```

Either way the server has to be there: icon ids come from `search_icons` and nowhere else, so without
it the skill reports that it isn't connected rather than guessing an id.

### Any Agent Plugins v1 client

The repository root is a conforming [Agent Plugins v1](https://agent-plugins.org/specification)
package: `plugin.json` is the portable manifest, `mcp.json` declares the Icons8 server, and `skills/`
is the location the spec fixes for skill discovery. Clients on the
[compatible clients](https://agent-plugins.org/compatible-clients) list pick up both the skill and
the server from those files.

In **VS Code**, no marketplace is needed — run `Chat: Install Plugin From Source` from the Command
Palette and paste the repository URL. In **GitHub Copilot CLI**, `copilot plugin install`; what it
installs also shows up in VS Code. **Cursor** installs from marketplaces only, so it needs the plugin
listed in one — either Cursor's registry or a team marketplace imported from a repo.

`.claude-plugin/` and `.codex-plugin/` keep their manifests, because Claude Code isn't on the
compatible-clients list yet and Codex still reads its own. They no longer keep their own copy of the
server, though: both point `mcpServers` at the root `mcp.json`.

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

**Free high-res PNG** — what the plugin bundles, once you sign in. The server exposes
`search_icons`, `list_categories`, `list_platforms` and `get_icon_png_url`, which is everything the
skill needs to choose a pack, build the contact sheet, and prototype straight from
`https://img.icons8.com/?id=…&format=png&size=24`. Free icon usage requires attribution — see the
[Icons8 license](https://icons8.com/license).

**Full SVG access** — [subscribe for $15](https://icons8.com/icons/pricing). There is no second
setup: the account you already signed in with carries the plan, and a fifth tool, `get_icon_svg`,
appears alongside the other four. The skill's final step then inlines real SVG for the approved set.
If the agent still hands back PNG, sign in again so it picks up the new plan — `/mcp` in Claude Code,
`codex mcp login icons8mcp` in Codex, **Connect** in Cursor.

**A client without OAuth** — send an API key instead. The MCP tab of your Icons8 account has the
snippet with your key already in it, or write the header by hand:

```json
{
  "mcpServers": {
    "icons8mcp": {
      "type": "http",
      "url": "https://mcp.icons8.com/mcp/",
      "headers": {
        "Authorization": "Bearer YOUR_API_KEY"
      }
    }
  }
}
```

In Claude Code the same thing is one command:

```bash
claude mcp add --transport http icons8mcp https://mcp.icons8.com/mcp/ \
  --header "Authorization: Bearer YOUR_API_KEY"
```

A key skips the browser entirely, which is what you want on a build server or in CI where nobody is
around to sign in. If you set this up with a key before, leave it alone — it still works.

Without a paid plan the skill stays on the PNG path, which is its recommended path for prototyping
regardless of plan.

## What's inside

```
plugin.json                   # Agent Plugins v1 manifest — the portable one
mcp.json                      # the only MCP config; all three manifests point here
.mcp.json                     # symlink to it — the name Claude Code's inventory looks for
.claude-plugin/               # Claude Code manifest + marketplace
.codex-plugin/                # Codex manifest
.agents/plugins/              # Agent Plugins marketplace entry
skills/icons8/
├── SKILL.md                  # the loop, the rejection rules, criteria by context, gotchas
└── references/
    ├── PACKS.md              # which pack for which job, outline+filled pairs, coverage numbers
    ├── VOCABULARY.md         # concept → commonName map, verified visually, plus the traps
    └── KITS.md               # ready concept lists: SaaS UI, landing, ecommerce, dev docs, analytics
skills/ouch/
├── SKILL.md                  # the sequence, hard rules, the priority ladder, gotchas
├── references/
│   ├── STYLES.md             # the 43-style first tier, the free tier in full, styles by surface
│   ├── SLOTS.md              # slot kits per project type, thin subjects
│   └── VOCABULARY.md         # state → search query map, measured against the live server
└── scripts/measure.py        # ground line, mass offset, saturation: one source of the formulas
```

Reference files load on demand, so the cost of having them is close to zero until they're needed.

The three manifests describe the same plugin for three packaging formats, so `version` and
`description` have to move together. The server itself is declared once, in `mcp.json`.

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

## Illustrations: the `ouch` skill

The same discipline for [Ouch! illustrations](https://icons8.com/illustrations): hero images,
empty states, onboarding, 404s and docs spots, from a catalog of 345 styles. What it enforces,
each rule earned in test runs rather than declared:

- **The picture is about the product, not about the interface.** Every slot query carries the
  product's own noun. Empty states show the missing container (an empty pot for a plant app),
  never a happy owner of the thing the heading says is absent.
- **One style per project**, locked in `ouch.json`, with named escapes: an existing page's style
  always wins, and a public repo filters to `free_distribution: true`.
- **A first-tier shortlist of 43 styles** picked by the Icons8 side: a preference with named
  exits, not a fence. Subject coverage outranks tone, and the skill's priority ladder says in
  which order the rules give way.
- **Contrast gate** for non-white backgrounds, and layout rules measured in real browsers:
  absolute box heights, `max-height` never upscales a small SVG, ground-line alignment for 3D
  artwork. `scripts/measure.py` ships with the skill and does the measuring.
- **Watermarked previews are for choosing; originals are fetched once, for the approved set.**
  Presigned URLs live an hour and never go into a page.

**Server note:** `mcp.icons8.com` currently exposes the icon tools. The illustration tools
(`search_illustrations`, `get_illustration_svg`, `get_illustration_png_url`,
`list_illustrations_styles`, `list_illustrations_categories`) ship with an upcoming server
release. Until they appear, the skill reports them as unavailable and stops, per its own rules.

## Requirements

- A client that supports the Agent Skills standard (Claude Code, Codex, VS Code + Copilot, Cursor, …)
- Network access to `https://mcp.icons8.com/mcp/`
- An Icons8 account, signed in through the browser on first use
- An Icons8 API key **only** where the client cannot do OAuth, or on CI

## License

Apache-2.0 — see [LICENSE](LICENSE) and [NOTICE](NOTICE).

The license covers this repository, not the icon artwork. Icons are licensed separately under the
[Icons8 license](https://icons8.com/license): free icons require attribution, SVG delivery requires
a paid plan. If the assets ship in a product, confirm the license before handing over paid icons.
