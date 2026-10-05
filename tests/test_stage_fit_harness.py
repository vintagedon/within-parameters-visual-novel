#!/usr/bin/env python3
"""Unit tests for the stage-fit harness's own discrimination logic."""

from __future__ import annotations

import sys
import unittest
from pathlib import Path

from playwright.sync_api import sync_playwright

sys.path.insert(0, str(Path(__file__).resolve().parent))
from stage_fit_check import HIT_TEST_JS, expected_bar_axis  # noqa: E402


class StageFitHarnessTests(unittest.TestCase):
    def test_wide_host_has_pillarbox_bars(self) -> None:
        self.assertEqual(expected_bar_axis(2560, 1080), "pillarbox")

    def test_tall_host_has_letterbox_bars(self) -> None:
        self.assertEqual(expected_bar_axis(1920, 1200), "letterbox")

    def test_ancestor_hit_does_not_count_as_control_alignment(self) -> None:
        with sync_playwright() as playwright:
            browser = playwright.chromium.launch(headless=True)
            page = browser.new_page(viewport={"width": 400, "height": 300})
            page.set_content(
                '<div id="parent" style="position:absolute;left:40px;top:40px;width:200px;height:120px;background:black">'
                '<button id="control" style="width:100%;height:100%;pointer-events:none">CONTROL</button>'
                '</div>'
            )
            result = page.evaluate(HIT_TEST_JS, "#control")
            browser.close()
        self.assertFalse(result["hit"], result)

    def test_descendant_hit_counts_as_control_alignment(self) -> None:
        with sync_playwright() as playwright:
            browser = playwright.chromium.launch(headless=True)
            page = browser.new_page(viewport={"width": 400, "height": 300})
            page.set_content(
                '<button id="control" style="position:absolute;left:40px;top:40px;width:200px;height:120px">'
                '<span style="display:block;width:100%;height:100%">CONTROL</span>'
                '</button>'
            )
            result = page.evaluate(HIT_TEST_JS, "#control")
            browser.close()
        self.assertTrue(result["hit"], result)


if __name__ == "__main__":
    unittest.main()
