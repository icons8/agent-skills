#!/usr/bin/env python3
"""Verify the plugin survives a checkout on the operating system this is running on.

    python3 .github/scripts/verify_portability.py

Runs on Linux, macOS and Windows. Everything it asserts is a fact about the tracked files as this
platform's `git checkout` produced them, so the same script reports different things per runner —
which is the point of the matrix. Windows is where it earns its keep:

  1. Git for Windows sets `core.autocrlf=true` in its system configuration, so without a
     `.gitattributes` every checked-out file arrives with CRLF. A strict frontmatter parser looks
     for "^---\\n" and does not find it.
  2. Windows checks out with `core.symlinks=false`, so `.mcp.json` is not a symlink there but a
     regular file whose content is the link target. A client that reads it directly gets the text
     "mcp.json" where JSON was expected — the plugin must not depend on that file resolving.
  3. NTFS and APFS are case-insensitive, so `references/packs.md` opens the real `PACKS.md` on a
     developer's machine and 404s for a Linux user. Case is checked against the directory listing,
     not with `is_file()`.
  4. Windows rejects a set of file names outright (reserved device names, `< > : " | ? *`, a
     trailing dot or space), and a case-insensitive filesystem silently merges two paths that
     differ only in case. Either one breaks `git clone` on Windows.

Needs no network, no credentials, and no packages outside the standard library.
"""

import os
import re
import subprocess
import sys
from pathlib import Path

REPO = Path(__file__).resolve().parents[2]

# Windows encodes a piped stdout with the ANSI code page, which turns the em dash in our own
# diagnostics into a replacement character in the job log. This suite exists to catch that class of
# defect and is not exempt from it.
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

WINDOWS_RESERVED = {"CON", "PRN", "AUX", "NUL",
                    *(f"COM{i}" for i in range(1, 10)),
                    *(f"LPT{i}" for i in range(1, 10))}
WINDOWS_ILLEGAL = set('<>:"|?*')

failures = []
skips = []


def check(name, ok, detail=""):
    print(f"{'PASS' if ok else 'FAIL'}  {name}{'' if ok else ' — ' + detail}")
    if not ok:
        failures.append(name)


def skip(name, why):
    print(f"SKIP  {name} — {why}")
    skips.append(name)


def git(*args):
    return subprocess.run(["git", *args], cwd=REPO, capture_output=True, text=True,
                          encoding="utf-8").stdout


# -z keeps non-ASCII paths verbatim: git quotes them with backslash escapes otherwise, and a quoted
# path would not resolve on disk.
TRACKED = [p for p in git("ls-files", "-z").split("\0") if p]
# The index, not the working tree: a mode is what we ship, and it is the same on every runner.
INDEX = dict((line.split("\t", 1)[1], line.split(" ", 1)[0])
             for line in git("ls-files", "-s", "-z").split("\0") if "\t" in line)

check("git ls-files returns tracked files (the loops below aren't vacuous)",
      len(TRACKED) > 5, f"found {len(TRACKED)}")

# --- 1. every shipped byte is UTF-8, with no BOM -------------------------------
# Read bytes, never text: text mode would translate CRLF away before check 2 could see it, and
# would decode away the very bytes check 1 is looking for.
TEXT_SUFFIXES = {".md", ".json", ".py", ".yml", ".yaml", ".txt", ".sh", ".gitignore", ".gitattributes"}
contents = {}
for rel in TRACKED:
    path = REPO / rel
    if INDEX.get(rel) == "120000" or not path.is_file():
        continue
    contents[rel] = path.read_bytes()

for rel, raw in contents.items():
    if Path(rel).suffix not in TEXT_SUFFIXES and Path(rel).name not in TEXT_SUFFIXES:
        continue
    try:
        raw.decode("utf-8")
        ok, detail = True, ""
    except UnicodeDecodeError as e:
        ok, detail = False, str(e)
    check(f"{rel} is valid UTF-8", ok, detail)
    check(f"{rel} carries no BOM", not raw.startswith(b"\xef\xbb\xbf"),
          "a BOM ends up in the first heading, the first JSON key, or the frontmatter delimiter")

# --- 2. the checkout kept LF ---------------------------------------------------
attributes = (REPO / ".gitattributes")
check(".gitattributes exists and pins eol=lf",
      attributes.is_file() and "eol=lf" in attributes.read_text(encoding="utf-8"),
      "without it Git for Windows checks out CRLF, because its system config sets "
      "core.autocrlf=true")

crlf = sorted(rel for rel, raw in contents.items() if b"\r\n" in raw)
check(f"no tracked file carries CRLF on {sys.platform} ({len(contents)} file(s) read as bytes)",
      not crlf, f"{crlf}; this platform's checkout rewrote the line endings")

# --- 3. the MCP server resolves whatever the checkout did to the symlink -------
check(".mcp.json is a symlink in the index (mode 120000)", INDEX.get(".mcp.json") == "120000",
      f"index reports mode {INDEX.get('.mcp.json')!r}; a copy reintroduces two definitions")

link = REPO / ".mcp.json"
if link.is_symlink():
    state = f"a symlink to {os.readlink(link)!r}"
    resolved = os.readlink(link) == "mcp.json"
else:
    # This is the Windows checkout: core.symlinks=false writes a regular file whose content is the
    # link target. Any third state — a copy of mcp.json, an empty file — means the symlink was
    # replaced in the repository and two server definitions now drift apart.
    body = link.read_bytes().decode("utf-8", "replace").strip()
    state = f"a regular file containing {body[:40]!r}"
    resolved = body == "mcp.json"
check(f".mcp.json is {state}", resolved,
      "expected either a symlink to mcp.json or, on a checkout without symlink support, a file "
      "whose content is the link target")

for manifest in (".claude-plugin/plugin.json", ".codex-plugin/plugin.json"):
    text = (REPO / manifest).read_text(encoding="utf-8")
    check(f"{manifest} reaches the server without .mcp.json", '"./mcp.json"' in text,
          "on a checkout with no symlink support .mcp.json is unreadable, so the client manifests "
          "are the only path left to the declaration")

# --- 4. cited reference paths match the case on disk ---------------------------
# is_file() is case-insensitive on NTFS and APFS, so it would pass a citation that only a Linux
# user's checkout rejects. Compare against the directory listing instead.
REFERENCE = re.compile(r"`([^`\s]*/[^`\s]*\.md)`|\]\(([^)\s]*/[^)\s]*\.md)\)")
citations = 0

for rel in TRACKED:
    if not rel.startswith("skills/") or not rel.endswith(".md"):
        continue
    doc = REPO / rel
    for lineno, line in enumerate(doc.read_text(encoding="utf-8").splitlines(), start=1):
        for backticked, linked in REFERENCE.findall(line):
            token = backticked or linked
            if token.startswith(("/", "http://", "https://")):
                continue
            citations += 1
            target = doc.parent
            exact = True
            for part in Path(token).parts:
                listing = os.listdir(target) if target.is_dir() else []
                if part not in listing:
                    exact = False
                    break
                target = target / part
            check(f"{rel}:{lineno}: {token} matches the case on disk", exact and target.is_file(),
                  f"line {lineno}: {line.strip()!r}; a case-insensitive filesystem resolves this "
                  "and a Linux checkout does not")

check("the skill documents cite at least one reference file (the loop above isn't vacuous)",
      citations > 0, "no relative .md citation found under skills/")

# --- 5. every tracked path can exist on Windows --------------------------------
illegal = {}
for rel in TRACKED:
    for part in Path(rel).parts:
        problems = []
        if part.split(".")[0].upper() in WINDOWS_RESERVED:
            problems.append("a reserved device name")
        if set(part) & WINDOWS_ILLEGAL:
            problems.append(f"the character(s) {sorted(set(part) & WINDOWS_ILLEGAL)}")
        if part.endswith((".", " ")):
            problems.append("a trailing dot or space")
        if problems:
            illegal[f"{rel} → {part}"] = ", ".join(problems)
check(f"every tracked path is legal on Windows ({len(TRACKED)} path(s) checked)", not illegal,
      f"{illegal}; git clone fails or silently renames these")

lowered = {}
for rel in TRACKED:
    lowered.setdefault(rel.lower(), []).append(rel)
collisions = {k: v for k, v in lowered.items() if len(v) > 1}
check("no two tracked paths differ only in case", not collisions,
      f"{collisions}; a case-insensitive filesystem merges them into one file on clone")

# --- 6. any shipped Python script loads under this runner's interpreter --------
# Not a smoke test: this plugin's MCP server is remote and CI holds no credentials, so there is no
# offline path to exercise. Byte-compiling on each runner still catches the class of defect the
# matrix exists for — syntax this runner's Python version rejects.
SHIPPED_SCRIPTS = [p for p in TRACKED if p.startswith("skills/") and p.endswith(".py")]
if not SHIPPED_SCRIPTS:
    skip("shipped Python scripts load under this interpreter",
         "no tracked *.py under skills/ yet; the check is armed and runs on the first one")
for rel in SHIPPED_SCRIPTS:
    res = subprocess.run([sys.executable, "-m", "py_compile", str(REPO / rel)],
                         capture_output=True, text=True, encoding="utf-8")
    check(f"{rel} byte-compiles on {sys.platform} with Python "
          f"{sys.version_info.major}.{sys.version_info.minor}",
          res.returncode == 0, (res.stderr or res.stdout)[-300:])

print()
if skips:
    print(f"{len(skips)} skipped (nothing to check yet)")
print(f"{len(failures)} failure(s)" if failures else "ALL CHECKS PASSED")
sys.exit(1 if failures else 0)
