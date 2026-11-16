"""Tests for .github/scripts/check_changelog_date.py. Run: python3 -m unittest discover tests."""

import datetime
import json
import shutil
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SCRIPT = ROOT / ".github" / "scripts" / "check_changelog_date.py"
sys.path.insert(0, str(SCRIPT.parent))
import check_changelog_date as cc  # noqa: E402

CHANGELOG = """# Changelog

## [0.7.2] — 2026-11-16

Text.

## [0.7.1] — 2026-11-12

Older text.
"""


class TopEntry(unittest.TestCase):
    def test_reads_the_first_heading(self):
        self.assertEqual(cc.top_entry(CHANGELOG), ("0.7.2", "2026-11-16"))

    def test_reads_a_hyphen_and_an_en_dash(self):
        self.assertEqual(cc.top_entry("## [1.0.0] - 2026-01-02\n"), ("1.0.0", "2026-01-02"))
        self.assertEqual(cc.top_entry("## [1.0.0] – 2026-01-02\n"), ("1.0.0", "2026-01-02"))

    def test_no_heading(self):
        self.assertIsNone(cc.top_entry("# Changelog\n\nNothing here.\n"))
        self.assertIsNone(cc.top_entry("## [Unreleased]\n"))


class CheckEntry(unittest.TestCase):
    def test_right_version_and_date(self):
        self.assertEqual(cc.check_entry(CHANGELOG, "0.7.2", "2026-11-16"), [])

    def test_old_date(self):
        problems = cc.check_entry(CHANGELOG, "0.7.2", "2026-11-17")
        self.assertEqual(len(problems), 1)
        self.assertIn("dated 2026-11-16", problems[0])
        self.assertIn("`## [0.7.2] — 2026-11-17`", problems[0])

    def test_other_version_on_top(self):
        problems = cc.check_entry(CHANGELOG, "0.7.3", "2026-11-16")
        self.assertEqual(len(problems), 1)
        self.assertIn("[0.7.2]", problems[0])

    def test_wrong_version_and_date_report_both(self):
        self.assertEqual(len(cc.check_entry(CHANGELOG, "0.7.3", "2026-11-17")), 2)

    def test_no_entry(self):
        self.assertEqual(len(cc.check_entry("# Changelog\n", "0.7.2", "2026-11-16")), 1)


class CheckPr(unittest.TestCase):
    OLD = {p: "0.7.1" for p in cc.MANIFESTS}

    def new(self, version="0.7.2", **override):
        manifests = {p: version for p in cc.MANIFESTS}
        manifests.update(override)
        return manifests

    def test_no_version_change_passes_with_any_date(self):
        problems, note = cc.check_pr(CHANGELOG, self.OLD, dict(self.OLD), "2030-01-01")
        self.assertEqual(problems, [])
        self.assertIn("not checked", note)

    def test_bump_with_today_passes(self):
        self.assertEqual(cc.check_pr(CHANGELOG, self.OLD, self.new(), "2026-11-16")[0], [])

    def test_bump_with_stale_date_fails(self):
        problems, _ = cc.check_pr(CHANGELOG, self.OLD, self.new(), "2026-11-17")
        self.assertEqual(len(problems), 1)

    def test_one_manifest_bumped_is_enough_to_check(self):
        new = dict(self.OLD, **{".cursor-plugin/plugin.json": "0.7.2"})
        self.assertEqual(len(cc.check_pr(CHANGELOG, self.OLD, new, "2026-11-17")[0]), 1)

    def test_manifests_that_disagree_fail(self):
        new = self.new(**{".codex-plugin/plugin.json": "0.7.3"})
        problems, _ = cc.check_pr(CHANGELOG, self.OLD, new, "2026-11-16")
        self.assertEqual(len(problems), 1)
        self.assertIn("agree", problems[0])

    def test_new_manifest_counts_as_a_change(self):
        old = dict(self.OLD, **{".cursor-plugin/plugin.json": None})
        self.assertIn(".cursor-plugin/plugin.json", cc.changed_versions(old, self.new("0.7.1")))


class Cli(unittest.TestCase):
    """End to end: the script runs in a throwaway git repo that has the four manifests."""

    def setUp(self):
        self.repo = Path(tempfile.mkdtemp(prefix="changelog-date-"))
        self.addCleanup(shutil.rmtree, self.repo, True)
        script = self.repo / ".github" / "scripts" / SCRIPT.name
        script.parent.mkdir(parents=True)
        shutil.copy(SCRIPT, script)
        self.script = script
        for rel in cc.MANIFESTS:
            self.write(rel, json.dumps({"version": "0.7.1"}))
        self.write("CHANGELOG.md", CHANGELOG.replace("0.7.2", "0.7.1", 1))
        self.git("init", "-q")
        self.git("add", "-A")
        self.git("-c", "user.name=t", "-c", "user.email=t@t", "commit", "-qm", "base")
        self.base = self.git("rev-parse", "HEAD").strip()

    def write(self, rel, text):
        path = self.repo / rel
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(text, encoding="utf-8")

    def git(self, *args):
        return subprocess.run(["git", *args], cwd=self.repo, capture_output=True, text=True,
                              check=True).stdout

    def run_script(self, *args):
        out = subprocess.run([sys.executable, str(self.script), *args], cwd=self.repo,
                             capture_output=True, text=True, encoding="utf-8")
        return out.returncode, out.stdout

    def bump(self, version, changelog_version=None):
        self.write(".claude-plugin/plugin.json", json.dumps({"version": version}))
        self.write("CHANGELOG.md", CHANGELOG.replace("0.7.2", changelog_version or version, 1))

    def test_pr_without_a_bump_is_green(self):
        code, out = self.run_script("--today", "2031-01-01", "pr", "--base", self.base)
        self.assertEqual(code, 0, out)

    def test_pr_with_a_bump_and_todays_date_is_green(self):
        self.bump("0.7.2")
        code, out = self.run_script("--today", "2026-11-16", "pr", "--base", self.base)
        self.assertEqual(code, 0, out)

    def test_pr_with_a_bump_and_an_old_date_is_red(self):
        self.bump("0.7.2")
        code, out = self.run_script("--today", "2026-11-17", "pr", "--base", self.base)
        self.assertEqual(code, 1)
        self.assertIn("dated 2026-11-16, but today is 2026-11-17", out)

    def test_pr_with_a_bump_and_no_new_entry_is_red(self):
        self.write(".claude-plugin/plugin.json", json.dumps({"version": "0.7.2"}))
        code, out = self.run_script("--today", "2026-11-12", "pr", "--base", self.base)
        self.assertEqual(code, 1)
        self.assertIn("[0.7.1], but the version is 0.7.2", out)

    def test_tag_green(self):
        self.bump("0.7.2")
        code, out = self.run_script("--today", "2026-11-16", "tag", "--tag", "v0.7.2")
        self.assertEqual(code, 0, out)

    def test_tag_with_another_version_is_red(self):
        self.bump("0.7.2")
        code, out = self.run_script("--today", "2026-11-16", "tag", "--tag", "v0.7.3")
        self.assertEqual(code, 1)
        self.assertIn("but the version is 0.7.3", out)

    def test_tag_with_an_old_date_is_red(self):
        self.bump("0.7.2")
        code, _ = self.run_script("--today", "2026-11-18", "tag", "--tag", "v0.7.2")
        self.assertEqual(code, 1)

    def test_malformed_tag_is_red(self):
        code, out = self.run_script("tag", "--tag", "release-1")
        self.assertEqual(code, 1)
        self.assertIn("not of the form vX.Y.Z", out)

    def test_default_day_is_the_utc_day(self):
        now = datetime.datetime.now(datetime.timezone.utc).date().isoformat()
        self.assertEqual(cc.utc_today(), now)


if __name__ == "__main__":
    unittest.main()
