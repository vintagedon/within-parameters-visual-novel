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
stay in memory and are compared against the committed sidecars, with a tightly
bounded pixel fallback for measured Chromium compositor noise. A failing check
cannot damage the approved artifacts it guards. Every screen declared in
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
import io
import json
import os
import socket
import subprocess
import sys
import time
from pathlib import Path
from typing import Callable
from urllib.parse import urlparse

from PIL import Image, ImageChops
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
    ("journey-midrun", "12-journey-midrun.png"),
    ("comms-interrupt", "07-comms-interrupt.png"),
    ("document-overlay", "11-document-overlay.png"),
    ("reward-overlay", "06-reward-overlay.png"),
    ("ending", "08-ending.png"),
    ("save-load-confirm", "05-save-load-confirm.png"),
]
SCREEN_MAP: dict[str, str] = dict(SCREENS)

VIEWPORT = {"width": 1920, "height": 1080}
DEVICE_SCALE_FACTOR = 1

# Gate 5.8 evidence (observed 2026-10-04, dev server, Chromium headless):
# the historical "ambient-audio 404" warning is not an HTTP 404. The request
# for /assets/audio/bgm-ambient.ogg never receives a response status; the
# browser reports requestfailed with net::ERR_ABORTED, twice, when the BGM
# crossfade swaps sources and cancels the in-flight media-element load. The
# file itself serves HTTP 200 from the dev server (observed directly), so
# this is a browser-cancelled media request in working game audio, not a
# missing or mispathed asset. The harness classifies exactly that shape
# (same-origin .ogg under /assets/audio/ aborted in transport) and no other.
MEDIA_CANCELLATION_NOTE = "BGM media loads aborted by the audio crossfade (net::ERR_ABORTED, no HTTP status)"
ACTION_INTERVAL_MS = 160   # pause between walk actions (typewriter settle)
MAX_WALK_ACTIONS = 1200    # safety cap on the run walk
MAX_NOISE_PIXELS = 64
MAX_NOISE_CHANNEL_DELTA = 8
MAX_NOISE_TOTAL_DELTA = 128


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
    loc = page.locator(f"{container} .gc-button", has_text=text)
    if loc.count() == 0:
        return False
    loc.first.click()
    return True


# Each migrated screen must show its framework component. Mapped here so the
# harness asserts the migration (not just that something rendered). Spec 03
# extends this map when it adds the dossier and score screens.
VERIFY: dict[str, str] = {
    "title": "#title-menu .gc-button",
    "settings": "#settings-rows .wp-switch, #settings-rows .wp-toggle",
    "save-load-confirm": ".wp-modal.is-open.wp-modal--danger",
    "lore-card": "#dialogue-text",
    "hud-midrun": "#sidebar .gc-panel .gc-meter[data-shape='segmented']",
    "comms-interrupt": "#comms-panel-body.gc-panel[data-wp-accent='amber']",
    "journey-midrun": "#sidebar #clock-bar .gc-meter__fill",
    "document-overlay": "#document-overlay:not(.hidden) .wp-document-panel",
    "reward-overlay": ".wp-reward-cards .wp-card",
    "ending": "#ending-actions .gc-button",
    # Spec 03: the dossier (chargen) and its post-reroll state. Both render
    # the two framework trait cards plus DEPLOY/REROLL framework button controls.
    "dossier": "#dossier-screen:not(.hidden) .wp-dossier-traits .wp-card",
    "dossier-reroll": "#dossier-screen:not(.hidden) .wp-dossier-traits .wp-card",
}


def assert_framework(page: Page, step: str, errors: list[str]):
    """Verify the framework component for a migrated screen is present in the DOM."""
    selector = VERIFY.get(step)
    if not selector:
        return
    if page.locator(selector).count() == 0:
        errors.append(f"framework check failed: {step} missing {selector}")
        print(f"    FRAMEWORK-FAIL {step}: {selector}")


def compare_png_pixels(reference: bytes, candidate: bytes) -> tuple[bool, tuple[int, int, int]]:
    """Accept only the measured low-order Chromium compositor variance."""
    with Image.open(io.BytesIO(reference)) as reference_image, Image.open(io.BytesIO(candidate)) as candidate_image:
        reference_rgb = reference_image.convert("RGB")
        candidate_rgb = candidate_image.convert("RGB")
        if reference_rgb.size != candidate_rgb.size:
            return False, (reference_rgb.width * reference_rgb.height, 255, 255)
        raw = ImageChops.difference(reference_rgb, candidate_rgb).tobytes()
    changed_pixels = sum(
        1 for offset in range(0, len(raw), 3)
        if raw[offset] or raw[offset + 1] or raw[offset + 2]
    )
    max_channel_delta = max(raw, default=0)
    total_delta = sum(raw)
    stats = (changed_pixels, max_channel_delta, total_delta)
    accepted = (
        changed_pixels <= MAX_NOISE_PIXELS
        and max_channel_delta <= MAX_NOISE_CHANNEL_DELTA
        and total_delta <= MAX_NOISE_TOTAL_DELTA
    )
    return accepted, stats


def capture(page: Page, filename: str, errors: list[str]):
    """Screenshot the current viewport and record or compare its sha1.

    Capture mode writes the approved PNG plus its .sha1 sidecar into the
    baseline dir. Check mode never touches the baseline dir: the candidate
    stays in memory and is hashed against the committed sidecar first, then
    compared within the bounded compositor-noise budget when the hash differs.
    Both pass and failure leave the approved artifacts byte-identical."""
    baseline = BASELINE_DIR / filename
    sidecar = BASELINE_DIR / f"{filename}.sha1"
    if CHECK_MODE:
        candidate = page.screenshot(animations="disabled")
        digest = hashlib.sha1(candidate).hexdigest()
        if not sidecar.exists():
            errors.append(f"{filename}: no baseline .sha1")
            print(f"    NO BASELINE  {filename}")
        elif sidecar.read_text().strip() != digest:
            if not baseline.exists():
                errors.append(f"{filename}: no baseline PNG")
                print(f"    NO BASELINE  {filename}")
            else:
                accepted, stats = compare_png_pixels(baseline.read_bytes(), candidate)
                if accepted:
                    pixels, max_delta, total_delta = stats
                    print(
                        f"    ok (noise)   {filename} "
                        f"[{pixels}px, max {max_delta}, total {total_delta}]"
                    )
                else:
                    errors.append(f"{filename}: regression (pixel delta {stats})")
                    print(f"    REGRESSION   {filename} [pixel delta {stats}]")
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
    """Boot the game and capture the title screen. The build identifier is
    asserted present and non-empty, then masked to a fixed token BEFORE the
    capture, so the baseline hash does not change with every commit (gate
    5.8; the identifier itself is verified by build_id_check.py)."""
    page.goto(base_url, wait_until="networkidle")
    page.wait_for_selector("#title-screen:not(.hidden)", timeout=15000)
    page.wait_for_timeout(400)
    if "title" not in captured:
        build_id_text = page.evaluate("() => document.getElementById('build-id')?.textContent?.trim() || ''")
        if not build_id_text:
            errors.append("build identifier missing on the title screen")
        page.evaluate("() => { const el = document.getElementById('build-id'); if (el) el.textContent = 'BUILD'; }")
        page.wait_for_timeout(100)
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
    click_first(page, "#settings-footer .gc-button")  # CLOSE
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
    """Drive the run forward to capture the in-game HUD, the comms interrupt,
    the found-document overlay, and the reward overlay. All appear during the
    first stops of a seeded run (the comms via the dev hook below; the
    document overlay whenever the draw surfaces a documented event), so the
    walk stops once all four are captured."""
    hud_done = comms_done = reward_done = doc_done = False

    for _ in range(MAX_WALK_ACTIONS):
        if hud_done and comms_done and reward_done and doc_done:
            return

        # Found-document overlay → capture the first occurrence, then ack.
        if visible(page, "#document-overlay:not(.hidden)"):
            if not doc_done:
                page.wait_for_timeout(400)
                assert_framework(page, "document-overlay", errors)
                capture(page, SCREEN_MAP["document-overlay"], errors)
                captured.add("document-overlay")
                doc_done = True
            click_first(page, "#document-footer .gc-button")
            page.wait_for_timeout(ACTION_INTERVAL_MS)
            continue

        # Reward overlay → capture first occurrence, then pick a reward.
        if visible(page, "#reward-overlay:not(.hidden)"):
            if not reward_done:
                page.wait_for_timeout(400)
                assert_framework(page, "reward-overlay", errors)
                capture(page, SCREEN_MAP["reward-overlay"], errors)
                captured.add("reward-overlay")
                reward_done = True
            click_first(page, ".wp-reward-cards .wp-card")
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
            click_first(page, "#comms-panel-body .gc-button")
            page.wait_for_timeout(ACTION_INTERVAL_MS)
            continue

        # HUD becomes visible at the discovery scene → capture once. Right after,
        # trigger the (balance-gated) comms overlay via the dev hook so it can be
        # captured over the live game rather than behind the title overlay.
        if not hud_done and visible(page, "#game-container:not(.fullscreen)") and visible(page, "#clock-bar .gc-meter__fill"):
            # Deterministic capture: the dialogue line may be mid-typewriter,
            # which makes the band's pixels load-dependent. Skip to the end of
            # the line and let the text settle before capturing.
            for _ in range(10):
                if not visible(page, "#dialogue-text.typing"):
                    break
                click_first(page, "#bottom-bar")
                page.wait_for_timeout(120)
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
        if click_first(page, "#choices-area .gc-button:not([disabled])"):
            page.wait_for_timeout(ACTION_INTERVAL_MS)
            continue

        # Otherwise advance dialogue (click also skips an in-progress typewriter).
        click_first(page, "#bottom-bar")
        page.wait_for_timeout(ACTION_INTERVAL_MS)

    missing = {
        "hud-midrun": hud_done,
        "comms-interrupt": comms_done,
        "reward-overlay": reward_done,
        "document-overlay": doc_done,
    }
    for name, done in missing.items():
        if not done and name not in captured:
            errors.append(f"walk: {name} never appeared")


def capture_journey_midrun(page: Page, captured: set[str], errors: list[str]):
    """Gate 5.8 candidate: the composed journey screen mid-run with choices
    showing and the clock at a middle value. The clock rides the real HUD
    path (the dev presentation probe re-renders through refreshHud); the
    choices come from the live run's next situation scene."""
    for _ in range(MAX_WALK_ACTIONS):
        if page.query_selector_all("#choices-area .gc-button:not([disabled])") and \
                visible(page, "#game-container:not(.fullscreen)"):
            break
        if visible(page, "#document-overlay:not(.hidden)"):
            click_first(page, "#document-footer .gc-button")
            page.wait_for_timeout(ACTION_INTERVAL_MS)
            continue
        if visible(page, "#comms-overlay:not(.hidden)"):
            click_first(page, "#comms-panel-body .gc-button")
            page.wait_for_timeout(ACTION_INTERVAL_MS)
            continue
        if visible(page, "#reward-overlay:not(.hidden)"):
            click_first(page, ".wp-reward-cards .wp-card")
            page.wait_for_timeout(ACTION_INTERVAL_MS)
            continue
        if click_first(page, "#choices-area .gc-button:not([disabled])"):
            page.wait_for_timeout(ACTION_INTERVAL_MS)
            continue
        click_first(page, "#bottom-bar")
        page.wait_for_timeout(ACTION_INTERVAL_MS)
    else:
        errors.append("journey-midrun: choices never appeared")
        return
    page.evaluate("window.__wp && window.__wp.setClock(4)")
    page.wait_for_timeout(600)
    if "journey-midrun" not in captured:
        assert_framework(page, "journey-midrun", errors)
        capture(page, SCREEN_MAP["journey-midrun"], errors)
        captured.add("journey-midrun")


def capture_ending(page: Page, captured: set[str], errors: list[str]):
    """Capture the ending screen via the dev hook, which composes the migrated
    ending panel + buttons with a representative complete run state. Spec 03
    adds the score breakdown (grade, components, reroll penalty, epilogue lines)
    below the narrative epilogue, so the grade element is asserted here too.

    The panel exceeds the harness viewport at 1440x900; since the overlay
    scroll repair (spec 03a gate A1.2) the ending overlay is a scroll
    container, and the driver scrolls it to the bottom before capturing so
    the baseline shows the score breakdown and the action row rather than a
    clipped top.

    A2.5 fix (approval finding: capture 08 retained a reward overlay): the
    walk can return while the run's next reward surface has already opened —
    the acked document's consequence flows straight into a reward pick — and
    triggerEnding() then renders the ending screen beneath it. Dismiss any
    open reward surface through the real controls first, and assert no
    reward surface is visible in the DOM at capture time: the ending
    baseline must depict the ending screen unobscured."""
    for _ in range(10):
        if not visible(page, "#reward-overlay:not(.hidden)"):
            break
        click_first(page, ".wp-reward-cards .wp-card")
        page.wait_for_timeout(ACTION_INTERVAL_MS)
    page.evaluate("window.__wp && window.__wp.triggerEnding()")
    page.wait_for_selector("#ending-screen:not(.hidden)", timeout=5000)
    page.wait_for_timeout(500)
    page.evaluate(
        "() => { const o = document.getElementById('ending-screen');"
        " o.scrollTo(0, o.scrollHeight); }"
    )
    page.wait_for_timeout(300)
    # Spec 03: the score breakdown must render (grade + reroll penalty line).
    if page.locator("#ending-score .wp-score-grade").count() == 0:
        errors.append("ending: score breakdown grade missing")
        print("    FRAMEWORK-FAIL ending: #ending-score .wp-score-grade")
    if page.locator("#ending-score .wp-score-penalty").count() == 0:
        errors.append("ending: reroll penalty line missing")
        print("    FRAMEWORK-FAIL ending: #ending-score .wp-score-penalty")
    if visible(page, "#reward-overlay:not(.hidden)"):
        errors.append("ending: reward surface visible in the DOM at capture time")
        print("    FRAMEWORK-FAIL ending: #reward-overlay visible at capture")
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
    click_first(page, ".wp-slot-panel .gc-button:not([disabled])")
    page.wait_for_selector(".wp-modal.is-open", timeout=5000)
    page.wait_for_timeout(500)
    if "save-load-confirm" not in captured:
        assert_framework(page, "save-load-confirm", errors)
        capture(page, SCREEN_MAP["save-load-confirm"], errors)
        captured.add("save-load-confirm")

    # Cancel the confirm, then close the save/load screen.
    page.locator(".wp-modal__footer .gc-button", has_text="CANCEL").first.click()
    page.wait_for_timeout(300)
    click_first(page, "#save-load-footer .gc-button")  # CANCEL
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


def is_same_origin(url: str, origin: str) -> bool:
    """True for a same-origin request."""
    try:
        return urlparse(url).netloc == origin
    except Exception:
        return False


def is_bgm_media(url: str) -> bool:
    """True for a BGM track request (the audio manifest's media elements)."""
    return "/assets/audio/" in url and url.endswith(".ogg")


def main() -> int:
    BASELINE_DIR.mkdir(parents=True, exist_ok=True)
    port = free_port()
    base_url = f"http://127.0.0.1:{port}/"
    origin = f"127.0.0.1:{port}"
    errors: list[str] = []
    off_origin: list[str] = []          # non-origin requests — hard failure
    failed_same_origin: list[str] = []  # same-origin responses with HTTP status >= 400 — hard failure
    transport_failures: list[str] = []  # same-origin requestfailed entries — hard failure unless classified
    media_cancellations: list[str] = []  # expected: BGM media loads aborted by the crossfade (see MEDIA_CANCELLATION_NOTE)

    server = start_dev_server(port)
    try:
        with sync_playwright() as pw:
            browser = pw.chromium.launch(headless=True)
            context = browser.new_context(viewport=VIEWPORT, device_scale_factor=DEVICE_SCALE_FACTOR)
            page = context.new_page()

            # Surface console/page errors and non-origin / failed requests.
            page.on("console", lambda m: errors.append(f"console.{m.type}: {m.text}") if m.type == "error" else None)
            page.on("pageerror", lambda e: errors.append(f"pageerror: {e}"))
            # Any non-origin request is a hard failure (the self-contained contract).
            page.on("requestfinished", lambda r: off_origin.append(r.url) if is_off_origin(r.url, origin) else None)
            # Same-origin HTTP status observed directly: a response of 400 or
            # above is a failure. No request is downgraded by its path.
            # Additionally: this dev server SPA-fallbacks missing files, so a
            # missing asset arrives as 200 text/html rather than a 404. An
            # asset path answered as HTML is recorded as a failure carrying
            # its actual status, never as a warning.
            def on_response(r):
                if not is_same_origin(r.url, origin):
                    return
                path = urlparse(r.url).path
                if not (path.startswith("/assets/") or path.startswith("/data/")):
                    if r.status >= 400:
                        failed_same_origin.append(f"{r.status} {r.url}")
                    return
                if r.status >= 400:
                    failed_same_origin.append(f"{r.status} {r.url}")
                    return
                ctype = (r.headers or {}).get("content-type", "")
                if "text/html" in ctype:
                    failed_same_origin.append(f"{r.status} text/html-fallback {r.url}")
            page.on("response", on_response)
            # Transport failures carry no HTTP status; recorded with their
            # actual failure reason. A narrow, evidenced class is expected:
            # the BGM crossfade aborts in-flight media loads (the browser
            # cancels the previous <audio> element's fetch when the source
            # changes). See MEDIA_CANCELLATION_NOTE. Everything else fails.
            def on_requestfailed(r):
                if not is_same_origin(r.url, origin):
                    off_origin.append(f"FAILED {r.url}")
                    return
                reason = r.failure or "unknown"
                if is_bgm_media(r.url) and "ABORTED" in reason:
                    media_cancellations.append(f"{reason} {r.url}")
                else:
                    transport_failures.append(f"{reason} {r.url}")
            page.on("requestfailed", on_requestfailed)

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
            capture_journey_midrun(page, captured, errors)
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

    # Network acceptance check (gate 5.8 rule): every same-origin request
    # that fails by HTTP status of 400 or above is a failure; transport
    # failures are failures unless they fall in the narrow, evidenced media
    # cancellation class below. No path-based downgrades.
    if off_origin:
        print(f"\nNETWORK: {len(off_origin)} non-origin request(s) — FAIL:")
        for url in off_origin[:20]:
            print(f"  {url}")
        errors.append("non-origin network requests")
    else:
        print("\nNETWORK: zero non-origin requests")
    if failed_same_origin:
        print(f"NETWORK: {len(failed_same_origin)} same-origin response(s) with HTTP status >= 400 — FAIL:")
        for url in sorted(set(failed_same_origin))[:10]:
            print(f"  {url}")
        errors.append("same-origin HTTP failures")
    if transport_failures:
        print(f"NETWORK: {len(transport_failures)} same-origin transport failure(s) — FAIL:")
        for url in sorted(set(transport_failures))[:10]:
            print(f"  {url}")
        errors.append("same-origin transport failures")
    if media_cancellations:
        print(f"NETWORK: {len(media_cancellations)} expected BGM media cancellation(s) (classified, not failures):")
        for url in sorted(set(media_cancellations))[:6]:
            print(f"  {url}")

    # Coverage check.
    expected = {step for step, _ in SCREENS}
    missing = expected - captured
    if missing:
        print(f"\nCOVERAGE: missing screens: {sorted(missing)}")

    # Status manifest (gate 5.8): every capture is pending-approval (this
    # unit's journey and title candidates) or interim (a regression reference
    # for this unit only, re-established by the next unit). None is approved.
    if not CHECK_MODE:
        approval = {
            "01-title.png": "pending-approval",
            "12-journey-midrun.png": "pending-approval",
        }
        manifest = {
            "generated": "PR 7 review-fix recapture at 1920x1080 DPR 1 (2026-10-05)",
            "captures": {
                filename: approval.get(filename, "interim")
                for _, filename in SCREENS
            },
        }
        (BASELINE_DIR / "manifest.json").write_text(json.dumps(manifest, indent=2, sort_keys=True) + "\n")
        print("\nMANIFEST: status manifest written (pending-approval: title and journey candidates; interim: all others)")

    if errors:
        print(f"\nFAIL: {len(errors)} failure(s)")
        for e in errors[:30]:
            print(f"  - {e}")
        return 1

    print("\nall green")
    return 0


if __name__ == "__main__":
    sys.exit(main())
