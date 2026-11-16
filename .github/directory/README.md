# Icons8 for Claude (directory edition)

Icons8 icons and Ouch! illustrations for Claude, plus a design pass over what Claude built with them.
This is the edition published to the Claude plugin directory; the full plugin for Claude Code, Codex,
Cursor and Copilot installs from the repository (see below).

The plugin locks a project to one icon pack and one illustration style, rejects wrong metaphors and
generic art, and checks the finished screen for emoji standing in for icons, missing images, dead
placeholders, broken icon imports, keyboard reach, contrast and token drift.

It connects to the Icons8 MCP server at `https://mcp.icons8.com/mcp/`. Installing the plugin
registers the server, and the first call opens the Icons8 sign-in in the browser.

## What this edition contains

This edition holds the skills that need no program on your machine: Markdown skill documents,
reference files and the remote MCP entry. Two things live only in the full plugin:

- `illustration-animator`, which turns static SVG illustrations into looped Lottie and MP4 and runs
  its own local engine.
- The measuring script of the `ouch` skill.

## Install the full plugin

```
/plugin marketplace add icons8/agent-skills
/plugin install icons8@icons8
```

The source, the changelog and the full plugin are at https://github.com/icons8/agent-skills.

## License

Apache-2.0. See `LICENSE` and `NOTICE`.
