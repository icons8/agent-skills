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
    "skills/motion/SKILL.md": (
        "> **Directory edition.** The `illustration-animator` skill (a static SVG to a looped animation) is not "
        "in this edition. If someone asks for it, say it is in the full plugin "
        f"(`{FULL_INSTALL}`) and do not try to animate the SVG with a script of your own.\n"
    ),
    "skills/ouch/references/ANIMATION.md": (
        "> **Directory edition.** The `illustration-animator` skill (a static SVG to a looped animation) is not "
        "in this edition. If someone asks for it, say it is in the full plugin "
        f"(`{FULL_INSTALL}`) and do not try to animate the SVG with a script of your own.\n"
    ),
}
# Text of the full plugin that points at the measuring script. The lite edition ships no script, so each
# passage below is replaced by text that works without it. The build stops when a passage is not found,
# so a change to the source text cannot leave a stale command in the lite package.
REPLACEMENTS = {
    "skills/ouch/SKILL.md": [
        (
            """Measure, do not eyeball:

```
python3 "${CLAUDE_SKILL_DIR}/scripts/measure.py" assets/illustrations/*
# per file: ground-line offset %, mass offset %, saturation
```

`${CLAUDE_SKILL_DIR}` is the folder that holds this SKILL.md. Claude Code
fills it in. Other clients leave it as is, and no shell can resolve it, so
replace it with that folder's absolute path before you run the command. The
shell starts in the user's project, not in this folder.

On Windows the interpreter is spelled differently. The path stays the same,
forward slashes included:

```
py -3 "${CLAUDE_SKILL_DIR}/scripts/measure.py" assets/illustrations/*
```

The script expands `*` itself, so the pattern works in cmd and PowerShell.

The script ships in this skill's `scripts/` folder. It needs Python 3 with
Pillow (`python3 -m pip install pillow`, or `uv run` the script) and Chrome or
Edge to rasterize SVG; PNG needs no browser. It finds a browser in the standard
install locations and on `PATH`; for one installed elsewhere, add
`--chrome <path to the binary>`. Do not re-derive the formulas
inline: two hand-copied versions have already drifted apart once, and the eval
gates import the same functions.

Then apply the numbers:
""",
            """Measure, do not eyeball. This edition ships no measuring script, so take the numbers
from the render: open the page in a real browser, take a screenshot, and read for
each picture two offsets, as a percentage of its box height. The ground-line
offset is the gap between the lowest visible pixel of the artwork and the bottom
of the box. The mass offset is the distance of the visible mass's centre from the
centre of the box. Say in your report that the offsets were read from a render.

Then apply the numbers:
""",
        ),
        (
            """There is no recolour tool, so replace the odd ones at selection time. Measure
rather than eyeball: near-grey and low-saturation colour look the same on a
contact sheet and different on the page.

```
python3 "${CLAUDE_SKILL_DIR}/scripts/measure.py" <files>   # same tool as step 5; saturation column
# Windows: the `py -3` line in step 5 applies here too
```

A truly colourless work (under 0.10) next to a colourful one (over 0.35) is a
broken set: replace the odd one. A run that had this rule in words still
shipped such a set, so treat the number as the check, not the intention.

The number only catches the gross split. After it, look: same hue family, same
accent, same amount of colour per picture. Four blue icons and one steel-grey
one measure alike and still read as two sets.
""",
            """There is no recolour tool, so replace the odd ones at selection time. This edition
ships no script that measures saturation, so judge it by eye on the contact sheet
and say in your report that it was judged by eye and not measured. Near-grey and
low-saturation colour look alike on a small sheet and different on the page, so
look at each grey picture on its own.

A truly colourless work next to a colourful one is a broken set: replace the odd
one. A run that had this rule in words still shipped such a set, so do the check
every time, not only when something looks wrong.

After that look closer: same hue family, same accent, same amount of colour per
picture. Four blue icons and one steel-grey one look alike at a glance and still
read as two sets.
""",
        ),
        (
            """- `scripts/measure.py`: ground line, mass offset and saturation for steps 5-6;
  the single source of those formulas. Python 3 + Pillow; Chrome or Edge for SVG.
""",
            "",
        ),
    ],
    "skills/ouch/references/LAYOUT.md": [
        (
            "a real browser or with `scripts/measure.py`; the rules in `SKILL.md` are the\nshort form.",
            "a real browser; the rules in `SKILL.md` are the short form.",
        ),
        (
            """thresholds in the skill, under 0.10 next to over 0.35, are calibrated against
the formula in `scripts/measure.py` (black pixels stay in the denominator);
gates and skill import the same function so they cannot drift apart again.
""",
            """thresholds, under 0.10 next to over 0.35, are the numbers the full plugin's
measuring script gives (black pixels stay in the denominator). This edition
has no script: use them as a guide when you judge the set by eye.
""",
        ),
    ],
    "skills/ouch/references/ANIMATION.md": [
        (
            """- **`scripts/measure.py` does not take Lottie or video.** It rasterises SVG and
  PNG. For animation, render the page, crop the slot box from the screenshot and
  measure that.""",
            """- **Measure animation in the render.** Render the page, crop the slot box from the
  screenshot and measure that.""",
        ),
    ],
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
    """Apply the replacements of the file, then insert its directory-edition note.

    The note goes right after the front matter of a skill. A reference file has no front matter; its
    note goes right after the first line, the `# ` heading.
    """
    text = data.decode("utf-8")
    for old, new in REPLACEMENTS.get(path, []):
        if old not in text:
            sys.exit(f"{path}: a passage this builder replaces is gone from the source; update REPLACEMENTS")
        text = text.replace(old, new)
    note = NOTES.get(path)
    if note is None:
        return text.encode("utf-8")
    if text.startswith("---\n"):
        head, sep, rest = text.partition("\n---\n")
        if not sep:
            sys.exit(f"{path}: front matter is not closed")
    elif text.startswith("# "):
        head, sep, rest = text.partition("\n")
        if not sep:
            sys.exit(f"{path}: no text after the heading")
        sep = "\n"
    else:
        sys.exit(f"{path}: no front matter and no heading to put the directory note after")
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
