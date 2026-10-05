#!/usr/bin/env python3
"""
Script Name  : reward_boundary_check.py
Description  : A2.3 browser boundary fixture — the clock-reduction reward card's
               rendered text must equal its immediate applied effect, through
               the REAL card renderer (showRewardOverlay) and the REAL reward
               application (getRewardsForStop / applyReward), at controlled
               (rapport, clock) states. These are boundary fixtures, not
               natural-run reachability evidence: the states are chosen to
               exercise reduction values and floors that natural play reaches
               rarely or late. No production-only hooks — the trigger is the
               DEV-gated __wp.triggerReward, stripped from production builds.
Repository   : within-parameters-visual-novel
Author       : VintageDon (https://github.com/vintagedon/)
Created      : 2026-09-26

Usage
-----
    /opt/agents/venv/bin/python tests/reward_boundary_check.py

Starts the Vite dev server itself (import.meta.env.DEV true, so the __wp
harness hooks exist). Playwright runs under Chromium headless only.

Cases (base config: reduction base 1, max 2, rapport scale 0.5):
    remove             rapport  0, clock 4 -> reduction  1, removes 1 (4 -> 3)
    zeroReduction      rapport -2, clock 4 -> reduction  0, holds at 4
    negativeReduction  rapport -5, clock 2 -> reduction -1, rises by 1 (2 -> 3)
    clockEmpty         rapport  0, clock 0 -> reduction  1, holds at 0
    capped             rapport  2, clock 1 -> reduction  2 > clock, removes 1 (1 -> 0)

On a tree without the A2.3 presentation repair, the negativeReduction case
renders "buying -1 clock units" while the clock rises — the text/delta
agreement fails.
"""

from __future__ import annotations

import json
import re
import socket
import subprocess
import sys
import time
from pathlib import Path
from urllib.parse import urlparse

from playwright.sync_api import sync_playwright

REPO_ROOT = Path(__file__).resolve().parent.parent
VIEWPORT = {"width": 1920, "height": 1080}

CASES: list[dict] = [
    {
        "name": "remove",
        "before": 4,
        "after": 3,
        "text_contains": "buying 1 clock unit",
        "text_not_contains": "2 clock units",
    },
    {
        "name": "zeroReduction",
        "before": 4,
        "after": 4,
        "text_contains": "holds at 4",
        "text_not_contains": "clock unit",
    },
    {
        "name": "negativeReduction",
        "before": 2,
        "after": 3,
        "text_contains": "rises by 1 to 3",
        "text_not_contains": "-1",
    },
    {
        "name": "clockEmpty",
        "before": 0,
        "after": 0,
        "text_contains": "holds at 0",
        "text_not_contains": "clock unit",
    },
    {
        "name": "capped",
        "before": 1,
        "after": 0,
        "text_contains": "buying 1 clock unit",
        "text_not_contains": "2 clock units",
    },
]


def free_port() -> int:
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.bind(("127.0.0.1", 0))
        return s.getsockname()[1]


def start_dev_server(port: int) -> subprocess.Popen:
    proc = subprocess.Popen(
        ["node", "node_modules/vite/bin/vite.js", "--port", str(port), "--strictPort"],
        cwd=str(REPO_ROOT),
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )
    import urllib.request

    base = f"http://127.0.0.1:{port}/"
    for _ in range(60):
        if proc.poll() is not None:
            raise RuntimeError("vite dev server exited early")
        try:
            with urllib.request.urlopen(base, timeout=1):
                return proc
        except Exception:
            time.sleep(0.25)
    raise RuntimeError("vite dev server did not become ready")


def read_clock(page) -> int:
    raw = (page.locator("#clock-reading").text_content() or "").strip()
    m = re.match(r"(\d+)", raw)
    assert m, f"unparseable clock reading: {raw!r}"
    return int(m.group(1))


def run_case(browser, base: str, case: dict) -> dict:
    outcome: dict = {"case": case["name"], "ok": False, "fail": None, "console_errors": []}
    context = browser.new_context(viewport=VIEWPORT)
    page = context.new_page()
    origin = urlparse(base).netloc
    page.on(
        "response",
        lambda r: outcome["console_errors"].append(f"{r.status} {r.url}")
        if urlparse(r.url).netloc == origin and r.status >= 400
        else None,
    )
    page.on("pageerror", lambda e: outcome["console_errors"].append(f"pageerror: {e}"))
    try:
        page.goto(base, wait_until="networkidle")
        page.wait_for_selector("#title-screen:not(.hidden)", timeout=15000)
        page.evaluate("document.getElementById('title-screen').classList.add('hidden')")
        page.evaluate(f"window.__wp.triggerReward({json.dumps(case['name'])})")
        page.wait_for_selector("#reward-overlay:not(.hidden)", timeout=8000)

        cards = page.locator("#reward-cards .wp-card")
        assert cards.count() == 3, f"expected the three-card reward surface, got {cards.count()}"
        clock_card = None
        for i in range(cards.count()):
            text = cards.nth(i).text_content() or ""
            if "clock unit" in text or "intrusion clock" in text:
                clock_card = (cards.nth(i), text)
                break
        assert clock_card is not None, "no clock-reduction card rendered"

        before = read_clock(page)
        assert before == case["before"], f"fixture clock {before} != intended {case['before']}"
        text = clock_card[1]
        assert case["text_contains"] in text, (
            f"card text does not state the applied effect "
            f"({case['text_contains']!r} missing): {text!r}"
        )
        assert case["text_not_contains"] not in text, (
            f"card text claims a false amount ({case['text_not_contains']!r} present): {text!r}"
        )

        clock_card[0].click()
        time.sleep(0.3)
        assert page.locator("#reward-overlay.hidden").count() > 0, "reward overlay stayed open after the pick"
        after = read_clock(page)
        assert after == case["after"], (
            f"applied clock {case['before']} -> {after} != the displayed effect "
            f"({case['before']} -> {case['after']})"
        )
        outcome["ok"] = True
    except Exception as e:
        outcome["fail"] = str(e)
    finally:
        context.close()
    return outcome


def main() -> int:
    if not (REPO_ROOT / "src" / "main.ts").exists():
        print("run from the repository root")
        return 1

    port = free_port()
    base = f"http://127.0.0.1:{port}/"
    server = start_dev_server(port)
    results: list[dict] = []
    try:
        with sync_playwright() as pw:
            browser = pw.chromium.launch(headless=True)
            for case in CASES:
                results.append(run_case(browser, base, case))
            browser.close()
    finally:
        server.terminate()
        try:
            server.wait(timeout=5)
        except subprocess.TimeoutExpired:
            server.kill()

    print("Reward boundary fixture (dev build, real card renderer + real applyReward)")
    print("=" * 76)
    failed = 0
    for r in results:
        status = "PASS" if r["ok"] else "FAIL"
        if not r["ok"]:
            failed += 1
        print(f"  [{status}] {r['case']}" + (f": {r['fail']}" if r["fail"] else ""))
        for e in r["console_errors"][:4]:
            print(f"         {e}")
    print("=" * 76)
    print(f"{len(results) - failed}/{len(results)} boundary cases passed")
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())
