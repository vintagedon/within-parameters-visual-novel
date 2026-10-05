#!/usr/bin/env python3
"""
Script Name  : stage_fit_check.py
Description  : Gate 5.4 stage-host verification: displayed scale, centering,
               equal opposing bars, and input alignment for the WP stage
               host, per charter 4.1.1. Runs against the DEV server using
               the DEV-only __wp.stageFixture() hook (isolated host with
               representative, game-concept-free controls).
Repository   : within-parameters-visual-novel
Author       : VintageDon (https://github.com/vintagedon/)
Created      : 2026-10-04

Usage
-----
    /opt/agents/venv/bin/python tests/stage_fit_check.py [--base URL]

Without --base, starts `vite` (dev server) on a free port. Presentation
targets (scale must equal the charter value exactly, no bars):
    1920x1080 -> 1, 2560x1440 -> 4/3, 3840x2160 -> 2
Host-fit set (a bounded set, not layout targets; scale must equal
min(W/1920, H/1080) within 0.001, stage centered within 1 px, opposing
bars equal):
    1920x1200, 2560x1080, 1600x900, 1366x768
Input alignment: at a non-unit scale (1600x900) and a letterboxed size
(2560x1080), document.elementFromPoint at each fixture control's displayed
center returns that control or a descendant.
"""

from __future__ import annotations

import argparse
import socket
import subprocess
import sys
import time
from pathlib import Path

from playwright.sync_api import sync_playwright

REPO_ROOT = Path(__file__).resolve().parent.parent

TARGETS = [
    (1920, 1080, 1.0),
    (2560, 1440, 4.0 / 3.0),
    (3840, 2160, 2.0),
]
HOST_FIT = [
    (1920, 1200),
    (2560, 1080),
    (1600, 900),
    (1366, 768),
]
CONTROLS = ["#fx-center", "#fx-topleft", "#fx-bottomright", "#fx-vmeter", "#fx-hmeter", "#fx-text"]

MEASURE_JS = """
() => {
  const host = document.getElementById('stage-host');
  const stage = document.getElementById('stage');
  const hr = host.getBoundingClientRect();
  const sr = stage.getBoundingClientRect();
  return {
    host: { x: hr.x, y: hr.y, w: hr.width, h: hr.height },
    stage: { x: sr.x, y: sr.y, w: sr.width, h: sr.height },
    scale: sr.width / 1920,
  };
}
"""


def free_port() -> int:
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.bind(("127.0.0.1", 0))
        return s.getsockname()[1]


def start_dev(port: int) -> subprocess.Popen:
    proc = subprocess.Popen(
        ["node", "node_modules/vite/bin/vite.js", "--port", str(port), "--strictPort"],
        cwd=str(REPO_ROOT),
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )
    import urllib.request

    base = f"http://127.0.0.1:{port}/"
    for _ in range(120):
        if proc.poll() is not None:
            raise RuntimeError("vite dev server exited early")
        try:
            with urllib.request.urlopen(base, timeout=1):
                return proc
        except Exception:
            time.sleep(0.25)
    raise RuntimeError("vite dev server did not become ready")


def measure(page, w: int, h: int) -> dict:
    page.set_viewport_size({"width": w, "height": h})
    page.wait_for_timeout(120)
    return page.evaluate(MEASURE_JS)


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--base", default=None, help="already-running base URL (dev server)")
    args = ap.parse_args()

    own_server = None
    if args.base:
        base = args.base
    else:
        port = free_port()
        base = f"http://127.0.0.1:{port}/"
        own_server = start_dev(port)

    failures: list[str] = []

    def check(label: str, ok: bool, detail: str) -> None:
        print(f"  [{'PASS' if ok else 'FAIL'}] {label}: {detail}")
        if not ok:
            failures.append(f"{label}: {detail}")

    try:
        with sync_playwright() as pw:
            browser = pw.chromium.launch(headless=True)
            page = browser.new_page(viewport={"width": 1920, "height": 1080})
            page.goto(base, wait_until="networkidle")
            page.wait_for_function("() => window.__wp && typeof window.__wp.stageFixture === 'function'", timeout=30000)
            page.evaluate("() => window.__wp.stageFixture()")
            page.wait_for_selector("#stage", timeout=10000)

            print("Presentation targets (charter values, no bars):")
            for w, h, expected in TARGETS:
                m = measure(page, w, h)
                check(
                    f"scale {w}x{h}",
                    abs(m["scale"] - expected) < 0.001,
                    f"got {m['scale']:.5f}, expected {expected:.5f}",
                )
                bars_l = m["stage"]["x"] - m["host"]["x"]
                bars_r = (m["host"]["x"] + m["host"]["w"]) - (m["stage"]["x"] + m["stage"]["w"])
                bars_t = m["stage"]["y"] - m["host"]["y"]
                bars_b = (m["host"]["y"] + m["host"]["h"]) - (m["stage"]["y"] + m["stage"]["h"])
                no_bars = max(abs(bars_l), abs(bars_r), abs(bars_t), abs(bars_b)) < 1.0
                check(f"no bars {w}x{h}", no_bars, f"L{bars_l:.2f} R{bars_r:.2f} T{bars_t:.2f} B{bars_b:.2f}")

            print("Host-fit set (min-fit, centered within 1 px, equal opposing bars):")
            for w, h in HOST_FIT:
                m = measure(page, w, h)
                expected = min(w / 1920, h / 1080)
                check(
                    f"scale {w}x{h}",
                    abs(m["scale"] - expected) < 0.001,
                    f"got {m['scale']:.5f}, expected min-fit {expected:.5f}",
                )
                bars_l = m["stage"]["x"] - m["host"]["x"]
                bars_r = (m["host"]["x"] + m["host"]["w"]) - (m["stage"]["x"] + m["stage"]["w"])
                bars_t = m["stage"]["y"] - m["host"]["y"]
                bars_b = (m["host"]["y"] + m["host"]["h"]) - (m["stage"]["y"] + m["stage"]["h"])
                centered_x = abs(m["stage"]["x"] + m["stage"]["w"] / 2 - (m["host"]["x"] + m["host"]["w"] / 2))
                centered_y = abs(m["stage"]["y"] + m["stage"]["h"] / 2 - (m["host"]["y"] + m["host"]["h"] / 2))
                check(
                    f"centered {w}x{h}",
                    centered_x <= 1 and centered_y <= 1,
                    f"dx {centered_x:.2f} dy {centered_y:.2f}",
                )
                if h / 1080 < w / 1920:
                    check(f"letterbox bars equal {w}x{h}", abs(bars_t - bars_b) <= 1, f"T{bars_t:.2f} B{bars_b:.2f}")
                else:
                    check(f"pillarbox bars equal {w}x{h}", abs(bars_l - bars_r) <= 1, f"L{bars_l:.2f} R{bars_r:.2f}")

            print("Input alignment (elementFromPoint at displayed centers):")
            for w, h in [(1600, 900), (2560, 1080)]:
                measure(page, w, h)
                for sel in CONTROLS:
                    hit = page.evaluate(
                        """(sel) => {
                            const el = document.querySelector(sel);
                            const r = el.getBoundingClientRect();
                            const cx = r.x + r.width / 2;
                            const cy = r.y + r.height / 2;
                            const hit = document.elementFromPoint(cx, cy);
                            return { hit: hit ? (el === hit || el.contains(hit) || hit.contains(el)) : false, tag: hit ? hit.tagName : null };
                        }""",
                        sel,
                    )
                    check(f"elementFromPoint {sel} @ {w}x{h}", hit["hit"], f"hit {hit['tag']}")

            browser.close()
    finally:
        if own_server is not None:
            own_server.terminate()
            try:
                own_server.wait(timeout=5)
            except subprocess.TimeoutExpired:
                own_server.kill()

    print("=" * 76)
    if failures:
        print(f"stage fit check FAILED ({len(failures)} failure(s))")
        return 1
    print("stage fit check PASSED")
    return 0


if __name__ == "__main__":
    sys.exit(main())
