"""Tests of the directory-lite package builder: python3 -m unittest discover -s tests -v

The build must hold nothing the directory refuses, and every skill file must equal its source in the
full plugin except for the two directory-edition notes the builder adds.
"""

import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

REPO = Path(__file__).resolve().parents[1]
SCRIPTS = REPO / ".github" / "scripts"
sys.path.insert(0, str(SCRIPTS))
import build_directory_package as builder  # noqa: E402


class DirectoryPackageTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.tmp = tempfile.TemporaryDirectory()
        cls.out = Path(cls.tmp.name) / "lite"
        cls.out.mkdir()
        cls.left_out = builder.build(cls.out)

    @classmethod
    def tearDownClass(cls):
        cls.tmp.cleanup()

    def test_check_script_passes(self):
        run = subprocess.run([sys.executable, "-I", str(SCRIPTS / "check_directory_package.py"), str(self.out)],
                             capture_output=True, text=True, encoding="utf-8")
        self.assertEqual(run.returncode, 0, run.stdout + run.stderr)

    def test_no_program_files(self):
        names = [p.name for p in self.out.rglob("*") if p.is_file()]
        self.assertFalse([n for n in names if n.endswith((".py", ".js", ".sh", ".mjs", ".cjs", ".ts"))])
        self.assertFalse([n for n in names if n.startswith("package")])

    def test_the_only_left_out_file_is_measure_py(self):
        self.assertEqual(self.left_out, ["skills/ouch/scripts/measure.py"])

    def test_animator_is_not_in_the_package(self):
        self.assertFalse((self.out / "skills" / "illustration-animator").exists())

    def test_skill_files_equal_their_source_except_for_the_notes(self):
        for built in (self.out / "skills").rglob("*"):
            if not built.is_file():
                continue
            rel = built.relative_to(self.out).as_posix()
            source = (REPO / rel).read_bytes()
            if rel in builder.NOTES:
                self.assertIn(builder.NOTES[rel].encode("utf-8"), built.read_bytes())
                self.assertEqual(builder.with_note(rel, source), built.read_bytes(), rel)
            else:
                self.assertEqual(source, built.read_bytes(), rel)

    def test_mcp_entry_is_remote_only(self):
        text = (self.out / ".mcp.json").read_text(encoding="utf-8")
        self.assertIn('"type": "http"', text)
        self.assertNotIn("command", text)

    def test_manifest_version_matches_the_full_plugin(self):
        full = (REPO / ".claude-plugin" / "plugin.json").read_text(encoding="utf-8")
        lite = (self.out / ".claude-plugin" / "plugin.json").read_text(encoding="utf-8")
        import json
        self.assertEqual(json.loads(full)["version"], json.loads(lite)["version"])
        self.assertNotIn("Animates static SVG", lite)

    def test_build_is_repeatable(self):
        second = Path(self.tmp.name) / "second"
        second.mkdir()
        builder.build(second)
        first_files = sorted(p.relative_to(self.out).as_posix() for p in self.out.rglob("*") if p.is_file())
        second_files = sorted(p.relative_to(second).as_posix() for p in second.rglob("*") if p.is_file())
        self.assertEqual(first_files, second_files)
        for rel in first_files:
            self.assertEqual((self.out / rel).read_bytes(), (second / rel).read_bytes(), rel)


if __name__ == "__main__":
    unittest.main()
