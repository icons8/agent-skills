#!/usr/bin/env python3
"""Build the directory-lite package of the plugin from tracked files.

    python3 .github/scripts/build_directory_package.py OUT_DIR

Anthropic's plugin directory accepts scripts, programs, package-manager files and unlisted
package.json fields only from Verified organizations. This builder assembles the part of the plugin
that the directory accepts: Markdown, JSON, YAML, text and images, plus the remote MCP entry. The
full plugin, scripts included, stays in the repository and installs from its own marketplace.

The single source is the tracked tree: nothing here is copied by hand, no symlinks are written.
Needs only the standard library and git.
"""

import json
import shutil
import subprocess
import sys
from pathlib import Path

REPO = Path(__file__).resolve().parents[2]

# Types the directory accepts without a Verified organization. Extension-less LICENSE and NOTICE
# are text files and stay.
ALLOWED_SUFFIXES = {".md", ".json", ".yaml", ".yml", ".txt", ".png", ".jpg", ".jpeg", ".gif", ".webp", ".ico", ".svg"}
ALLOWED_NAMES = {"LICENSE", "NOTICE"}
# Skills that cannot live without scripts stay in the full plugin only.
EXCLUDED_SKILLS = {"illustration-animator"}
# The sentence of the manifest description that promises what the lite package leaves out.
DROPPED_SENTENCE = " Animates static SVG illustrations into looped Lottie and MP4."
FULL_INSTALL = "/plugin marketplace add icons8/agent-skills"
# Notes the lite edition puts at the top of a skill whose text points at something it does not ship. The
# skill text below the note stays as it is in the full plugin; the note tells the agent what is missing
# and what to do instead, so it neither hunts for the missing file nor writes a stand-in for it.
NOTES = {
    "skills/ouch/SKILL.md": (
        "> **Directory edition.** This edition ships no scripts. `scripts/measure.py` (steps 5 and 6 below) is "
        "not available: do not look for it, and do not write a script or a shell command to stand in for it. "
        "Measure the ground line and the mass offset in a real browser as `references/LAYOUT.md` describes, judge "
        "saturation by eye on a contact sheet, and tell the user that saturation was judged by eye and not "
        "measured. The measuring script and the `illustration-animator` skill are in the full plugin "
        f"(`{FULL_INSTALL}`); mention that once, and only if the user asks for them.\n"
    ),
    "skills/icons8-design/SKILL.md": (
        "> **Directory edition.** The `illustration-animator` skill (a static SVG to a looped animation) is not "
        "in this edition. If someone asks for it, say it is in the full plugin "
        f"(`{FULL_INSTALL}`) and do not try to animate the SVG with a script of your own.\n"
    ),
}
MCP_ENTRY = {"mcpServers": {"icons8mcp": {"type": "http", "url": "https://mcp.icons8.com/mcp/"}}}


def tracked_files():
    out = subprocess.check_output(["git", "ls-files", "-z"], cwd=REPO).decode("utf-8")
    return [p for p in out.split("\0") if p]


def wanted(path):
    parts = Path(path).parts
    if parts[0] == "skills":
        return len(parts) > 2 and parts[1] not in EXCLUDED_SKILLS
    return path in {"LICENSE", "NOTICE", ".claude-plugin/icon.svg"}


def accepted_type(path):
    p = Path(path)
    return p.suffix.lower() in ALLOWED_SUFFIXES or p.name in ALLOWED_NAMES


def with_note(path, data):
    """Insert the directory-edition note right after the front matter of the skill."""
    note = NOTES.get(path)
    if note is None:
        return data
    text = data.decode("utf-8")
    head, sep, rest = text.partition("\n---\n")
    if not text.startswith("---\n") or not sep:
        sys.exit(f"{path}: no front matter to put the directory note after")
    return (head + sep + "\n" + note + "\n" + rest.lstrip("\n")).encode("utf-8")


def write(out, rel, data):
    target = out / rel
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_bytes(data)


def build(out):
    left_out = []
    for path in tracked_files():
        if not wanted(path):
            continue
        if not accepted_type(path):
            left_out.append(path)
            continue
        write(out, path, with_note(path, (REPO / path).read_bytes()))

    manifest = json.loads((REPO / ".claude-plugin" / "plugin.json").read_text(encoding="utf-8"))
    if DROPPED_SENTENCE not in manifest["description"]:
        sys.exit("manifest description no longer holds the sentence this builder drops; update DROPPED_SENTENCE")
    manifest["description"] = manifest["description"].replace(DROPPED_SENTENCE, "")
    write(out, ".claude-plugin/plugin.json", (json.dumps(manifest, indent=2, ensure_ascii=False) + "\n").encode("utf-8"))
    write(out, ".mcp.json", (json.dumps(MCP_ENTRY, indent=2) + "\n").encode("utf-8"))
    write(out, "README.md", (REPO / ".github" / "directory" / "README.md").read_bytes())
    return left_out


def main():
    if len(sys.argv) != 2:
        sys.exit(__doc__)
    out = Path(sys.argv[1]).resolve()
    if out.exists():
        shutil.rmtree(out)
    out.mkdir(parents=True)
    left_out = build(out)
    count = sum(1 for p in out.rglob("*") if p.is_file())
    print(f"built {count} files into {out}")
    for path in left_out:
        print(f"left out (type not accepted): {path}")


if __name__ == "__main__":
    main()
