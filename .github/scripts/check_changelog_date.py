#!/usr/bin/env python3
"""Check that the top CHANGELOG entry carries today's date (UTC) and the version being released.

    python3 .github/scripts/check_changelog_date.py pr --base <base-sha>
    python3 .github/scripts/check_changelog_date.py tag --tag v0.7.2

Two modes, two workflows:

* `pr` runs on a pull request. If the PR changes the version in any of the four manifests, the top
  entry of CHANGELOG.md has to be that version and dated today. A PR that leaves the versions alone
  passes without a look at the date.
* `tag` runs when a `v*` tag is pushed. The top entry has to be the tag's version (the tag without
  the leading `v`) and dated today.

"Today" is the UTC day of the run. It is compared with the day of the last push to the PR, not the
day of the merge: a PR that sits for a day goes red when a new commit lands on it, and a PR merged
the day after its last push keeps the date of that push. `--today YYYY-MM-DD` replaces the clock, so
the checks are testable. Uses only the standard library and reads only tracked files and git.
"""

import argparse
import datetime
import json
import re
import subprocess
import sys
from pathlib import Path

REPO = Path(__file__).resolve().parents[2]

MANIFESTS = (
    "plugin.json",
    ".claude-plugin/plugin.json",
    ".codex-plugin/plugin.json",
    ".cursor-plugin/plugin.json",
)

# `## [0.7.1] — 2026-11-12`: an em dash in the repo's own entries; a hyphen or an en dash is read
# too, so a hand-typed heading is judged on its date and not on its dash.
HEADING = re.compile(r"^## \[(?P<version>[^\]]+)\]\s*[—–-]\s*(?P<date>\S+)\s*$", re.M)


def top_entry(changelog):
    """Return (version, date) of the first `## [X.Y.Z] — YYYY-MM-DD` heading, or None."""
    match = HEADING.search(changelog)
    return (match["version"], match["date"]) if match else None


def check_entry(changelog, version, today):
    """Return a list of problems with the top entry; an empty list means the entry is right."""
    entry = top_entry(changelog)
    if entry is None:
        return ["CHANGELOG.md has no entry of the form `## [X.Y.Z] — YYYY-MM-DD`."]
    top_version, top_date = entry
    problems = []
    if top_version != version:
        problems.append(
            f"The top CHANGELOG.md entry is [{top_version}], but the version is {version}. "
            f"Put the entry for {version} first.")
    if top_date != today:
        problems.append(
            f"The top CHANGELOG.md entry [{top_version}] is dated {top_date}, but today is "
            f"{today} (UTC). Change the heading to `## [{top_version}] — {today}`.")
    return problems


def changed_versions(old, new):
    """Return {manifest: new version} for every manifest whose version differs from `old`.

    `old` and `new` map a manifest path to its version, or to None when the file is absent.
    """
    return {path: new[path] for path in MANIFESTS if new.get(path) != old.get(path)}


def check_pr(changelog, old, new, today):
    """Return (problems, note) for a PR: `old` and `new` are manifest versions before and after."""
    changed = changed_versions(old, new)
    if not changed:
        return [], "No manifest version changes in this PR: the CHANGELOG.md date is not checked."
    versions = set(changed.values())
    if len(versions) != 1:
        return [f"The manifests moved to different versions: {changed}. They have to agree."], ""
    (version,) = versions
    return check_entry(changelog, version, today), f"CHANGELOG.md top entry is {version} dated {today}."


def git_show(ref, path):
    out = subprocess.run(["git", "show", f"{ref}:{path}"], cwd=REPO, capture_output=True,
                         text=True, encoding="utf-8")
    return out.stdout if out.returncode == 0 else None


def manifest_version(text):
    if text is None:
        return None
    try:
        return json.loads(text).get("version")
    except (json.JSONDecodeError, AttributeError):
        return None


def utc_today():
    return datetime.datetime.now(datetime.timezone.utc).date().isoformat()


def report(problems, note):
    for problem in problems:
        print(f"FAIL  {problem}")
    if not problems:
        print(f"PASS  {note}")
    return 1 if problems else 0


def main(argv=None):
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8")
    parser = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    parser.add_argument("--today", default=None, help="the day to compare with, YYYY-MM-DD "
                        "(default: today in UTC)")
    sub = parser.add_subparsers(dest="mode", required=True)
    pr = sub.add_parser("pr", help="check a pull request that bumps the plugin version")
    pr.add_argument("--base", required=True, help="the base commit of the PR")
    tag = sub.add_parser("tag", help="check the tag that is being released")
    tag.add_argument("--tag", required=True, help="the pushed tag, for example v0.7.2")
    args = parser.parse_args(argv)

    today = args.today or utc_today()
    changelog = (REPO / "CHANGELOG.md").read_text(encoding="utf-8")
    print(f"Today (UTC): {today}")
    if args.mode == "tag":
        if not re.fullmatch(r"v\d+\.\d+\.\d+\S*", args.tag):
            return report([f"The tag {args.tag!r} is not of the form vX.Y.Z."], "")
        return report(check_entry(changelog, args.tag[1:], today),
                      f"CHANGELOG.md top entry is {args.tag[1:]} dated {today}.")
    old = {path: manifest_version(git_show(args.base, path)) for path in MANIFESTS}
    new = {path: manifest_version((REPO / path).read_text(encoding="utf-8")
                                  if (REPO / path).exists() else None) for path in MANIFESTS}
    return report(*check_pr(changelog, old, new, today))


if __name__ == "__main__":
    sys.exit(main())
