#!/usr/bin/env python3
"""Validate the plugin's tracked files: packaging invariants and documentation integrity.

    python3 .github/scripts/validate_plugin.py

Runs on Linux in CI and needs no network, no credentials, and no packages outside the standard
library. Every check here covers a defect that has shipped or nearly shipped in a plugin of this
shape: a version that drifted between manifests, a bump without release notes, a marketplace source
that hides the plugin from a client, an `.mcp.json` that stopped being a symlink and became a second
server definition to keep in sync, a skill whose frontmatter stops loading, a reference file renamed
out from under the document that tells the agent to read it.

This plugin ships no executable scripts, so there is nothing to smoke-test: the product is the
manifests and the skill documents, and that is exactly what this checks.

`evals/`, `docs/` and `.claude/` are gitignored and stay local release steps — nothing here reads
them.
"""

import json
import os
import re
import subprocess
import sys
from pathlib import Path

REPO = Path(__file__).resolve().parents[2]

# Our own output carries an em dash. In CI stdout is a pipe, which Python encodes with the platform
# preferred encoding — the ANSI code page on Windows — and the dash would come back as a replacement
# character in the log. The CI job is Linux, but this script is also run by hand before a release;
# forcing UTF-8 keeps the diagnostics readable wherever it runs.
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

failures = []


def check(name, ok, detail=""):
    print(f"{'PASS' if ok else 'FAIL'}  {name}{'' if ok else ' — ' + detail}")
    if not ok:
        failures.append(name)


def read_json(rel):
    # A caller further down the file (the "*.json parses" loop) reports malformed JSON as its own
    # FAIL; this must not raise first and abort the run before that check reports. An unparsed file
    # becomes an empty dict, so every .get()-based check on it reports its own, accurate FAIL
    # instead of a bare traceback.
    try:
        return json.loads((REPO / rel).read_text(encoding="utf-8"))
    except json.JSONDecodeError:
        return {}


def first_plugin(rel):
    # Same reasoning as read_json: a marketplace file with malformed JSON, a missing "plugins" key,
    # or an empty "plugins" list must not raise KeyError/IndexError and abort the run — the checks
    # that read this entry already report FAIL on an empty dict via their own .get() calls.
    plugins = read_json(rel).get("plugins")
    return plugins[0] if isinstance(plugins, list) and plugins else {}


# --- 1. one version, and release notes to go with it ---------------------------
MANIFESTS = ("plugin.json", ".claude-plugin/plugin.json", ".codex-plugin/plugin.json")
versions = {m: read_json(m).get("version") for m in MANIFESTS}
check("the three manifests declare one version",
      len(set(versions.values())) == 1 and all(versions.values()), f"{versions}")

version = versions["plugin.json"]
changelog = (REPO / "CHANGELOG.md").read_text(encoding="utf-8")
check(f"CHANGELOG.md documents {version}", f"## [{version}]" in changelog,
      "the bump and its release notes have to land together")

# --- 2. the MCP server is declared exactly once --------------------------------
index = subprocess.run(["git", "ls-files", "-s", ".mcp.json"], cwd=REPO,
                       capture_output=True, text=True).stdout
check(".mcp.json is a symlink in the index (mode 120000)", index.startswith("120000 "),
      f"git ls-files reported {index.strip() or 'nothing'!r}; a copy reintroduces two definitions")

link = REPO / ".mcp.json"
check(".mcp.json points at mcp.json",
      link.is_symlink() and os.readlink(link) == "mcp.json",
      f"resolves to {os.readlink(link) if link.is_symlink() else 'a regular file'!r}")

servers = read_json("mcp.json").get("mcpServers", {})
check("mcp.json declares exactly one server, named icons8mcp", list(servers) == ["icons8mcp"],
      f"declares {list(servers)}")
check("the icons8mcp server is streamable-http",
      servers.get("icons8mcp", {}).get("type") == "streamable-http",
      f"type is {servers.get('icons8mcp', {}).get('type')!r}")

for manifest in (".claude-plugin/plugin.json", ".codex-plugin/plugin.json"):
    declared = read_json(manifest).get("mcpServers")
    check(f"{manifest} points at ./mcp.json by path", declared == "./mcp.json",
          f"got {declared!r}; an inline object is a second declaration to keep in sync")

check("the portable manifest adds no second declaration", "mcpServers" not in read_json("plugin.json"),
      "plugin.json must leave the declaration to mcp.json; the v1 plugin schema is closed and "
      "rejects the key outright")

# --- 3. both marketplaces resolve to this repository ---------------------------
codex_entry = first_plugin(".agents/plugins/marketplace.json")
check("the Codex marketplace uses a local source",
      codex_entry.get("source") == {"source": "local", "path": "./"},
      f"got {codex_entry.get('source')!r}; git-subdir resolves only for a real subdirectory, "
      "and this plugin sits at the repository root")

claude_entry = first_plugin(".claude-plugin/marketplace.json")
check("the Claude marketplace source is the repository root",
      claude_entry.get("source") == "./", f"got {claude_entry.get('source')!r}")
check("both marketplaces name the icons8 plugin",
      codex_entry.get("name") == "icons8" and claude_entry.get("name") == "icons8",
      f"codex={codex_entry.get('name')!r}, claude={claude_entry.get('name')!r}")

# --- 4. every skill is loadable and every tracked JSON file parses -------------
for skill_dir in sorted((REPO / "skills").iterdir()):
    if not skill_dir.is_dir():
        continue
    name = skill_dir.name
    text = (skill_dir / "SKILL.md").read_text(encoding="utf-8")
    matter = re.match(r"^---\n(.*?)\n---\n", text, re.S)
    check(f"{name}: SKILL.md opens with frontmatter", matter is not None,
          "the loader reads name and description from it")
    if not matter:
        continue
    fields = dict(re.findall(r"^(name|description):[ \t]*(.+)$", matter.group(1), re.M))
    check(f"{name}: frontmatter name matches the directory", fields.get("name") == name,
          f"frontmatter says {fields.get('name')!r}")
    check(f"{name}: frontmatter carries a description", bool(fields.get("description", "").strip()),
          "an empty description means the skill never triggers")

tracked_json = subprocess.run(["git", "ls-files", "*.json"], cwd=REPO,
                              capture_output=True, text=True).stdout.split()
# This only guards against git ls-files coming back empty (wrong cwd, a git failure, or a repo with
# no tracked JSON at all), which would make the "*.json parses" loop below silently vacuous. It does
# not assert that every expected manifest is present — a single deleted manifest still leaves plenty
# of other tracked JSON here, and that specific loss is caught by the checks above that read each
# manifest by name (version, mcpServers, marketplace entries, ...).
check("git ls-files returns tracked JSON files (the parse loop below isn't vacuous)",
      len(tracked_json) > 0, f"found {tracked_json}")
for rel in tracked_json:
    try:
        json.loads((REPO / rel).read_text(encoding="utf-8"))
        ok, detail = True, ""
    except (OSError, ValueError) as e:
        ok, detail = False, str(e)
    check(f"{rel} parses", ok, detail)

# --- 5. every document the skill sends the agent to read exists ----------------
# The skill instructs the agent to read `references/PACKS.md`, `references/VOCABULARY.md` and
# `references/KITS.md` by path. Rename or move one and the skill keeps loading, keeps triggering,
# and then fails at the step that needed the pack table — with nothing in the repository to catch
# it. A skill document's file references are its interface, the way a documented command is.
#
# Two token forms are collected: a backticked path (how this skill cites its references) and a
# Markdown link target. Only tokens containing "/" are checked, so a bare `SKILL.md` or `README.md`
# mentioned in prose is not read as a path relative to the skill directory.
REFERENCE = re.compile(r"`([^`\s]*/[^`\s]*\.md)`|\]\(([^)\s]*/[^)\s]*\.md)\)")
references_found = 0

for doc in sorted((REPO / "skills").rglob("*.md")):
    lines = doc.read_text(encoding="utf-8").splitlines()
    rel_doc = doc.relative_to(REPO)
    for lineno, line in enumerate(lines, start=1):
        for backticked, linked in REFERENCE.findall(line):
            token = backticked or linked
            if token.startswith(("/", "http://", "https://")):
                continue
            references_found += 1
            target = (doc.parent / token).resolve()
            check(f"{rel_doc}:{lineno}: {token} exists", target.is_file(),
                  f"line {lineno}: {line.strip()!r}; the skill tells the agent to read this file")

check("the skill documents cite at least one reference file (the loop above isn't vacuous)",
      references_found > 0,
      "no backticked or linked relative .md path found under skills/; either the citations were "
      "reworded and this check now proves nothing, or the reference files are no longer referenced")

print()
print(f"{len(failures)} failure(s)" if failures else "ALL CHECKS PASSED")
sys.exit(1 if failures else 0)
