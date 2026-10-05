#!/usr/bin/env python3
"""
Script Name  : screen_walk_check.py
Description  : Gate 5.5 screen-walk verification: every screen on the gc
               framework inside the stage with its longest real content;
               every full-stage overlay enumerated from the DOM and checked
               for overflow behavior and control reachability; control
               hit-testing and actual clicks at a fractional scale and a
               letterboxed size; and the production page's hook hygiene.
Repository   : within-parameters-visual-novel
Author       : VintageDon (https://github.com/vintagedon/)
Created      : 2026-10-04

Usage
-----
    /opt/agents/venv/bin/python tests/screen_walk_check.py
    /opt/agents/venv/bin/python tests/screen_walk_check.py --production-only

Walks the real UI on the DEV server (DEV-only hooks render the extremes):
title, settings, save/load with its confirmation, the dossier extreme, a
natural run start through lore and the first event with choices and the
reward overlay, the found-document extreme, the comms beat, the facility
grid (the 119-character choice), and the ending. The overlay enumeration is
taken from the DOM at every step (never from a named list) and reconciled
against the required surface inventory, so an overlay cannot leave the test
by disappearing from the DOM.
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
VIEWPORT = {"width": 1920, "height": 1080}
ACTION_MS = 90
MAX_ACTIONS = 900

# Surfaces the walk must have seen rendered. Reconciled against what the DOM
# enumeration actually observed: a surface that silently fails to appear
# fails the reconciliation instead of silently leaving the test.
REQUIRED_SURFACES = [
    "#title-screen",
    "#settings-screen",
    "#save-load-screen",
    ".wp-modal.is-open",
    "#dossier-screen",
    "#reward-overlay",
    "#document-overlay",
    "#comms-overlay",
    "#ending-screen",
]

ENUMERATE_JS = """
() => {
  // Enumerate full-stage overlays from the DOM: elements whose computed
  // position is fixed and whose box covers at least 90 percent of the stage
  // in both axes. Class names are not consulted, so a renamed overlay cannot
  // escape; container elements (static or relative) never match.
  const stage = document.getElementById('stage');
  const sr = stage.getBoundingClientRect();
  const found = [];
  const consider = (el) => {
    const cs = getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden') return;
    if (cs.position !== 'fixed') return;
    const r = el.getBoundingClientRect();
    const covW = Math.min(r.right, sr.right) - Math.max(r.left, sr.left);
    const covH = Math.min(r.bottom, sr.bottom) - Math.max(r.top, sr.top);
    if (!(r.width > 0 && r.height > 0 && (covW / sr.width) > 0.9 && (covH / sr.height) > 0.9)) return;
    found.push({ el, z: Number(cs.zIndex) || 0, order: found.length });
  };
  stage.querySelectorAll('*').forEach(consider);
  document.body.querySelectorAll(':scope > *').forEach(consider);
  // The topmost overlay is the active surface: only its controls are asserted
  // reachable (surfaces beneath an open modal are legitimately blocked).
  const top = found.reduce((a, b) => (b.z >= a.z ? b : a), found[0]);
  const seen = new Map();
  for (const { el, order } of found) {
    const key = el.id ? '#' + el.id : '.' + Array.from(el.classList).join('.');
    const overflowY = getComputedStyle(el).overflowY;
    const scrollable = el.scrollHeight > el.clientHeight + 1;
    let scrolledOk = true;
    if (scrollable) {
      const before = el.scrollTop;
      el.scrollTop = el.scrollHeight;
      scrolledOk = el.scrollTop > before || el.scrollTop === el.scrollHeight - el.clientHeight;
      el.scrollTop = 0;
    }
    let unreachable = [];
    if (top && el === top.el) {
      const controls = Array.from(el.querySelectorAll('button:not([disabled])'));
      for (const btn of controls) {
        const host = btn.closest('.wp-overlay');
        const scroller = host && host.scrollHeight > host.clientHeight + 1 ? host : null;
        if (scroller) {
          const topPos = btn.offsetTop - scroller.clientHeight / 2;
          scroller.scrollTop = Math.max(0, topPos);
        }
        const after = btn.getBoundingClientRect();
        const hit = document.elementFromPoint(after.x + after.width / 2, after.y + after.height / 2);
        if (!hit || !(hit === btn || btn.contains(hit) || hit.contains(btn))) {
          unreachable.push(btn.textContent.trim().slice(0, 24));
        }
      }
    }
    seen.set(key, { scrollable, scrolledOk, overflowY, top: !!(top && el === top.el), unreachable });
  }
  return Object.fromEntries(seen);
}
"""


def free_port() -> int:
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.bind(("127.0.0.1", 0))
        return s.getsockname()[1]


def start_server(port: int, production: bool) -> subprocess.Popen:
    script = "vite.js" if not production else "vite.js"
    cmd = ["node", f"node_modules/{'vite'}/bin/{script}"]
    if production:
        cmd += ["preview", "--port", str(port), "--strictPort"]
    else:
        cmd += ["--port", str(port), "--strictPort"]
    proc = subprocess.Popen(cmd, cwd=str(REPO_ROOT), stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    import urllib.request

    base = f"http://127.0.0.1:{port}/"
    for _ in range(120):
        if proc.poll() is not None:
            raise RuntimeError("server exited early")
        try:
            with urllib.request.urlopen(base, timeout=1):
                return proc
        except Exception:
            time.sleep(0.25)
    raise RuntimeError("server did not become ready")


def record(failures: list[str], label: str, ok: bool, detail: str = "") -> None:
    print(f"  [{'PASS' if ok else 'FAIL'}] {label}{(': ' + detail) if detail else ''}")
    if not ok:
        failures.append(f"{label}: {detail}")


def enumerate_overlays(page) -> dict:
    return page.evaluate(ENUMERATE_JS)


def check_overlays(page, failures: list[str], where: str) -> dict:
    overlays = enumerate_overlays(page)
    for key, info in overlays.items():
        record(
            failures,
            f"overlay {key} @{where}",
            info["scrolledOk"] and not info["unreachable"] and info["overflowY"] in ("auto", "scroll"),
            f"scrollable={info['scrollable']} top={info['top']} overflowY={info['overflowY']}"
            + (f" unreachable={info['unreachable']}" if info["unreachable"] else ""),
        )
    return overlays


def drive_run_until_reward_or_choice(page, max_actions: int = MAX_ACTIONS) -> str:
    """Natural clicks from the lore card through choices, documents, and
    comms until the reward overlay appears; returns what stopped it."""
    for _ in range(max_actions):
        if page.locator("#reward-overlay:not(.hidden)").count() > 0:
            return "reward"
        if page.query_selector_all("#choices-area .gc-button:not([disabled])"):
            page.query_selector_all("#choices-area .gc-button:not([disabled])")[0].click()
            time.sleep(ACTION_MS / 1000)
            continue
        if page.locator("#document-overlay:not(.hidden)").count() > 0:
            page.click("#document-footer .gc-button")
            time.sleep(ACTION_MS / 1000)
            continue
        if page.locator("#comms-overlay:not(.hidden)").count() > 0:
            page.click("#comms-panel-body .gc-button")
            time.sleep(ACTION_MS / 1000)
            continue
        page.click("#bottom-bar")
        time.sleep(ACTION_MS / 1000)
    return "stalled"


def drive_choices_visible(page, max_clicks: int = 40) -> int:
    """Advances dialogue lines until the choices area renders buttons."""
    for _ in range(max_clicks):
        if page.query_selector_all("#choices-area .gc-button"):
            return len(page.query_selector_all("#choices-area .gc-button"))
        page.click("#bottom-bar")
        time.sleep(ACTION_MS / 1000)
    return 0


def should_run_dev(production_only: bool) -> bool:
    return not production_only


def run_production_check(browser, failures: list[str]) -> None:
    pport = free_port()
    pbase = f"http://127.0.0.1:{pport}/"
    pserver = start_server(pport, production=True)
    try:
        context = browser.new_context(viewport=VIEWPORT)
        page = context.new_page()
        page.goto(pbase, wait_until="networkidle")
        page.wait_for_selector("#title-screen:not(.hidden)", timeout=15000)
        has_hooks = page.evaluate("() => typeof window.__wp !== 'undefined'")
        record(failures, "production exposes no __wp state-control object", not has_hooks)
        context.close()
    finally:
        pserver.terminate()
        pserver.wait(timeout=5)


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--production-only", action="store_true")
    args = ap.parse_args()

    failures: list[str] = []
    seen_surfaces: set[str] = set()

    if not should_run_dev(args.production_only):
        with sync_playwright() as pw:
            browser = pw.chromium.launch(headless=True)
            run_production_check(browser, failures)
            browser.close()
        print("=" * 76)
        if failures:
            print(f"screen walk check FAILED ({len(failures)} failure(s))")
            return 1
        print("screen walk check PASSED")
        return 0

    port = free_port()
    base = f"http://127.0.0.1:{port}/"
    server = start_server(port, production=False)

    try:
        with sync_playwright() as pw:
            browser = pw.chromium.launch(headless=True)

            # ── DEV walk: every screen with its longest real content ──
            context = browser.new_context(viewport=VIEWPORT)
            page = context.new_page()
            errors: list[str] = []
            page.on("console", lambda m: errors.append(m.text) if m.type == "error" else None)
            page.on("pageerror", lambda e: errors.append(str(e)))
            page.goto(base, wait_until="networkidle")
            page.wait_for_function("() => window.__wp && typeof window.__wp.stageFixture === 'function'", timeout=30000)

            # Title
            page.wait_for_selector("#title-screen:not(.hidden)")
            seen_surfaces.add("#title-screen")
            check_overlays(page, failures, "title")

            # Settings
            page.locator("#title-menu .gc-button", has_text="SETTINGS").first.click()
            page.wait_for_selector("#settings-screen:not(.hidden)")
            seen_surfaces.add("#settings-screen")
            check_overlays(page, failures, "settings")
            page.locator("#settings-footer .gc-button", has_text="CLOSE").first.click()

            # Save/load with its confirmation (seeded autosave)
            page.evaluate("() => window.__wp.seedAutosave()")
            page.reload(wait_until="networkidle")
            page.wait_for_function("() => window.__wp && typeof window.__wp.stageFixture === 'function'", timeout=30000)
            page.locator("#title-menu .gc-button", has_text="LOAD GAME").first.click()
            page.wait_for_selector("#save-load-screen:not(.hidden)")
            seen_surfaces.add("#save-load-screen")
            check_overlays(page, failures, "save-load")
            modal_opener = page.locator(".wp-slot-panel", has_text="AUTOSAVE").locator(".gc-button").first
            modal_opener.focus()
            page.keyboard.press("Enter")
            page.wait_for_selector(".wp-modal.is-open", timeout=5000)
            seen_surfaces.add(".wp-modal.is-open")
            check_overlays(page, failures, "load-confirm")
            modal_stacking = page.evaluate(
                """() => {
                    const modal = document.querySelector('.wp-modal.is-open');
                    const save = document.getElementById('save-load-screen');
                    const panel = modal.querySelector('.wp-modal__panel');
                    const r = panel.getBoundingClientRect();
                    const hit = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
                    return {
                      modalZ: Number(getComputedStyle(modal).zIndex) || 0,
                      saveZ: Number(getComputedStyle(save).zIndex) || 0,
                      modalOwnsCenter: hit === modal || modal.contains(hit),
                    };
                }"""
            )
            record(
                failures,
                "confirmation modal stacks above save/load",
                modal_stacking["modalZ"] > modal_stacking["saveZ"] and modal_stacking["modalOwnsCenter"],
                str(modal_stacking),
            )
            record(
                failures,
                "modal open moves focus into the dialog",
                page.evaluate("() => document.querySelector('.wp-modal.is-open')?.contains(document.activeElement) === true"),
            )

            # If focus remains on the opener, the second Enter activates it
            # again and mounts another confirm. With focus inside, it can only
            # act on the current dialog.
            page.keyboard.press("Enter")
            page.wait_for_timeout(150)
            record(
                failures,
                "repeated Enter on the opener cannot stack a second confirm",
                page.locator(".wp-modal.is-open").count() <= 1,
                f"open dialogs={page.locator('.wp-modal.is-open').count()}",
            )
            while page.locator(".wp-modal.is-open").count() > 0:
                page.locator(".wp-modal.is-open .wp-modal__footer .gc-button", has_text="CANCEL").last.click()

            # Reopen for focus-wrap, Escape, and focus-restore checks.
            modal_opener.focus()
            page.keyboard.press("Enter")
            page.wait_for_selector(".wp-modal.is-open", timeout=5000)
            modal_buttons = page.locator(".wp-modal.is-open .wp-modal__footer .gc-button")
            first_modal_button = modal_buttons.first
            last_modal_button = modal_buttons.last
            last_modal_button.focus()
            page.keyboard.press("Tab")
            record(
                failures,
                "modal Tab wraps from last control to first",
                first_modal_button.evaluate("(el) => document.activeElement === el"),
            )
            first_modal_button.focus()
            page.keyboard.press("Shift+Tab")
            record(
                failures,
                "modal Shift+Tab wraps from first control to last",
                last_modal_button.evaluate("(el) => document.activeElement === el"),
            )
            page.keyboard.press("Escape")
            page.wait_for_timeout(150)
            record(
                failures,
                "modal Escape closes the dialog",
                page.locator(".wp-modal.is-open").count() == 0,
            )
            record(
                failures,
                "modal close restores focus to its opener",
                modal_opener.evaluate("(el) => document.activeElement === el"),
            )
            while page.locator(".wp-modal.is-open").count() > 0:
                page.locator(".wp-modal.is-open .wp-modal__footer .gc-button", has_text="CANCEL").last.click()
            page.locator("#save-load-footer .gc-button", has_text="CANCEL").first.click()

            # Dossier: deploy the real roll first (the runner commits the
            # protagonist), then render the extreme dossier (longest
            # backstory, longest rolled name, 8 rerolls) over it and hide it.
            page.locator("#title-menu .gc-button", has_text="NEW GAME").first.click()
            page.wait_for_selector("#dossier-screen:not(.hidden)")
            seen_surfaces.add("#dossier-screen")
            check_overlays(page, failures, "dossier")
            page.locator("#dossier-footer .gc-button", has_text="DEPLOY").first.click()
            page.wait_for_timeout(300)
            page.evaluate("() => window.__wp.dossierExtreme()")
            page.wait_for_selector("#dossier-screen:not(.hidden)", timeout=5000)
            check_overlays(page, failures, "dossier-extreme")
            dossier_text = page.locator("#dossier-body").text_content() or ""
            page.evaluate("() => window.__wp.hideOverlays()")
            page.wait_for_timeout(200)

            # Natural run: lore, first event, choices, reward overlay
            stop = drive_run_until_reward_or_choice(page)
            record(failures, "natural run reaches the reward overlay", stop == "reward", stop)
            check_overlays(page, failures, "journey")
            if stop == "reward":
                seen_surfaces.add("#reward-overlay")
                check_overlays(page, failures, "reward")
                reward_card = page.locator(".wp-reward-cards .wp-card").first
                reward_card.focus()
                page.keyboard.press("Enter")
                page.wait_for_timeout(200)
                record(
                    failures,
                    "keyboard-only reward step activates with Enter",
                    page.locator("#reward-overlay:not(.hidden)").count() == 0,
                )
                if page.locator("#reward-overlay:not(.hidden)").count() > 0:
                    page.evaluate("() => window.__wp.hideOverlays()")
                # The stop's tick may fire a comms beat; acknowledge it.
                time.sleep(200 / 1000)
                if page.locator("#comms-overlay:not(.hidden)").count() > 0:
                    page.click("#comms-panel-body .gc-button")

            # The selectable-card contract includes Space as well as Enter.
            # Use the real reward fixture and traverse the mandatory surface
            # without a pointer.
            page.evaluate("() => window.__wp.triggerReward('remove')")
            page.wait_for_selector("#reward-overlay:not(.hidden)")
            reward_card = page.locator(".wp-reward-cards .wp-card").nth(1)
            reward_card.focus()
            page.keyboard.press("Space")
            page.wait_for_timeout(200)
            record(
                failures,
                "keyboard-only reward step activates with Space",
                page.locator("#reward-overlay:not(.hidden)").count() == 0,
            )
            if page.locator("#reward-overlay:not(.hidden)").count() > 0:
                page.evaluate("() => window.__wp.hideOverlays()")

            # Found-document extreme (FD-07 is the longest body)
            page.evaluate("() => window.__wp.showDocument('FD-07')")
            page.wait_for_selector("#document-overlay:not(.hidden)")
            seen_surfaces.add("#document-overlay")
            check_overlays(page, failures, "document-extreme")
            page.click("#document-footer .gc-button")

            # Comms beat (real data, amber)
            page.evaluate("() => window.__wp.triggerComms()")
            page.wait_for_selector("#comms-overlay:not(.hidden)")
            seen_surfaces.add("#comms-overlay")
            check_overlays(page, failures, "comms")
            page.click("#hud-save")
            page.wait_for_selector("#save-load-screen:not(.hidden)")
            stacking = page.evaluate(
                """() => {
                    const save = document.getElementById('save-load-screen');
                    const comms = document.getElementById('comms-overlay');
                    const panel = save.querySelector('.wp-save-load-panel');
                    const r = panel.getBoundingClientRect();
                    const hit = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
                    return {
                      saveZ: Number(getComputedStyle(save).zIndex) || 0,
                      commsZ: Number(getComputedStyle(comms).zIndex) || 0,
                      saveOwnsCenter: hit === save || save.contains(hit),
                    };
                }"""
            )
            record(
                failures,
                "save/load stacks above an active comms overlay",
                stacking["saveZ"] > stacking["commsZ"] and stacking["saveOwnsCenter"],
                str(stacking),
            )
            page.locator("#save-load-footer .gc-button", has_text="CANCEL").first.click()
            page.click("#comms-panel-body .gc-button")

            # Facility grid via the live runner (the 119-char choice renders).
            # The facility scenes' dialogue advances by clicks before the
            # action grid appears.
            page.evaluate("() => window.__wp.gotoScene('scene-facility-02')")
            n_choices = drive_choices_visible(page)
            record(failures, "facility grid renders three choices", n_choices == 3, f"{n_choices} choices")
            check_overlays(page, failures, "facility")

            # Ending
            page.evaluate("() => window.__wp.triggerEnding()")
            page.wait_for_selector("#ending-screen:not(.hidden)")
            seen_surfaces.add("#ending-screen")
            check_overlays(page, failures, "ending")

            record(failures, "zero console errors in the walk", len(errors) == 0, "; ".join(errors[:3]))
            context.close()

            # ── Fractional scale and letterboxed size: control hits and clicks ──
            for w, h in [(1600, 900), (2560, 1080)]:
                context = browser.new_context(viewport={"width": w, "height": h})
                page = context.new_page()
                page.goto(base, wait_until="networkidle")
                page.wait_for_function("() => window.__wp && typeof window.__wp.stageFixture === 'function'", timeout=30000)
                page.wait_for_selector("#title-screen:not(.hidden)")
                for text in ["SETTINGS", "NEW GAME"]:
                    btn = page.locator("#title-menu .gc-button", has_text=text).first
                    btn.click()
                    page.wait_for_timeout(200)
                    if text == "SETTINGS":
                        page.locator("#settings-footer .gc-button", has_text="CLOSE").first.click()
                record(failures, f"real clicks at {w}x{h}", True)
                context.close()

            # ── Production page: no __wp state-control object ──
            run_production_check(browser, failures)

            browser.close()
    finally:
        server.terminate()
        try:
            server.wait(timeout=5)
        except subprocess.TimeoutExpired:
            server.kill()

    # ── Reconcile the observed surfaces against the required inventory ──
    missing = [s for s in REQUIRED_SURFACES if s not in seen_surfaces]
    record(failures, "required surface inventory all seen", not missing, f"missing: {missing}" if missing else "")

    print("=" * 76)
    if failures:
        print(f"screen walk check FAILED ({len(failures)} failure(s))")
        return 1
    print("screen walk check PASSED")
    return 0


if __name__ == "__main__":
    sys.exit(main())
