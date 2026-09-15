#!/usr/bin/env python3
"""
Script Name  : capture.py
Description  : Playwright regression harness for the GameUI-migrated Within
               Parameters UI. Boots the dev server, walks every migrated screen
               from title to ending, captures a neon baseline screenshot per
               screen, and asserts zero console errors and zero non-origin /
               failed network requests.
Repository   : within-parameters-visual-novel
Author       : VintageDon (https://github.com/vintagedon/)
Created      : 2026-06-22

Usage
-----
    python3 tests/capture.py            # capture baselines
    python3 tests/capture.py --check    # regression check against committed .sha1

The harness starts the Vite dev server itself on an isolated port, so no manual
`npm run dev` is required. Playwright runs under Chromium headless only.

Check mode is read-only with respect to tests/baseline/: candidate screenshots
stay in memory and are compared against the committed sidecars, so a failing
check cannot damage the approved artifacts it guards. Every screen declared in
SCREENS is required in BOTH modes; a declared screen the walk never reached is
a failure that names the missing step.

Step structure
--------------
SCREENS is an ordered list of (step, filename) pairs. The walk captures each in
turn. Spec 03 appends its new screens (dossier, score breakdown) to this list
and adds their drivers — extending the harness is a small edit, not a rewrite.
"""

from __future__ import annotations

import hashlib
import os
import socket
import subprocess
import sys
import time
from pathlib import Path
from typing import Callable
from urllib.parse import urlparse

from playwright.sync_api import Page, sync_playwright

# =============================================================================
# Configuration
# =============================================================================

REPO_ROOT = Path(__file__).resolve().parent.parent
BASELINE_DIR = Path(__file__).resolve().parent / "baseline"
CHECK_MODE = "--check" in sys.argv

# Each migrated screen, in capture order. (step name, baseline filename).
# New screens (spec 03+) append here.
SCREENS: list[tuple[str, str]] = [
    ("title", "01-title.png"),
    ("settings", "04-settings.png"),
    ("dossier", "09-dossier.png"),
    ("dossier-reroll", "10-dossier-reroll.png"),
    ("lore-card", "02-lore-card.png"),
    ("hud-midrun", "03-hud-midrun.png"),
    ("comms-interrupt", "07-comms-interrupt.png"),
    ("reward-overlay", "06-reward-overlay.png"),
    ("ending", "08-ending.png"),
    ("save-load-confirm", "05-save-load-confirm.png"),
]
SCREEN_MAP: dict[str, str] = dict(SCREENS)

VIEWPORT = {"width": 1440, "height": 900}
ACTION_INTERVAL_MS = 160   # pause between walk actions (typewriter settle)
MAX_WALK_ACTIONS = 1200    # safety cap on the run walk


# =============================================================================
# Dev-server lifecycle
# =============================================================================


def free_port() -> int:
    """Return an OS-allocated free TCP port for the dev server."""
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.bind(("127.0.0.1", 0))
        return s.getsockname()[1]


def start_dev_server(port: int) -> subprocess.Popen:
    """Start the Vite dev server (via node; the .bin/vite lacks the exec bit on
    this host) and block until it serves index.html."""
    env = os.environ.copy()
    proc = subprocess.Popen(
        ["node", "node_modules/vite/bin/vite.js", "--port", str(port), "--strictPort"],
        cwd=str(REPO_ROOT),
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
        env=env,
    )
    import urllib.request

    base = f"http://127.0.0.1:{port}/"
    for _ in range(60):
        if proc.poll() is not None:
            raise RuntimeError("Dev server exited early")
        try:
            with urllib.request.urlopen(base, timeout=1):
                return proc
        except Exception:
            time.sleep(0.25)
    raise RuntimeError("Dev server did not become ready")


# =============================================================================
# Walk helpers
# =============================================================================


def visible(page: Page, selector: str) -> bool:
    """True if the element matching selector is in the DOM and not .hidden."""
    el = page.query_selector(selector)
    if el is None:
        return False
    return el.is_visible()


def click_first(page: Page, selector: str) -> bool:
    """Click the first visible matching element; return False if none."""
    el = page.query_selector(selector)
    if el is None or not el.is_visible():
        return False
    el.click()
    return True


def click_text(page: Page, container: str, text: str) -> bool:
    """Click the first framework button under container whose label matches text."""
    loc = page.locator(f"{container} .gui-btn", has_text=text)
    if loc.count() == 0:
        return False
    loc.first.click()
    return True


# Each migrated screen must show its framework component. Mapped here so the
# harness asserts the migration (not just that something rendered). Spec 03
# extends this map when it adds the dossier and score screens.
VERIFY: dict[str, str] = {
    "title": "#title-menu .gui-btn",
    "settings": "#settings-rows .gui-switch, #settings-rows .gui-toggle",
    "save-load-confirm": ".gui-modal.is-open.gui-modal--danger",
    "lore-card": "#dialogue-text",
    "hud-midrun": "#sidebar .gui-panel .gui-bar--segmented",
    "comms-interrupt": "#comms-panel-body.gui-panel--warning",
    "reward-overlay": ".wp-reward-cards .gui-card",
    "ending": "#ending-actions .gui-btn",
    # Spec 03: the dossier (chargen) and its post-reroll state. Both render
    # the two framework trait cards plus DEPLOY/REROLL gui-btn controls.
    "dossier": "#dossier-screen:not(.hidden) .wp-dossier-traits .gui-card",
    "dossier-reroll": "#dossier-screen:not(.hidden) .wp-dossier-traits .gui-card",
}


def assert_framework(page: Page, step: str, errors: list[str]):
    """Verify the framework component for a migrated screen is present in the DOM."""
    selector = VERIFY.get(step)
    if not selector:
        return
    if page.locator(selector).count() == 0:
        errors.append(f"framework check failed: {step} missing {selector}")
        print(f"    FRAMEWORK-FAIL {step}: {selector}")


def capture(page: Page, filename: str, errors: list[str]):
    """Screenshot the current viewport and record or compare its sha1.

    Capture mode writes the approved PNG plus its .sha1 sidecar into the
    baseline dir. Check mode never touches the baseline dir: the candidate
    stays in memory (screenshot bytes) and is hashed against the committed
    sidecar, so both pass and failure leave the approved artifacts
    byte-identical."""
    sidecar = BASELINE_DIR / f"{filename}.sha1"
    if CHECK_MODE:
        digest = hashlib.sha1(page.screenshot(animations="disabled")).hexdigest()
        if not sidecar.exists():
            errors.append(f"{filename}: no baseline .sha1")
            print(f"    NO BASELINE  {filename}")
        elif sidecar.read_text().strip() != digest:
            errors.append(f"{filename}: regression")
            print(f"    REGRESSION   {filename}")
        else:
            print(f"    ok           {filename}")
    else:
        BASELINE_DIR.mkdir(parents=True, exist_ok=True)
        shot_bytes = page.screenshot(animations="disabled")
        (BASELINE_DIR / filename).write_bytes(shot_bytes)
        sidecar.write_text(f"{hashlib.sha1(shot_bytes).hexdigest()}\n")
        print(f"    captured     {filename}")


# =============================================================================
# Screen drivers
# =============================================================================


def boot_and_capture_title(page: Page, base_url: str, captured: set[str], errors: list[str]):
    """Boot the game and capture the title screen."""
    page.goto(base_url, wait_until="networkidle")
    page.wait_for_selector("#title-screen:not(.hidden)", timeout=15000)
    page.wait_for_timeout(400)
    if "title" not in captured:
        assert_framework(page, "title", errors)
        capture(page, SCREEN_MAP["title"], errors)
        captured.add("title")


def capture_settings(page: Page, captured: set[str], errors: list[str]):
    """Open settings from the title and capture the migrated settings controls."""
    click_text(page, "#title-menu", "SETTINGS")
    page.wait_for_selector("#settings-screen:not(.hidden)", timeout=5000)
    page.wait_for_timeout(300)
    if "settings" not in captured:
        assert_framework(page, "settings", errors)
        capture(page, SCREEN_MAP["settings"], errors)
        captured.add("settings")
    click_first(page, "#settings-footer .gui-btn")  # CLOSE
    page.locator("#settings-screen").wait_for(state="hidden", timeout=5000)


def start_run_and_capture_lore(page: Page, captured: set[str], errors: list[str]):
    """Click NEW GAME, capture the chargen dossier (initial and post-reroll),
    then DEPLOY into the lore card. Spec 03 inserts the dossier before the lore
    card; the dossier's REROLL regenerates and increments the displayed score
    ceiling, so both states are captured."""
    click_text(page, "#title-menu", "NEW GAME")
    page.locator("#title-screen").wait_for(state="hidden", timeout=10000)

    # Dossier appears (chargen) before the lore card.
    page.wait_for_selector("#dossier-screen:not(.hidden)", timeout=10000)
    page.wait_for_timeout(400)
    if "dossier" not in captured:
        assert_framework(page, "dossier", errors)
        capture(page, SCREEN_MAP["dossier"], errors)
        captured.add("dossier")

    # Reroll once → the ceiling increments; capture the post-reroll state.
    click_first(page, "#dossier-reroll")
    page.wait_for_timeout(500)
    if "dossier-reroll" not in captured:
        assert_framework(page, "dossier-reroll", errors)
        capture(page, SCREEN_MAP["dossier-reroll"], errors)
        captured.add("dossier-reroll")

    # Deploy the candidate → transitions to the lore card.
    click_first(page, "#dossier-deploy")
    page.locator("#dossier-screen").wait_for(state="hidden", timeout=10000)
    page.wait_for_selector("#dialogue-text", timeout=10000)
    # Let the lore scene's first line and background settle, then skip typewriter.
    page.wait_for_timeout(500)
    click_first(page, "#bottom-bar")
    page.wait_for_timeout(400)
    if "lore-card" not in captured:
        assert_framework(page, "lore-card", errors)
        capture(page, SCREEN_MAP["lore-card"], errors)
        captured.add("lore-card")


def walk_run(page: Page, captured: set[str], errors: list[str]):
    """Drive the run forward just far enough to capture the in-game HUD, the
    comms interrupt, and the reward overlay. These all appear early (HUD at the
    discovery scene, the first reward after stop 1's event), so the walk stops
    once all three are captured. The ending shell is captured separately via the
    dev hook because the natural run flow stalls at the approach-event reward
    (an engine edge case outside this presentation spec's scope)."""
    hud_done = comms_done = reward_done = False

    for _ in range(MAX_WALK_ACTIONS):
        if hud_done and comms_done and reward_done:
            return

        # Reward overlay → capture first occurrence, then pick a reward.
        if visible(page, "#reward-overlay:not(.hidden)"):
            if not reward_done:
                page.wait_for_timeout(400)
                assert_framework(page, "reward-overlay", errors)
                capture(page, SCREEN_MAP["reward-overlay"], errors)
                captured.add("reward-overlay")
                reward_done = True
            click_first(page, ".wp-reward-cards .gui-card")
            page.wait_for_timeout(ACTION_INTERVAL_MS)
            continue

        # Comms overlay → capture (triggered via the dev hook below), then ack.
        if visible(page, "#comms-overlay:not(.hidden)"):
            if not comms_done:
                page.wait_for_timeout(400)
                assert_framework(page, "comms-interrupt", errors)
                capture(page, SCREEN_MAP["comms-interrupt"], errors)
                captured.add("comms-interrupt")
                comms_done = True
            click_first(page, "#comms-panel-body .gui-btn")
            page.wait_for_timeout(ACTION_INTERVAL_MS)
            continue

        # HUD becomes visible at the discovery scene → capture once. Right after,
        # trigger the (balance-gated) comms overlay via the dev hook so it can be
        # captured over the live game rather than behind the title overlay.
        if not hud_done and visible(page, "#game-container:not(.fullscreen)") and visible(page, "#clock-segments .gui-bar__pip"):
            page.wait_for_timeout(500)
            assert_framework(page, "hud-midrun", errors)
            capture(page, SCREEN_MAP["hud-midrun"], errors)
            captured.add("hud-midrun")
            hud_done = True
            if not comms_done:
                page.evaluate("window.__wp && window.__wp.triggerComms()")
                page.wait_for_timeout(500)
            continue

        # Choices → pick the first enabled choice.
        if click_first(page, "#choices-area .gui-btn:not([disabled])"):
            page.wait_for_timeout(ACTION_INTERVAL_MS)
            continue

        # Otherwise advance dialogue (click also skips an in-progress typewriter).
        click_first(page, "#bottom-bar")
        page.wait_for_timeout(ACTION_INTERVAL_MS)

    missing = {"hud-midrun": hud_done, "comms-interrupt": comms_done, "reward-overlay": reward_done}
    for name, done in missing.items():
        if not done and name not in captured:
            errors.append(f"walk: {name} never appeared")


def capture_ending(page: Page, captured: set[str], errors: list[str]):
    """Capture the ending screen via the dev hook, which composes the migrated
    ending panel + buttons with a representative complete run state. Spec 03
    adds the score breakdown (grade, components, reroll penalty, epilogue lines)
    below the narrative epilogue, so the grade element is asserted here too."""
    page.evaluate("window.__wp && window.__wp.triggerEnding()")
    page.wait_for_selector("#ending-screen:not(.hidden)", timeout=5000)
    page.wait_for_timeout(500)
    # Spec 03: the score breakdown must render (grade + reroll penalty line).
    if page.locator("#ending-score .wp-score-grade").count() == 0:
        errors.append("ending: score breakdown grade missing")
        print("    FRAMEWORK-FAIL ending: #ending-score .wp-score-grade")
    if page.locator("#ending-score .wp-score-penalty").count() == 0:
        errors.append("ending: reroll penalty line missing")
        print("    FRAMEWORK-FAIL ending: #ending-score .wp-score-penalty")
    if "ending" not in captured:
        assert_framework(page, "ending", errors)
        capture(page, SCREEN_MAP["ending"], errors)
        captured.add("ending")


def capture_save_load_confirm(page: Page, captured: set[str], errors: list[str]):
    """Seed an autosave via the dev hook, open LOAD GAME from the title, click the
    occupied autosave slot, and capture the danger confirm dialog that gates the
    load. Cancels out of the confirm and the save/load screen afterwards."""
    page.evaluate("window.__wp && window.__wp.seedAutosave()")
    page.wait_for_timeout(200)
    click_text(page, "#title-menu", "LOAD GAME")
    page.wait_for_selector("#save-load-screen:not(.hidden)", timeout=5000)
    page.wait_for_timeout(300)

    # Click the first occupied slot's action to open the danger confirm.
    click_first(page, ".wp-slot-panel .gui-btn:not([disabled])")
    page.wait_for_selector(".gui-modal.is-open", timeout=5000)
    page.wait_for_timeout(500)
    if "save-load-confirm" not in captured:
        assert_framework(page, "save-load-confirm", errors)
        capture(page, SCREEN_MAP["save-load-confirm"], errors)
        captured.add("save-load-confirm")

    # Cancel the confirm, then close the save/load screen.
    page.locator(".gui-modal__footer .gui-btn", has_text="CANCEL").first.click()
    page.wait_for_timeout(300)
    click_first(page, "#save-load-footer .gui-btn")  # CANCEL
    page.locator("#save-load-screen").wait_for(state="hidden", timeout=5000)


# =============================================================================
# Main
# =============================================================================


def is_off_origin(url: str, origin: str) -> bool:
    """True if a request URL is off-origin (relative to the dev server)."""
    try:
        parsed = urlparse(url)
        if parsed.scheme not in ("http", "https", "ws", "wss"):
            return False
        return parsed.netloc != origin
    except Exception:
        return False


def is_same_origin_asset(url: str, origin: str) -> bool:
    """True for a same-origin /assets/ request. These are the game's own
    placeholder assets; the dev server does not auto-serve the repo-root assets/
    dir, so they 404 pre-existingly and are not a migration regression."""
    try:
        parsed = urlparse(url)
        return parsed.netloc == origin and parsed.path.startswith("/assets/")
    except Exception:
        return False


def main() -> int:
    BASELINE_DIR.mkdir(parents=True, exist_ok=True)
    port = free_port()
    base_url = f"http://127.0.0.1:{port}/"
    origin = f"127.0.0.1:{port}"
    errors: list[str] = []
    off_origin: list[str] = []        # non-origin requests — hard failure (D1)
    failed_same_origin: list[str] = []  # same-origin asset 404s — pre-existing, warning

    server = start_dev_server(port)
    try:
        with sync_playwright() as pw:
            browser = pw.chromium.launch(headless=True)
            context = browser.new_context(viewport=VIEWPORT)
            page = context.new_page()

            # Surface console/page errors and non-origin / failed requests.
            page.on("console", lambda m: errors.append(f"console.{m.type}: {m.text}") if m.type == "error" else None)
            page.on("pageerror", lambda e: errors.append(f"pageerror: {e}"))
            # Any non-origin request is a hard failure (the self-contained contract).
            page.on("requestfinished", lambda r: off_origin.append(r.url) if is_off_origin(r.url, origin) else None)
            page.on("requestfailed", lambda r: (
                failed_same_origin.append(r.url) if is_same_origin_asset(r.url, origin)
                else off_origin.append(f"FAILED {r.url}")
            ))

            captured: set[str] = set()
            # Seed every randomness source so captures are deterministic across
            # capture/check runs: __wpSeed fixes the rolled protagonist (which
            # drives trait-modified starting stats); Math.random is replaced with
            # a seeded mulberry32 so the run walk's event draws and clock jitter
            # (which use defaultRng -> Math.random) are reproducible too; and
            # Date.now is pinned so save-slot timestamps stop flapping. All three
            # are no-ops in production (this script never ships).
            page.add_init_script(
                "window.__wpSeed = 2027;"
                "Date.now = () => 1719504000000;"
                "Math.random = (function(){ let s = 2027 >>> 0;"
                "  return function(){ s |= 0; s = (s + 0x6d2b79f5) | 0;"
                "    let t = Math.imul(s ^ (s >>> 15), 1 | s);"
                "    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;"
                "    return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };"
                "})();"
            )
            boot_and_capture_title(page, base_url, captured, errors)
            capture_settings(page, captured, errors)
            capture_save_load_confirm(page, captured, errors)
            start_run_and_capture_lore(page, captured, errors)
            walk_run(page, captured, errors)
            capture_ending(page, captured, errors)

            browser.close()

        # Report any screens that were never reached. Required in both modes:
        # a check run that skips a declared screen is a failure, not a pass.
        for step, filename in SCREENS:
            if step not in captured:
                errors.append(f"screen not captured: {step}")
                print(f"    MISSING      {filename}")
    finally:
        server.terminate()
        try:
            server.wait(timeout=5)
        except subprocess.TimeoutExpired:
            server.kill()

    # Network acceptance check. The migration contract (Deliverable 1) is zero
    # non-origin requests; same-origin /assets/ 404s are a pre-existing
    # placeholder-asset condition (the dev server does not auto-serve the
    # repo-root assets/ dir) and are reported as warnings, not failures.
    if off_origin:
        print(f"\nNETWORK: {len(off_origin)} non-origin request(s) — FAIL:")
        for url in off_origin[:20]:
            print(f"  {url}")
        errors.append("non-origin network requests")
    else:
        print("\nNETWORK: zero non-origin requests")
    if failed_same_origin:
        print(f"NETWORK: {len(failed_same_origin)} pre-existing same-origin /assets/ 404(s) — warning:")
        for url in sorted(set(failed_same_origin))[:10]:
            print(f"  {url}")

    # Coverage check.
    expected = {step for step, _ in SCREENS}
    missing = expected - captured
    if missing:
        print(f"\nCOVERAGE: missing screens: {sorted(missing)}")

    if errors:
        print(f"\nFAIL: {len(errors)} failure(s)")
        for e in errors[:30]:
            print(f"  - {e}")
        return 1

    print("\nall green")
    return 0


if __name__ == "__main__":
    sys.exit(main())
