#!/usr/bin/env python3
"""Check a built directory-lite package against what the Anthropic directory accepts from an
organization that is not Verified.

    python3 .github/scripts/check_directory_package.py PACKAGE_DIR

Fails (exit 1) on: a file type outside Markdown, text, JSON, YAML, PNG, JPEG, GIF, WebP, ICO or SVG;
a file that starts with `#!`; a package-manager file; a symlink; a text file that is not UTF-8 or
holds a NUL byte; a package.json field outside the allowed list; an MCP entry field outside the
allowed list. Prints warnings for skill text that names a skill the package does not ship, unless the file
carries the directory-edition note (a skill's own references fall under their skill's note).
Needs only the standard library.
"""

import json
import sys
from pathlib import Path

ALLOWED_SUFFIXES = {".md", ".json", ".yaml", ".yml", ".txt", ".png", ".jpg", ".jpeg", ".gif", ".webp", ".ico", ".svg"}
ALLOWED_NAMES = {"LICENSE", "NOTICE"}
IMAGE_SUFFIXES = {".png", ".jpg", ".jpeg", ".gif", ".webp", ".ico"}
PACKAGE_FILES = {
    "package.json", "package-lock.json", "npm-shrinkwrap.json", "yarn.lock", "pnpm-lock.yaml",
    "pnpm-workspace.yaml", "bun.lock", "bun.lockb", ".npmrc", "bunfig.toml", "uv.toml", "requirements.txt",
}
PACKAGE_JSON_FIELDS = {
    "name", "displayName", "version", "description", "keywords", "homepage", "bugs", "license", "author",
    "contributors", "maintainers", "funding", "repository", "private", "type", "files", "engines", "$schema",
}
MCP_FIELDS = {"type", "url", "headers", "timeout", "alwaysLoad", "oauth", "name", "title", "displayName", "description"}
# Skills of the full plugin that this package leaves out.
LEFT_OUT = ("illustration-animator",)


def main():
    if len(sys.argv) != 2:
        sys.exit(__doc__)
    root = Path(sys.argv[1]).resolve()
    errors, warnings = [], []
    for path in sorted(root.rglob("*")):
        rel = path.relative_to(root).as_posix()
        if path.is_symlink():
            errors.append(f"{rel}: symlink")
            continue
        if path.is_dir():
            continue
        suffix = path.suffix.lower()
        if path.name in PACKAGE_FILES:
            errors.append(f"{rel}: package-manager file")
        if suffix not in ALLOWED_SUFFIXES and path.name not in ALLOWED_NAMES:
            errors.append(f"{rel}: file type not accepted")
            continue
        data = path.read_bytes()
        if data.startswith(b"#!") or data.startswith(b"\xef\xbb\xbf#!"):
            errors.append(f"{rel}: starts with #!")
        if suffix in IMAGE_SUFFIXES:
            continue
        if b"\0" in data:
            errors.append(f"{rel}: NUL byte")
            continue
        try:
            text = data.decode("utf-8")
        except UnicodeDecodeError:
            errors.append(f"{rel}: not UTF-8")
            continue
        if path.name == "package.json":
            extra = set(json.loads(text)) - PACKAGE_JSON_FIELDS
            if extra:
                errors.append(f"{rel}: package.json fields not accepted: {sorted(extra)}")
        if path.name == ".mcp.json":
            for name, entry in json.loads(text).get("mcpServers", {}).items():
                extra = set(entry) - MCP_FIELDS
                if extra:
                    errors.append(f"{rel}: MCP server {name} fields not accepted: {sorted(extra)}")
        if suffix == ".md" and rel != "README.md":
            for skill in LEFT_OUT:
                if skill in text and "**Directory edition.**" not in text and not rel.startswith("skills/ouch/references/"):
                    warnings.append(f"{rel}: names {skill}, which this package does not ship")
    for w in warnings:
        print(f"warning: {w}")
    for e in errors:
        print(f"error: {e}")
    print(f"{'FAILED' if errors else 'ok'}: {len(errors)} errors, {len(warnings)} warnings")
    sys.exit(1 if errors else 0)


if __name__ == "__main__":
    main()
