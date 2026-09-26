#!/usr/bin/env python3
"""
Script Name  : resume_check.py
Description  : A1.1 browser-level resume check — saves and resumes through the
               real player controls (HUD SAVE, reload, LOAD GAME, CONFIRM, and
               CONTINUE from autosave) on the production build, and asserts
               the restored journey presentation (sidebar, clock, stats,
               route, SAVE visible) plus an actionable continuation in every
               phase where SAVE is offered.
Repository   : within-parameters-visual-novel
Author       : VintageDon (https://github.com/vintagedon/)
Created      : 2026-09-26

Usage
-----
    npm run build
    /opt/agents/venv/bin/python tests/resume_check.py

Requires a fresh build (npm run build). Starts `vite preview` (production
bundle; import.meta.env.DEV is false, so the __wp dev hooks do not exist).
Deterministic seed setup only; no forced state, no dev hooks.

SAVE-enabled phases exercised here (the UI-reachable subset of the A1.1
phase list; reward-pick and document are covered by inset-covering overlays
and are exercised at the engine level in live-checks.ts):
    event-choice, event-consequence, comms, facility-entry, autosave-continue.

On a tree without the A1.2 repairs this check fails: the comms-window load
renders nothing (R1) and every load resumes with the HUD hidden (R2).
"""

from __future__ import annotations

import json
import socket
import subprocess
import sys
import time
from pathlib import Path
from urllib.parse import urlparse

from playwright.sync_api import sync_playwright, BrowserContext

REPO_ROOT = Path(__file__).resolve().parent.parent
VIEWPORT = {"width": 1440, "height": 900}
ACTION_MS = 120
SEED = 555555
MAX_ACTIONS = 3000

FACILITY_MARKER = "The facility perimeter"


def free_port() -> int:
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.bind(("127.0.0.1", 0))
        return s.getsockname()[1]


def start_preview(port: int) -> subprocess.Popen:
    proc = subprocess.Popen(
        ["node", "node_modules/vite/bin/vite.js", "preview", "--port", str(port), "--strictPort"],
        cwd=str(REPO_ROOT),
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )
    import urllib.request

    base = f"http://127.0.0.1:{port}/"
    for _ in range(60):
        if proc.poll() is not None:
            raise RuntimeError("vite preview exited early")
        try:
            with urllib.request.urlopen(base, timeout=1):
                return proc
        except Exception:
            time.sleep(0.25)
    raise RuntimeError("vite preview did not become ready")


class PhaseResult:
    def __init__(self, phase: str):
        self.phase = phase
        self.ok = False
        self.fail: str | None = None
        self.console_errors: list[str] = []
        self.failed_requests: list[str] = []


def new_context(browser, result: PhaseResult, base: str, viewport: dict | None = None, seed: int = SEED):
    context: BrowserContext = browser.new_context(viewport=viewport or VIEWPORT)
    page = context.new_page()
    page.add_init_script(f"window.__wpSeed = {seed};")
    origin = urlparse(base).netloc
    page.on(
        "response",
        lambda r: result.failed_requests.append(f"{r.status} {r.url}")
        if urlparse(r.url).netloc == origin and r.status >= 400
        else None,
    )
    page.on(
        "console",
        lambda m: result.console_errors.append(f"console.error: {m.text}")
        if m.type == "error"
        else None,
    )
    page.on("pageerror", lambda e: result.console_errors.append(f"pageerror: {e}"))
    return context, page



def new_game_to_first_choice(base: str, page, result: PhaseResult) -> dict:
    """NEW GAME → DEPLOY → advance to the stop-1 choice point. Returns the
    HUD readings at the save point."""
    page.goto(base, wait_until="networkidle")
    page.wait_for_selector("#title-screen:not(.hidden)", timeout=15000)
    page.locator("#title-menu .gui-btn", has_text="NEW GAME").first.click()
    page.wait_for_selector("#dossier-screen:not(.hidden)", timeout=15000)
    page.click("#dossier-deploy")
    page.wait_for_selector("#dialogue-text", timeout=15000)
    pump_until(page, result, lambda p: has_choices(p))
    return read_hud(page)


def read_hud(page) -> dict:
    return {
        "clock": (page.locator("#clock-reading").text_content() or "").strip(),
        "knowledge": (page.locator("#knowledge-value").text_content() or "").strip(),
        "resources": (page.locator("#resources-value").text_content() or "").strip(),
    }


def has_choices(page) -> bool:
    return len(page.query_selector_all("#choices-area .gui-btn:not([disabled])")) > 0


def any_overlay(page) -> bool:
    return (
        page.locator("#document-overlay:not(.hidden)").count() > 0
        or page.locator("#comms-overlay:not(.hidden)").count() > 0
        or page.locator("#reward-overlay:not(.hidden)").count() > 0
    )


def pump_until(page, result: PhaseResult, stop_when, max_actions: int = MAX_ACTIONS) -> None:
    """Click policy over the real UI: documents and comms acknowledged,
    knowledge reward picked, first enabled choice taken, otherwise advance."""
    for _ in range(max_actions):
        if stop_when(page):
            return
        if page.locator("#ending-screen:not(.hidden)").count() > 0:
            raise RuntimeError("run reached an ending before the save point")
        if page.locator("#document-overlay:not(.hidden)").count() > 0:
            page.click("#document-footer .gui-btn")
            time.sleep(ACTION_MS / 1000)
            continue
        if page.locator("#comms-overlay:not(.hidden)").count() > 0:
            page.click("#comms-panel-body .gui-btn")
            time.sleep(ACTION_MS / 1000)
            continue
        if page.locator("#reward-overlay:not(.hidden)").count() > 0:
            page.locator(".wp-reward-cards .gui-card").nth(1).click()
            time.sleep(ACTION_MS / 1000)
            continue
        choices = page.query_selector_all("#choices-area .gui-btn:not([disabled])")
        if choices:
            choices[0].click()
            time.sleep(ACTION_MS / 1000)
            continue
        page.click("#bottom-bar")
        time.sleep(ACTION_MS / 1000)
    raise RuntimeError("pump never reached its stop condition")


def save_via_hud(page) -> None:
    """SAVE → SLOT 1 through the real controls. Slot 1 is empty in a fresh
    context, so the save proceeds without a confirm dialog."""
    page.click("#hud-save")
    page.wait_for_selector("#save-load-screen:not(.hidden)", timeout=5000)
    page.locator(".wp-slot-panel", has_text="SLOT 1").locator(".gui-btn").first.click()
    time.sleep(0.4)
    if not page.evaluate("localStorage.getItem('wp_save_0')"):
        raise RuntimeError("slot 1 save did not write")


def load_via_title(page) -> None:
    """reload → LOAD GAME → SLOT 1 → CONFIRM through the real controls."""
    page.reload(wait_until="networkidle")
    page.wait_for_selector("#title-screen:not(.hidden)", timeout=15000)
    page.locator("#title-menu .gui-btn", has_text="LOAD GAME").first.click()
    page.wait_for_selector("#save-load-screen:not(.hidden)", timeout=5000)
    page.locator(".wp-slot-panel", has_text="SLOT 1").locator(".gui-btn").first.click()
    page.wait_for_selector(".gui-modal.is-open", timeout=5000)
    page.locator(".gui-modal__footer .gui-btn", has_text="CONFIRM").first.click()


def assert_journey_restored(page, before: dict, phase: str) -> None:
    """The loaded journey shows the same presentation an unsaved run has:
    journey layout (not fullscreen), sidebar, clock, stats, route, SAVE."""
    container_class = page.locator("#game-container").get_attribute("class") or ""
    assert "fullscreen" not in container_class, f"{phase}: #game-container still fullscreen after load"
    assert page.locator("#sidebar").is_visible(), f"{phase}: #sidebar hidden after load"
    assert page.locator("#hud-save").is_visible(), f"{phase}: SAVE hidden after load"
    assert page.locator("#clock-panel").is_visible(), f"{phase}: clock panel hidden"
    assert page.locator("#stat-panel").is_visible(), f"{phase}: stat panel hidden"
    assert page.locator("#timeline-panel").is_visible(), f"{phase}: route panel hidden"
    assert page.locator("#timeline-body .wp-timeline__stop").count() > 0, f"{phase}: route empty"
    after = read_hud(page)
    assert after["clock"] == before["clock"], f"{phase}: clock {after['clock']} != saved {before['clock']}"
    assert after["knowledge"] == before["knowledge"], f"{phase}: knowledge {after['knowledge']} != saved {before['knowledge']}"
    assert after["resources"] == before["resources"], f"{phase}: resources {after['resources']} != saved {before['resources']}"


def assert_actionable_continuation(page, result: PhaseResult, phase: str) -> None:
    """Some renderable continuation with an actionable next step exists, and
    acting on it advances the run."""
    if phase == "comms":
        page.wait_for_selector("#comms-overlay:not(.hidden)", timeout=8000)
        page.locator("#comms-panel-body .gui-btn").first.click()
    else:
        try:
            page.wait_for_function(
                "() => document.querySelector('#dialogue-text') && (document.querySelector('#dialogue-text').textContent.trim().length > 0 || document.querySelectorAll('#choices-area .gui-btn:not([disabled])').length > 0)",
                timeout=8000,
            )
        except Exception as e:
            raise AssertionError(
                f"{phase}: no dialogue or choices rendered after load (blank screen?)"
            ) from e
    # Acting on the continuation produces further UI life (next line, next
    # scene, overlay, or choices).
    pump_until(
        page,
        result,
        lambda p: has_choices(p) or p.locator("#comms-overlay:not(.hidden)").count() > 0
        or p.locator("#reward-overlay:not(.hidden)").count() > 0,
        max_actions=400,
    )


def run_phase(browser, base: str, phase: str, viewport: dict | None = None, seed: int = SEED) -> PhaseResult:
    result = PhaseResult(phase)
    context, page = new_context(browser, result, base, viewport, seed)
    try:
        before = new_game_to_first_choice(base, page, result)

        if phase == "event-choice":
            pass  # already at the stop-1 choice point
        elif phase == "event-consequence":
            page.query_selector_all("#choices-area .gui-btn:not([disabled])")[0].click()
            time.sleep(ACTION_MS / 1000)
            # Post-choice, pre-reward: consequence dialogue on screen.
            assert not has_choices(page), "consequence save point shows choices"
            assert not any_overlay(page), "consequence save point shows an overlay"
        elif phase == "comms":
            pump_until(page, result, lambda p: p.locator("#comms-overlay:not(.hidden)").count() > 0)
        elif phase == "facility-entry":
            pump_until(
                page,
                result,
                lambda p: FACILITY_MARKER in (p.locator("#dialogue-text").text_content() or ""),
            )
        elif phase == "save-menu-policy":
            # A phase whose SAVE is disabled shows the action disabled, not
            # hidden, with a reason; an enabled SAVE still writes its slot.
            page.click("#hud-save")
            page.wait_for_selector("#save-load-screen:not(.hidden)", timeout=5000)
            auto_panel = page.locator(".wp-slot-panel", has_text="AUTOSAVE").first
            auto_btn = auto_panel.locator(".gui-btn").first
            assert auto_btn.is_visible(), "AUTOSAVE action hidden in save mode (must be disabled, not hidden)"
            assert auto_btn.is_disabled(), "AUTOSAVE action enabled in save mode (the silent no-op)"
            assert "automatically" in (auto_panel.locator(".wp-slot-meta").text_content() or ""), \
                "AUTOSAVE row carries no reason for the disabled action"
            slot2 = page.locator(".wp-slot-panel", has_text="SLOT 2").locator(".gui-btn").first
            assert slot2.is_enabled(), "an empty manual slot must offer SAVE"
            slot2.click()
            time.sleep(0.4)
            assert page.evaluate("localStorage.getItem('wp_save_1')"), "SLOT 2 save did not write"
            assert page.locator("#save-load-screen.hidden").count() > 0, "save screen stayed open after a successful save"
            result.ok = True
            return result
        elif phase == "load-refusal":
            # A slot referencing an active event absent from the build is
            # refused visibly; the slot survives and the title stays usable.
            save_via_hud(page)
            page.evaluate(
                """() => {
                    const slot = JSON.parse(localStorage.getItem('wp_save_0'));
                    slot.state.activeEventId = 'CE-99';
                    slot.state.currentScene = 'evt-ce99-situation';
                    localStorage.setItem('wp_save_0', JSON.stringify(slot));
                }"""
            )
            load_via_title(page)
            page.wait_for_selector(".gui-modal.is-open", timeout=5000)
            modal_text = page.locator(".gui-modal").text_content() or ""
            assert "LOAD FAILED" in modal_text, f"no visible refusal modal (got: {modal_text[:120]})"
            assert "CE-99" in modal_text, "refusal does not name the missing event"
            page.locator(".gui-modal__footer .gui-btn", has_text="OK").first.click()
            time.sleep(0.3)
            assert page.locator("#title-screen:not(.hidden)").count() > 0, "title not usable after refusal"
            page.locator("#title-menu .gui-btn", has_text="LOAD GAME").first.click()
            page.wait_for_selector("#save-load-screen:not(.hidden)", timeout=5000)
            assert page.evaluate("localStorage.getItem('wp_save_0')"), "refused slot was not preserved"
            result.ok = True
            return result
        elif phase == "legacy-comms-slot":
            # The pre-amendment comms save (review R1): stale event-scene id,
            # no resumePhase, no active event, mid-journey. It must resume
            # through the stop transition — never a blank screen.
            pump_until(page, result, lambda p: p.locator("#comms-overlay:not(.hidden)").count() > 0)
            save_via_hud(page)
            page.evaluate(
                """async () => {
                    const slot = JSON.parse(localStorage.getItem('wp_save_0'));
                    const data = await (await fetch('/data/events.json')).json();
                    const used = slot.state.usedEventIds;
                    const ev = data.events.find((e) => e.id === used[used.length - 1]);
                    slot.state.currentScene = ev.rewardScene;
                    slot.state.eventPhase = null;
                    if (slot.engine) slot.engine.resumePhase = null;
                    localStorage.setItem('wp_save_0', JSON.stringify(slot));
                }"""
            )
            before = read_hud(page)
            load_via_title(page)
            assert_journey_restored(page, before, phase)
            page.wait_for_selector("#comms-overlay:not(.hidden)", timeout=8000)
            page.locator("#comms-panel-body .gui-btn").first.click()
            pump_until(
                page,
                result,
                lambda p: has_choices(p) or p.locator("#comms-overlay:not(.hidden)").count() > 0
                or p.locator("#reward-overlay:not(.hidden)").count() > 0,
                max_actions=400,
            )
            result.ok = True
            return result
        elif phase == "document-scroll":
            # Two long documents in one run: scrolling the first, closing it,
            # and opening the second must still open at the top of
            # #document-body (the scrolling element). Real document bodies do
            # not overflow the panel at the harness viewport, so this phase
            # constrains the body's height — geometry is the fixture here;
            # the behavior under test is the scroll reset on the right
            # element when the second document opens.
            page.add_style_tag(content=".wp-document-body { max-height: 220px !important; }")
            docs_seen = 0
            for _ in range(MAX_ACTIONS):
                if page.locator("#document-overlay:not(.hidden)").count() > 0:
                    docs_seen += 1
                    if docs_seen == 1:
                        page.evaluate(
                            "() => { const b = document.getElementById('document-body'); b.scrollTop = 400; }"
                        )
                        top = page.evaluate("() => document.getElementById('document-body').scrollTop")
                        assert top > 0, f"first document could not scroll (scrollTop {top}) — fixture invalid"
                        page.click("#document-footer .gui-btn")
                        time.sleep(ACTION_MS / 1000)
                        continue
                    top = page.evaluate("() => document.getElementById('document-body').scrollTop")
                    assert top == 0, f"second long document opened scrolled (scrollTop {top})"
                    page.click("#document-footer .gui-btn")
                    result.ok = True
                    return result
                if page.locator("#ending-screen:not(.hidden)").count() > 0:
                    raise RuntimeError(f"run ended after {docs_seen} documents; need two")
                if page.locator("#comms-overlay:not(.hidden)").count() > 0:
                    page.click("#comms-panel-body .gui-btn")
                    time.sleep(ACTION_MS / 1000)
                    continue
                if page.locator("#reward-overlay:not(.hidden)").count() > 0:
                    page.locator(".wp-reward-cards .gui-card").nth(1).click()
                    time.sleep(ACTION_MS / 1000)
                    continue
                choices = page.query_selector_all("#choices-area .gui-btn:not([disabled])")
                if choices:
                    choices[0].click()
                    time.sleep(ACTION_MS / 1000)
                    continue
                page.click("#bottom-bar")
                time.sleep(ACTION_MS / 1000)
            raise RuntimeError("document-scroll never reached a second document")
        else:
            raise RuntimeError(f"unknown phase {phase}")

        before = read_hud(page)
        save_via_hud(page)
        load_via_title(page)
        assert_journey_restored(page, before, phase)
        assert_actionable_continuation(page, result, phase)
        result.ok = True
    except Exception as e:
        result.fail = str(e)
    finally:
        context.close()
    return result


def run_autosave_continue(browser, base: str) -> PhaseResult:
    """CONTINUE from the discovery-scene autosave after a reload: the same
    restore path through the other player entry point."""
    result = PhaseResult("autosave-continue")
    context, page = new_context(browser, result, base)
    try:
        before = new_game_to_first_choice(base, page, result)
        page.reload(wait_until="networkidle")
        page.wait_for_selector("#title-screen:not(.hidden)", timeout=15000)
        continue_btn = page.locator("#title-menu .gui-btn", has_text="CONTINUE").first
        assert continue_btn.is_enabled(), "CONTINUE disabled despite a valid autosave"
        continue_btn.click()
        assert_journey_restored(page, before, "autosave-continue")
        assert_actionable_continuation(page, result, "autosave-continue")
        result.ok = True
    except Exception as e:
        result.fail = str(e)
    finally:
        context.close()
    return result


def main() -> int:
    if not (REPO_ROOT / "dist" / "index.html").exists():
        print("no dist/ build found; run npm run build first")
        return 1

    port = free_port()
    base = f"http://127.0.0.1:{port}/"
    server = start_preview(port)
    phases: list[PhaseResult] = []
    try:
        with sync_playwright() as pw:
            browser = pw.chromium.launch(headless=True)
            # The comms panel (bottom-right, fixed) occludes the sidebar's
            # SAVE control at the 1440x900 harness viewport; at 2560x1440 —
            # the viewport the independent review used to reproduce R1 — the
            # control is reachable. The comms phases run there.
            for phase in ("event-choice", "event-consequence", "comms", "facility-entry"):
                viewport = {"width": 2560, "height": 1440} if phase == "comms" else None
                phases.append(run_phase(browser, base, phase, viewport))
            phases.append(run_phase(browser, base, "save-menu-policy"))
            phases.append(run_phase(browser, base, "load-refusal"))
            phases.append(
                run_phase(browser, base, "legacy-comms-slot", viewport={"width": 2560, "height": 1440})
            )
            # 20260916 knowledge reads two found documents in one run.
            phases.append(run_phase(browser, base, "document-scroll", seed=20260916))
            phases.append(run_autosave_continue(browser, base))
            browser.close()
    finally:
        server.terminate()
        try:
            server.wait(timeout=5)
        except subprocess.TimeoutExpired:
            server.kill()

    print("Browser resume check (production build, real controls)")
    print("=" * 76)
    failed = 0
    for r in phases:
        status = "PASS" if r.ok else "FAIL"
        if not r.ok:
            failed += 1
        print(f"  [{status}] {r.phase}" + (f": {r.fail}" if r.fail else ""))
        for e in r.console_errors[:4]:
            print(f"         {e}")
    print("=" * 76)
    print(f"{len(phases) - failed}/{len(phases)} phases passed")

    out = Path("/tmp/kilo/resume-check-results.json")
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(
        json.dumps(
            [
                {
                    "phase": r.phase,
                    "ok": r.ok,
                    "fail": r.fail,
                    "console_errors": r.console_errors,
                    "failed_requests": r.failed_requests,
                }
                for r in phases
            ],
            indent=2,
        )
    )
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())
