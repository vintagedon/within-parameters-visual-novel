#!/usr/bin/env python3
"""Unit tests for screen-walk mode selection."""

from __future__ import annotations

import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from screen_walk_check import should_run_dev  # noqa: E402


class ScreenWalkModeTests(unittest.TestCase):
    def test_default_mode_runs_development_walk(self) -> None:
        self.assertTrue(should_run_dev(False))

    def test_production_only_skips_development_walk(self) -> None:
        self.assertFalse(should_run_dev(True))


if __name__ == "__main__":
    unittest.main()
