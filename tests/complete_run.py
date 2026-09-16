#!/usr/bin/env python3
"""
Script Name  : complete_run.py
Description  : Gate 4.8 complete-run verification — drives full natural runs
               (NEW GAME to scored ending) against the production build with
               no development hooks, no injected endings, and no forced
               state. Seeds are recorded so every run reproduces.
Repository   : within-parameters-visual-novel
Author       : VintageDon (https://github.com/vintagedon/)
Created      : 2026-09-16

Usage
-----
    /opt/agents/venv/bin/python tests/complete_run.py

Requires a fresh build (npm run build). Starts `vite preview` (the
production bundle; import.meta.env.DEV is false, so the __wp dev hooks do
not exist). Coverage across the set: all three endings, at least one
reroll, at least one found-document read, at least one comms beat at each
clock tier, and one mid-run save-and-resume pair. Verifies zero uncaught
console errors, zero failed same-origin asset requests by HTTP status, and
no "No eligible events" at any stop. Writes nothing into tests/baseline/
(verified by hashing the directory before and after).

Strategies are click policies over the real UI:
  knowledge   — pick the knowledge reward card; first enabled choice
  consumable  — pick the consumable reward card; first enabled choice
  clockburn   — pick the knowledge reward card (never clock reduction);
                last enabled choice (the clock-leaning C options)
"""

from __future__ import annotations

import hashlib
import json
import os
import socket
import subprocess
import sys
import time
from pathlib import Path
from urllib.parse import urlparse

from playwright.sync_api import sync_playwright, BrowserContext

REPO_ROOT = Path(__file__).resolve().parent.parent
BASELINE_DIR = Path(__file__).resolve().parent / "baseline"
VIEWPORT = {"width": 1440, "height": 900}
ACTION_MS = 90
MAX_ACTIONS = 6000

TIER_MARKERS = {
    "green": ["status check. Finding anything?", "dispatch logged two more relay faults"],
    "amber": ["cascade alerts across three stations", "Station 14 just went to emergency rationing"],
    "red": ["Three more stations dark", "People are scared"],
}

ENDING_BY_LABEL = {
    "ENDING I — CLOCK FAILURE": "clock-failure",
    "ENDING II — DESTRUCTION": "destruction",
    "ENDING III — CORRECTION": "correction",
}


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


def dir_hash(path: Path) -> str:
    h = hashlib.sha256()
    for f in sorted(p for p in path.rglob("*") if p.is_file()):
        h.update(f.name.encode())
        h.update(f.read_bytes())
    return h.hexdigest()


class RunResult:
    def __init__(self, seed: int, strategy: str):
        self.seed = seed
        self.strategy = strategy
        self.ending: str | None = None
        self.score: int | None = None
        self.grade: str | None = None
        self.actions = 0
        self.docs_read = 0
        self.comms_tiers: list[str] = []
        self.errors: list[str] = []
        self.failed_requests: list[str] = []
        self.no_eligible_events = False
        self.dialogue_chars = 0
        self.rerolled = False
        self.resumed = False
        self.completed = False


def classify_tier(text: str) -> str | None:
    for tier, markers in TIER_MARKERS.items():
        if any(m in text for m in markers):
            return tier
    return None


def play_run(
    browser,
    base: str,
    origin: str,
    seed: int,
    strategy: str,
    rerolls: int = 0,
    resume_state: dict | None = None,
) -> RunResult:
    """Drives one natural run. resume_state carries a saved slot to load
    instead of a fresh start (the save/resume run)."""
    result = RunResult(seed, strategy)
    context: BrowserContext = browser.new_context(viewport=VIEWPORT)
    page = context.new_page()
    page.add_init_script(f"window.__wpSeed = {seed};")
    page.on(
        "response",
        lambda r: result.failed_requests.append(f"{r.status} {r.url}")
        if urlparse(r.url).netloc == origin
        and r.status >= 400
        and r.url.split(base, 1)[-1].startswith(("assets/", "data/"))
        else None,
    )
    page.on("console", lambda m: _on_console(m, result))
    page.on("pageerror", lambda e: result.errors.append(f"pageerror: {e}"))

    try:
        if resume_state is not None:
            # Seed storage with the saved slot, then load it from the title.
            page.goto(base, wait_until="networkidle")
            page.evaluate(
                "(slot) => localStorage.setItem(slot.key, JSON.stringify(slot.value))",
                resume_state,
            )
            page.reload(wait_until="networkidle")
            page.wait_for_selector("#title-screen:not(.hidden)", timeout=15000)
            page.locator("#title-menu .gui-btn", has_text="LOAD GAME").first.click()
            page.wait_for_selector("#save-load-screen:not(.hidden)", timeout=5000)
            page.locator(".wp-slot-panel", has_text="SLOT 1").locator(".gui-btn").first.click()
            # The load confirm is a danger modal and always appears.
            page.wait_for_selector(".gui-modal.is-open", timeout=5000)
            page.locator(".gui-modal__footer .gui-btn", has_text="CONFIRM").first.click()
            page.wait_for_selector("#dialogue-text", timeout=15000)
            result.resumed = True
        else:
            page.goto(base, wait_until="networkidle")
            page.wait_for_selector("#title-screen:not(.hidden)", timeout=15000)
            page.locator("#title-menu .gui-btn", has_text="NEW GAME").first.click()
            page.wait_for_selector("#dossier-screen:not(.hidden)", timeout=15000)
            # The red-tier hunt rerolls until the dossier shows Exhausted
            # (jitter 0.6): the red beat B needs an unusually fast clock, and
            # Exhausted is the natural way a run gets there.
            want_trait = "Exhausted" if strategy == "redhunt" else None
            rolls = rerolls
            if want_trait:
                for _ in range(8):
                    body = page.locator("#dossier-body").text_content() or ""
                    if want_trait in body:
                        break
                    page.click("#dossier-reroll")
                    rolls += 1
                    result.rerolled = True
                    page.wait_for_timeout(350)
            for _ in range(rolls if not want_trait else 0):
                page.click("#dossier-reroll")
                page.wait_for_timeout(350)
                result.rerolled = True
            page.click("#dossier-deploy")
            page.wait_for_selector("#dialogue-text", timeout=15000)

        reward_pick = {"knowledge": 1, "consumable": 0, "clockburn": 1, "correction": 1, "redhunt": 1}[strategy]
        choice_pick_last = strategy in ("clockburn", "redhunt")

        for _ in range(MAX_ACTIONS):
            if page.locator("#ending-screen:not(.hidden)").count() > 0:
                label = page.locator("#ending-type-label").text_content().strip()
                result.ending = ENDING_BY_LABEL.get(label, label)
                result.score = int(page.locator("#ending-score .wp-score-final-num").text_content().strip())
                result.grade = page.locator("#ending-score .wp-score-grade").first.text_content().strip()
                result.completed = True
                break

            # Correction strategy: keep the kit above the fix cost.
            if strategy == "correction" and page.locator("#reward-overlay:not(.hidden)").count() > 0:
                resources = int((page.locator("#resources-value").text_content() or "0").strip() or "0")
                pick = 0 if resources <= 2 else 1
                page.locator(".wp-reward-cards .gui-card").nth(pick).click()
                time.sleep(ACTION_MS / 1000)
                continue

            if page.locator("#document-overlay:not(.hidden)").count() > 0:
                result.dialogue_chars += len(page.locator("#document-body").text_content() or "")
                result.docs_read += 1
                page.click("#document-footer .gui-btn")
                time.sleep(ACTION_MS / 1000)
                continue

            if page.locator("#comms-overlay:not(.hidden)").count() > 0:
                text = page.locator("#comms-panel-body").text_content() or ""
                result.dialogue_chars += len(text)
                tier = classify_tier(text)
                if tier and tier not in result.comms_tiers:
                    result.comms_tiers.append(tier)
                page.click("#comms-panel-body .gui-btn")
                time.sleep(ACTION_MS / 1000)
                continue

            if page.locator("#reward-overlay:not(.hidden)").count() > 0:
                cards = page.locator(".wp-reward-cards .gui-card")
                cards.nth(reward_pick).click()
                time.sleep(ACTION_MS / 1000)
                continue

            choices = page.query_selector_all("#choices-area .gui-btn:not([disabled])")
            if choices:
                result.dialogue_chars += len(
                    page.locator("#dialogue-text").text_content() or ""
                )
                btn = choices[-1] if choice_pick_last else choices[0]
                if strategy == "correction":
                    # Prefer knowledge-gated choices (the rich ones show their
                    # gate once met), mirroring the validated agent's priority.
                    gated = [c for c in choices if "[Knowledge" in c.text_content()]
                    btn = gated[0] if gated else choices[0]
                btn.click()
                time.sleep(ACTION_MS / 1000)
                continue

            page.click("#bottom-bar")
            time.sleep(ACTION_MS / 1000)
            result.actions += 1
    finally:
        context.close()
    return result


def _on_console(msg, result: RunResult) -> None:
    if msg.type != "error":
        return
    result.errors.append(f"console.error: {msg.text}")
    if "No eligible events" in msg.text:
        result.no_eligible_events = True


def save_mid_run_slot(browser, base: str, origin: str, seed: int) -> dict:
    """Plays a run to just past the second reward, saves to slot 1 via the
    HUD SAVE action, and returns the localStorage slot for a later resume
    (simulating the full page reload by re-seeding storage in a fresh
    context)."""
    context: BrowserContext = browser.new_context(viewport=VIEWPORT)
    page = context.new_page()
    page.add_init_script(f"window.__wpSeed = {seed};")
    page.goto(base, wait_until="networkidle")
    page.wait_for_selector("#title-screen:not(.hidden)", timeout=15000)
    page.locator("#title-menu .gui-btn", has_text="NEW GAME").first.click()
    page.wait_for_selector("#dossier-screen:not(.hidden)", timeout=15000)
    page.click("#dossier-deploy")
    page.wait_for_selector("#dialogue-text", timeout=15000)

    rewards_seen = 0
    for _ in range(MAX_ACTIONS):
        if rewards_seen >= 2:
            # Save via the HUD player action. Slot 1 is empty in a fresh
            # context, so the slot save proceeds without a confirm dialog.
            page.click("#hud-save")
            page.wait_for_selector("#save-load-screen:not(.hidden)", timeout=5000)
            page.locator(".wp-slot-panel", has_text="SLOT 1").locator(".gui-btn").first.click()
            page.wait_for_timeout(400)
            slot_raw = page.evaluate("localStorage.getItem('wp_save_0')")
            if not slot_raw:
                raise RuntimeError("slot 1 save failed")
            page.close()
            context.close()
            return {"key": "wp_save_0", "value": json.loads(slot_raw)}

        if page.locator("#document-overlay:not(.hidden)").count() > 0:
            page.click("#document-footer .gui-btn")
            time.sleep(ACTION_MS / 1000)
            continue
        if page.locator("#comms-overlay:not(.hidden)").count() > 0:
            page.click("#comms-panel-body .gui-btn")
            time.sleep(ACTION_MS / 1000)
            continue
        if page.locator("#reward-overlay:not(.hidden)").count() > 0:
            rewards_seen += 1
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

    raise RuntimeError("never reached the save point")


def main() -> int:
    if not (REPO_ROOT / "dist" / "index.html").exists():
        print("no dist/ build found; run npm run build first")
        return 1

    baseline_before = dir_hash(BASELINE_DIR)
    port = free_port()
    base = f"http://127.0.0.1:{port}/"
    origin = f"127.0.0.1:{port}"
    server = start_preview(port)

    runs: list[RunResult] = []
    save_seed = 555555

    try:
        with sync_playwright() as pw:
            browser = pw.chromium.launch(headless=True)

            # Save/resume pair: uninterrupted twin first (clean storage),
            # then the mid-run save, then the resume in a fresh context.
            twin = play_run(browser, base, origin, save_seed, "knowledge")
            runs.append(twin)
            slot = save_mid_run_slot(browser, base, origin, save_seed)
            resumed = play_run(browser, base, origin, save_seed, "knowledge", resume_state=slot)
            runs.append(resumed)

            # Coverage pool: alternate strategies over recorded seeds until
            # the set covers all three endings and all three comms tiers.
            plan = [
                (20260916, "knowledge"),
                (20260916, "consumable"),
                (7, "clockburn"),
                (11, "knowledge", 1),        # reroll coverage
                (42, "consumable"),
                (99, "clockburn"),
                (31337, "knowledge"),
                (2027, "consumable"),
                (12345, "clockburn"),
                (777, "knowledge"),
                (8888, "consumable"),
                (90210, "clockburn"),
                (60606, "knowledge"),
                (40404, "consumable"),
            ]
            for item in plan:
                seed, strategy = item[0], item[1]
                rerolls = item[2] if len(item) > 2 else 0
                endings = {r.ending for r in runs if r.completed}
                if {"clock-failure", "destruction", "correction"} <= endings and len(runs) >= 12:
                    break
                runs.append(play_run(browser, base, origin, seed, strategy, rerolls))

            # Targeted coverage loops (still natural runs; strategies are
            # click policies over the real UI).
            correction_seeds = [501, 502, 503, 504, 505, 506, 507, 508, 509, 510,
                                511, 512, 513, 514, 515, 516]
            for seed in correction_seeds:
                if any(r.ending == "correction" for r in runs if r.completed):
                    break
                runs.append(play_run(browser, base, origin, seed, "correction"))

            red_seeds = [601, 602, 603, 604, 605, 606, 607, 608, 609, 610,
                         611, 612, 613, 614, 615, 616]
            for seed in red_seeds:
                if {"red"} <= {t for r in runs for t in r.comms_tiers}:
                    break
                runs.append(play_run(browser, base, origin, seed, "redhunt"))

            browser.close()
    finally:
        server.terminate()
        try:
            server.wait(timeout=5)
        except subprocess.TimeoutExpired:
            server.kill()

    baseline_after = dir_hash(BASELINE_DIR)

    # ─── Report ────────────────────────────────────────────────────────────
    print("Complete-run verification (production build, no dev hooks)")
    print("=" * 76)
    for r in runs:
        print(
            f"  seed {r.seed:<8} {r.strategy:<10} "
            f"{'RESUMED ' if r.resumed else ''}{'REROLL ' if r.rerolled else ''}"
            f"-> {r.ending or 'INCOMPLETE'} {r.score if r.score is not None else '-'}{r.grade or ''} "
            f"(docs {r.docs_read}, comms {','.join(r.comms_tiers) or '-'}, "
            f"chars {r.dialogue_chars}, errors {len(r.errors)}, failed-req {len(r.failed_requests)})"
        )
    print("=" * 76)

    completed = [r for r in runs if r.completed]
    endings = {r.ending for r in completed}
    all_errors = [e for r in runs for e in r.errors]
    all_failed = [f for r in runs for f in r.failed_requests]
    no_eligible = any(r.no_eligible_events for r in runs)
    comms_tiers = {t for r in runs for t in r.comms_tiers}
    doc_reads = sum(r.docs_read for r in runs)
    rerolls = any(r.rerolled for r in runs)

    checks = [
        ("at least ten completed natural runs", len(completed) >= 10),
        ("all three endings reached, each at least once", endings == {"clock-failure", "destruction", "correction"}),
        ("a reroll is in the set", rerolls),
        ("a found-document read is in the set", doc_reads >= 1),
        ("a comms beat at each tier is in the set", comms_tiers == {"green", "amber", "red"}),
        ("a mid-run save and resume is in the set", any(r.resumed for r in completed)),
        ("save/resume twin scores match", 
         twin.completed and resumed.completed and twin.score == resumed.score and twin.ending == resumed.ending),
        ("zero uncaught console errors", len(all_errors) == 0),
        ("zero failed required asset requests (HTTP status)", len(all_failed) == 0),
        ("no run reported No eligible events", not no_eligible),
        ("tests/baseline/ untouched", baseline_before == baseline_after),
    ]
    failed = 0
    for label, ok in checks:
        print(f"  [{'PASS' if ok else 'FAIL'}] {label}")
        if not ok:
            failed += 1
    if all_errors:
        print("  errors:")
        for e in all_errors[:10]:
            print(f"    {e}")
    if all_failed:
        print("  failed requests:")
        for f in all_failed[:10]:
            print(f"    {f}")

    # Raw results for the verification document (staging only; not committed).
    out = Path("/tmp/kilo/complete-run-results.json")
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(
        json.dumps(
            [
                {
                    "seed": r.seed,
                    "strategy": r.strategy,
                    "ending": r.ending,
                    "score": r.score,
                    "grade": r.grade,
                    "docs_read": r.docs_read,
                    "comms_tiers": r.comms_tiers,
                    "dialogue_chars": r.dialogue_chars,
                    "resumed": r.resumed,
                    "rerolled": r.rerolled,
                    "completed": r.completed,
                }
                for r in runs
            ],
            indent=2,
        )
    )
    print(f"\nraw results: {out}")
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())
