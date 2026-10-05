#!/usr/bin/env python3
"""Unit tests for the color classifier used by composition_check.py."""

from __future__ import annotations

import sys
import unittest
from pathlib import Path

from playwright.sync_api import sync_playwright

sys.path.insert(0, str(Path(__file__).resolve().parent))
from composition_check import OKLCH_TO_SRGB_JS  # noqa: E402


CLASSIFY_JS = """
(value) => {
""" + OKLCH_TO_SRGB_JS + """
  const match = value.match(/oklch\\(\\s*([\\d.]+)(?:%?)\\s+([\\d.]+)\\s+(-?[\\d.]+)/i);
  if (!match) throw new Error('invalid test color');
  let lightness = Number(match[1]);
  if (lightness > 1) lightness /= 100;
  const [r, g, b] = oklchToSrgb(lightness, Number(match[2]), Number(match[3]));
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const l = (max + min) / 2;
  const delta = max - min;
  let hue = 0;
  let saturation = 0;
  if (delta !== 0) {
    saturation = l > 0.5 ? delta / (2 - max - min) : delta / (max + min);
    if (max === r) hue = ((g - b) / delta + (g < b ? 6 : 0));
    else if (max === g) hue = (b - r) / delta + 2;
    else hue = (r - g) / delta + 4;
    hue *= 60;
  }
  return { hue, saturation: saturation * 100, green: hue >= 90 && hue <= 160 && saturation * 100 >= 25 };
}
"""


class OklchClassifierTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        cls.playwright = sync_playwright().start()
        cls.browser = cls.playwright.chromium.launch(headless=True)
        cls.page = cls.browser.new_page()

    @classmethod
    def tearDownClass(cls) -> None:
        cls.browser.close()
        cls.playwright.stop()

    def test_positive_token_is_flagged_green(self) -> None:
        result = self.page.evaluate(CLASSIFY_JS, "oklch(68% 0.16 150)")
        self.assertTrue(result["green"], result)

    def test_contract_cyan_is_not_flagged_green(self) -> None:
        result = self.page.evaluate(CLASSIFY_JS, "oklch(78% 0.18 195)")
        self.assertFalse(result["green"], result)


if __name__ == "__main__":
    unittest.main()
