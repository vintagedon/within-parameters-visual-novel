import io
import sys
import unittest
from pathlib import Path

from PIL import Image

sys.path.insert(0, str(Path(__file__).resolve().parent))
from capture import compare_png_pixels  # noqa: E402


def png_bytes(pixels: list[tuple[int, int, int]]) -> bytes:
    image = Image.new("RGB", (10, 10))
    image.putdata(pixels)
    output = io.BytesIO()
    image.save(output, format="PNG")
    return output.getvalue()


class CaptureToleranceTests(unittest.TestCase):
    def setUp(self) -> None:
        self.black = [(0, 0, 0)] * 100
        self.reference = png_bytes(self.black)

    def compare(self, pixels: list[tuple[int, int, int]]):
        return compare_png_pixels(self.reference, png_bytes(pixels))

    def test_exact_pixels_pass(self) -> None:
        accepted, stats = self.compare(self.black)
        self.assertTrue(accepted)
        self.assertEqual(stats, (0, 0, 0))

    def test_observed_compositor_noise_passes(self) -> None:
        pixels = self.black.copy()
        pixels[:41] = [(1, 1, 0)] * 41
        accepted, stats = self.compare(pixels)
        self.assertTrue(accepted)
        self.assertEqual(stats, (41, 1, 82))

    def test_too_many_changed_pixels_fail(self) -> None:
        pixels = self.black.copy()
        pixels[:65] = [(1, 0, 0)] * 65
        self.assertFalse(self.compare(pixels)[0])

    def test_large_channel_delta_fails(self) -> None:
        pixels = self.black.copy()
        pixels[0] = (9, 0, 0)
        self.assertFalse(self.compare(pixels)[0])

    def test_large_aggregate_delta_fails(self) -> None:
        pixels = self.black.copy()
        pixels[:64] = [(1, 1, 1)] * 64
        self.assertFalse(self.compare(pixels)[0])


if __name__ == "__main__":
    unittest.main()
