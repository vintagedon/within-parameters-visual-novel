#!/usr/bin/env python3
"""
Script Name  : build_id_check.py
Description  : Gate 5.7 build-identifier verification: the served page's
               DOM-reported SHA equals the expected commit with the expected
               dirty flag, and the visible title text carries the short SHA.
               Runs against any base URL; the hosted preview is the
               acceptance target.
Repository   : within-parameters-visual-novel
Author       : VintageDon (https://github.com/vintagedon/)
Created      : 2026-10-04

Usage
-----
    /opt/agents/venv/bin/python tests/build_id_check.py [--base URL] \
        [--expect-sha SHA] [--expect-dirty true|false]

Defaults: base https://within.donfather.site/ ; expected SHA is the local
repository HEAD; expected dirty state false.
"""

from __future__ import annotations

import argparse
import json
import subprocess
import sys
from pathlib import Path

from playwright.sync_api import sync_playwright

REPO_ROOT = Path(__file__).resolve().parent.parent


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--base", default="https://within.donfather.site/")
    ap.add_argument("--expect-sha", default=None)
    ap.add_argument("--expect-dirty", default="false")
    args = ap.parse_args()

    expect_sha = args.expect_sha
    if not expect_sha:
        expect_sha = subprocess.run(
            ["git", "rev-parse", "HEAD"], cwd=str(REPO_ROOT), capture_output=True, text=True, check=True
        ).stdout.strip()
    expect_dirty = args.expect_dirty.lower() in ("1", "true", "yes")

    failures: list[str] = []

    def check(label: str, ok: bool, detail: str = "") -> None:
        print(f"  [{'PASS' if ok else 'FAIL'}] {label}{(': ' + detail) if detail else ''}")
        if not ok:
            failures.append(label)

    with sync_playwright() as pw:
        browser = pw.chromium.launch(headless=True)
        page = browser.new_page(viewport={"width": 1920, "height": 1080})
        page.goto(args.base, wait_until="networkidle", timeout=30000)
        page.wait_for_selector("#title-screen:not(.hidden)", timeout=15000)
        raw = page.evaluate("() => document.getElementById('root')?.getAttribute('data-build') || ''")
        visible = page.evaluate("() => document.getElementById('build-id')?.textContent?.trim() || ''")
        browser.close()

    print(f"build identifier check against {args.base}")
    print(f"  reported: {raw!r} visible: {visible!r}")
    try:
        info = json.loads(raw)
        sha_ok = info.get("sha") == expect_sha
        dirty_ok = info.get("dirty") is expect_dirty
    except Exception as exc:
        sha_ok = dirty_ok = False
        check("data-build parses", False, str(exc))
        info = {}

    check("DOM-reported SHA equals the expected commit", sha_ok, f"expected {expect_sha}")
    check(f"dirty flag is {expect_dirty}", dirty_ok, f"reported {info.get('dirty')}")
    check("visible title text carries the short SHA", expect_sha[:7] in visible, visible)

    print("=" * 76)
    if failures:
        print(f"build identifier check FAILED ({len(failures)} failure(s))")
        return 1
    print("build identifier check PASSED")
    return 0


if __name__ == "__main__":
    sys.exit(main())
