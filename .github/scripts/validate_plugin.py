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
import py_compile
import re
import subprocess
import sys
import tempfile
from pathlib import Path

REPO = Path(__file__).resolve().parents[2]

# Our own output carries an em dash. In CI stdout is a pipe, which Python encodes with the platform
# preferred encoding — the ANSI code page on Windows — and the dash would come back as a replacement
# character in the log. The CI job is Linux, but this script is also run by hand before a release;
# forcing UTF-8 keeps the diagnostics readable wherever it runs.
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

failures = []
skips = []


def check(name, ok, detail=""):
    print(f"{'PASS' if ok else 'FAIL'}  {name}{'' if ok else ' — ' + detail}")
    if not ok:
        failures.append(name)


def skip(name, why):
    # A check that has nothing to look at must say so out loud. A dormant check that prints nothing
    # is indistinguishable from a passing one, and that is how a suite quietly stops covering the
    # thing it was written for.
    print(f"SKIP  {name} — {why}")
    skips.append(name)


def tracked(pattern):
    out = subprocess.run(["git", "ls-files", "-z", "--", pattern], cwd=REPO,
                         capture_output=True, text=True, encoding="utf-8").stdout
    return [p for p in out.split("\0") if p]


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
                       capture_output=True, text=True, encoding="utf-8").stdout
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

tracked_json = tracked("*.json")
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

# --- 6. any shipped Python script, whenever one lands -------------------------
# The plugin ships no script today. These checks are written now, discover scripts by glob, and
# start covering the first one the moment it is committed — no edit to this file required. They are
# brila's, and each one is a defect that shipped there: a locale-dependent decode that crashed every
# run with a non-ASCII argument on Windows, and an export written through Windows text mode.
SHIPPED_SCRIPTS = [p for p in tracked("*.py") if p.startswith("skills/")]


def calls(source, pattern):
    # Match a call and its arguments across newlines, tolerating one level of nested parentheses
    # (a dict, a tuple, an f-string call). Deeper nesting is not matched at all, so the inspected
    # count is printed with every verdict: a call this regex cannot see is a gap in the check, and
    # the number is what makes that gap visible instead of silent.
    return re.findall(pattern + r"\((?:[^()]|\([^()]*\))*\)", source, re.S)


if not SHIPPED_SCRIPTS:
    skip("shipped Python scripts byte-compile and name their encodings",
         "no tracked *.py under skills/ yet; the checks are armed and run on the first one")
else:
    for rel in SHIPPED_SCRIPTS:
        path = REPO / rel
        source = path.read_text(encoding="utf-8")

        # cfile can't be os.devnull: /dev/null is a character device, and CPython's atomic bytecode
        # writer refuses to overwrite a non-regular file, raising a bare FileExistsError (not
        # py_compile.PyCompileError) that would crash this script instead of reporting a failed check.
        with tempfile.TemporaryDirectory() as tmp_dir:
            try:
                py_compile.compile(str(path), cfile=os.path.join(tmp_dir, "checked.pyc"), doraise=True)
                ok, detail = True, ""
            except py_compile.PyCompileError as e:
                ok, detail = False, str(e)
        check(f"{rel} byte-compiles", ok, detail)

        # text=True alone decodes with the platform locale, which is the ANSI code page on Windows:
        # cp1252 raises UnicodeDecodeError on a Cyrillic byte and cp1251 produces mojibake.
        run_calls = calls(source, r"subprocess\.run")
        text_mode = [c for c in run_calls
                     if "text=True" in c or "universal_newlines=True" in c]
        check(f"{rel}: every text-mode subprocess.run names encoding= "
              f"({len(text_mode)} of {len(run_calls)} call(s) inspected)",
              all("encoding=" in c for c in text_mode),
              "without encoding= Python decodes the child's output with the platform locale")

        # Same defect on the file side. Binary mode is exempt: open(path, "rb") takes no encoding=
        # and decodes nothing, so demanding one there would report a defect that cannot exist.
        open_calls = calls(source, r"(?<![\w.])open") + calls(source, r"\.(?:read_text|write_text)")
        text_calls = [c for c in open_calls if not re.search(r"""["'][rwax+]*b[rwax+]*["']""", c)]
        check(f"{rel}: every text-mode open()/read_text()/write_text() names encoding= "
              f"({len(text_calls)} of {len(open_calls)} call(s) inspected)",
              all("encoding=" in c for c in text_calls),
              "an unnamed encoding is the ANSI code page on Windows, for reads and writes alike")

        # Windows text mode rewrites every LF as CRLF on write. That only matters for a file
        # something else reads afterwards, so a scratch file the script deletes itself is exempt —
        # and the exemption is counted in the check's name rather than applied silently.
        writes = [c for c in text_calls
                  if re.search(r"""["'][rax+]*[wax]\+?["']""", c) or ".write_text(" in c]
        throwaway = []
        for call in writes:
            target = re.match(r"[\w.]+\(\s*([A-Za-z_][\w.]*)", call)
            if target and re.search(rf"(?:os\.remove|os\.unlink|\.unlink)\(\s*{re.escape(target.group(1))}\b",
                                    source):
                throwaway.append(call)
        kept = [c for c in writes if c not in throwaway]
        check(f"{rel}: every kept write names newline= "
              f"({len(kept)} of {len(writes)} write call(s) inspected, "
              f"{len(throwaway)} deleted by the script itself)",
              all("newline=" in c for c in kept),
              'Windows text mode otherwise rewrites every LF as CRLF; pass newline="\\n"')

# --- 7. every documented invocation is one an agent can actually run ----------
# One line, one invocation. \S* eats whatever precedes the filename — "./", a full relative path, a
# quote, or $CLAUDE_PLUGIN_ROOT — so the captured group is the whole path token to classify.
INVOCATION = re.compile(r"(?:python3?|py\s+-3)\s+(\S*\.py)")
DOCS = [rel for rel in tracked("*.md")
        if rel.startswith(("skills/", "commands/")) or rel == "README.md"]
invocations_found = 0

for rel in DOCS:
    text = (REPO / rel).read_text(encoding="utf-8")
    lines = text.splitlines()
    # Bind each check to the SPECIFIC line it is about, not to the whole file — a whole-file
    # substring check is satisfied by any one matching line, so quoting stripped from one of
    # several invocations still passes as long as another invocation stays quoted.
    for lineno, line in enumerate(lines, start=1):
        match = INVOCATION.search(line)
        if not match:
            continue
        invocations_found += 1
        path_token = match.group(1).strip("\"'`")
        rooted = path_token.startswith(("/", "$CLAUDE_PLUGIN_ROOT", "${CLAUDE_PLUGIN_ROOT}"))
        check(f"{rel}:{lineno}: no relative script path", rooted,
              f"line {lineno}: {line.strip()!r}; the agent's working directory is the user's "
              "project, not this plugin")
        check(f"{rel}:{lineno}: the script path is quoted against spaces",
              '"$CLAUDE_PLUGIN_ROOT' in line or '"${CLAUDE_PLUGIN_ROOT}' in line,
              f"line {lineno}: {line.strip()!r}; Windows profile directories routinely contain a space")
    if re.search(r"(?<![\w-])python3(?![\w-])", text):
        # File-scoped on purpose: the Windows fallback is documented once, in prose, for the whole
        # file — not repeated on every invocation line. Both `py -3` and the bare `py` launcher
        # count: the point is that a Windows reader is told what to type instead of python3, and
        # `py` resolves to the highest installed 3.x. `py -3` is still the better thing to write.
        # The dot in the lookbehind matters: without it every ".py" filename in the document
        # matches "py" and the check passes on a file that never names the interpreter at all.
        check(f"{rel}: names the Windows interpreter",
              re.search(r"(?<![\w.-])py(?:\s+-3)?(?![\w-])", text) is not None,
              "python.org's installer creates no python3, and the Store stub exits without running")

if not invocations_found:
    skip("documented invocations are rooted, quoted and Windows-runnable",
         "no python invocation documented yet; the checks are armed and run on the first one")

print()
print(f"{len(skips)} skipped (nothing to check yet)" if skips else "")
print(f"{len(failures)} failure(s)" if failures else "ALL CHECKS PASSED")
sys.exit(1 if failures else 0)
