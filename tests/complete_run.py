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
VIEWPORT = {"width": 1920, "height": 1080}
ACTION_MS = 90
MAX_ACTIONS = 6000

# Independent reference trace for the counter cross-check (A1.5): a
# scene-level dialogue count of seed 555555 produced outside this harness
# during the PR 6 review. The trace predates the A1.4 speaker-prefix
# removal, so the expected typed total is reconciled at runtime: the trace's
# per-scene totals are compared against the current data files and the
# per-scene deltas (all of them stripped prefix lengths) are itemized.
REFERENCE_TRACE = Path(__file__).resolve().parent / "fixtures" / "seed555555-dialogue-count.json"

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
        self.raw_score: int | None = None
        self.grade: str | None = None
        self.actions = 0
        self.docs_read = 0
        self.comms_tiers: list[str] = []
        self.errors: list[str] = []
        self.failed_requests: list[str] = []
        self.no_eligible_events = False
        # A1.5 counter: typed dialogue characters (one count per rendered
        # line, collected by the page-side observer) and instant-surface
        # characters (documents, comms, epilogue, score breakdown — each
        # surface counted once). Polling and typewriter updates do not
        # create extra occurrences.
        self.typed_chars = 0
        self.typed_lines = 0
        self.instant_chars = 0
        self.instant_breakdown: dict[str, int] = {}
        self.decisions = 0
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
    # Typed-dialogue collector: the dialogue bar toggles a .typing class for
    # every rendered line (startTypewriter adds it, finish/skip removes it).
    # One removal with a full text payload is exactly one displayed line, so
    # repeated identical lines still count twice while typewriter ticks and
    # harness polling count nothing extra.
    page.add_init_script(
        """(function() {
            window.__wpTyped = { chars: 0, lines: 0 };
            const el = () => document.getElementById('dialogue-text');
            let armed = false;
            const obs = new MutationObserver(() => {
                const node = el();
                if (!node) return;
                if (node.classList.contains('typing')) { armed = true; return; }
                if (armed) {
                    armed = false;
                    const t = node.textContent || '';
                    window.__wpTyped.chars += t.length;
                    window.__wpTyped.lines += 1;
                }
            });
            const attach = () => {
                const node = el();
                if (!node) { setTimeout(attach, 50); return; }
                obs.observe(node, { attributes: true, childList: true, characterData: true, subtree: true });
            };
            attach();
        })();
    """
    )
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
            page.locator("#title-menu .gc-button", has_text="LOAD GAME").first.click()
            page.wait_for_selector("#save-load-screen:not(.hidden)", timeout=5000)
            page.locator(".wp-slot-panel", has_text="SLOT 1").locator(".gc-button").first.click()
            # The load confirm is a danger modal and always appears.
            page.wait_for_selector(".wp-modal.is-open", timeout=5000)
            page.locator(".wp-modal__footer .gc-button", has_text="CONFIRM").first.click()
            page.wait_for_selector("#dialogue-text", timeout=15000)
            result.resumed = True
        else:
            page.goto(base, wait_until="networkidle")
            page.wait_for_selector("#title-screen:not(.hidden)", timeout=15000)
            page.locator("#title-menu .gc-button", has_text="NEW GAME").first.click()
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
                # Gate 5.9 reference parity: extract the existing rendered
                # Raw score row (read-only presentation extraction; no
                # application source change).
                raw_row = page.locator(
                    "#ending-score .wp-score-row--total .wp-score-row-value"
                )
                result.raw_score = (
                    int(raw_row.text_content().strip()) if raw_row.count() > 0 else None
                )
                epilogue = page.locator("#ending-epilogue").text_content() or ""
                breakdown = page.locator("#ending-score").text_content() or ""
                result.instant_chars += len(epilogue) + len(breakdown)
                result.instant_breakdown["epilogue"] = len(epilogue)
                result.instant_breakdown["score_breakdown"] = len(breakdown)
                result.completed = True
                break

            # Correction strategy: keep the kit above the fix cost. The pick
            # is a decision like any other reward pick and counts as one
            # (A2.4: the branch previously bypassed the decision increment,
            # undercounting every correction-policy run by its reward picks).
            if strategy == "correction" and page.locator("#reward-overlay:not(.hidden)").count() > 0:
                result.decisions += 1
                resources = int((page.locator("#resources-value").text_content() or "0").strip() or "0")
                pick = 0 if resources <= 2 else 1
                page.locator(".wp-reward-cards .wp-card").nth(pick).click()
                time.sleep(ACTION_MS / 1000)
                continue

            if page.locator("#document-overlay:not(.hidden)").count() > 0:
                result.instant_chars += len(page.locator("#document-body").text_content() or "")
                result.instant_breakdown["document"] = result.instant_breakdown.get("document", 0) + len(page.locator("#document-body").text_content() or "")
                result.docs_read += 1
                page.click("#document-footer .gc-button")
                time.sleep(ACTION_MS / 1000)
                continue

            if page.locator("#comms-overlay:not(.hidden)").count() > 0:
                # Counted as line text (the exchange), matching the trace's
                # methodology: the per-line text node, excluding the speaker
                # label span and the panel chrome.
                text = page.evaluate(
                    """() => Array.from(document.querySelectorAll('#comms-panel-body .wp-comms-text'))
                        .map((r) => (r.lastChild ? r.lastChild.textContent : ''))
                        .join('')"""
                )
                result.instant_chars += len(text)
                result.instant_breakdown["comms"] = result.instant_breakdown.get("comms", 0) + len(text)
                tier = classify_tier(text)
                if tier and tier not in result.comms_tiers:
                    result.comms_tiers.append(tier)
                page.click("#comms-panel-body .gc-button")
                time.sleep(ACTION_MS / 1000)
                continue

            if page.locator("#reward-overlay:not(.hidden)").count() > 0:
                result.decisions += 1
                cards = page.locator(".wp-reward-cards .wp-card")
                cards.nth(reward_pick).click()
                time.sleep(ACTION_MS / 1000)
                continue

            choices = page.query_selector_all("#choices-area .gc-button:not([disabled])")
            if choices:
                result.decisions += 1
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

        typed = page.evaluate("() => window.__wpTyped || { chars: 0, lines: 0 }")
        result.typed_chars = typed["chars"]
        result.typed_lines = typed["lines"]
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
    page.locator("#title-menu .gc-button", has_text="NEW GAME").first.click()
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
            page.locator(".wp-slot-panel", has_text="SLOT 1").locator(".gc-button").first.click()
            page.wait_for_timeout(400)
            slot_raw = page.evaluate("localStorage.getItem('wp_save_0')")
            if not slot_raw:
                raise RuntimeError("slot 1 save failed")
            page.close()
            context.close()
            return {"key": "wp_save_0", "value": json.loads(slot_raw)}

        if page.locator("#document-overlay:not(.hidden)").count() > 0:
            page.click("#document-footer .gc-button")
            time.sleep(ACTION_MS / 1000)
            continue
        if page.locator("#comms-overlay:not(.hidden)").count() > 0:
            page.click("#comms-panel-body .gc-button")
            time.sleep(ACTION_MS / 1000)
            continue
        if page.locator("#reward-overlay:not(.hidden)").count() > 0:
            rewards_seen += 1
            page.locator(".wp-reward-cards .wp-card").nth(1).click()
            time.sleep(ACTION_MS / 1000)
            continue
        choices = page.query_selector_all("#choices-area .gc-button:not([disabled])")
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
    trace_check_only = "--trace-check" in sys.argv

    try:
        with sync_playwright() as pw:
            browser = pw.chromium.launch(headless=True)

            # Save/resume pair: uninterrupted twin first (clean storage),
            # then the mid-run save, then the resume in a fresh context.
            twin = play_run(browser, base, origin, save_seed, "knowledge")
            runs.append(twin)
            if trace_check_only:
                browser.close()
            else:
                slot = save_mid_run_slot(browser, base, origin, save_seed)
                resumed = play_run(browser, base, origin, save_seed, "knowledge", resume_state=slot)
                runs.append(resumed)

            # Fixed inventory (A1.5): the parent review surface's recorded
            # 37 runs re-run in full — the coverage-based early exits are
            # gone, so easier red comms cannot silently drop prior runs.
            # Every entry reproduces a run documented at closeout.
            plan: list[tuple[int, str, int]] = [] if trace_check_only else [
                (20260916, "knowledge", 0),
                (20260916, "consumable", 0),
                (7, "clockburn", 0),
                (11, "knowledge", 1),        # reroll coverage
                (42, "consumable", 0),
                (99, "clockburn", 0),
                (31337, "knowledge", 0),
                (2027, "consumable", 0),
                (12345, "clockburn", 0),
                (777, "knowledge", 0),
                (8888, "consumable", 0),
                (90210, "clockburn", 0),
                (60606, "knowledge", 0),
                (40404, "consumable", 0),
            ]
            if not trace_check_only:
                plan += [(seed, "correction", 0) for seed in (501, 502, 503, 504, 505, 506)]
                plan += [(seed, "redhunt", 0) for seed in range(601, 616)]
            for seed, strategy, rerolls in plan:
                runs.append(play_run(browser, base, origin, seed, strategy, rerolls))

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
            f"typed {r.typed_chars}/{r.typed_lines}L, instant {r.instant_chars}, "
            f"decisions {r.decisions}, errors {len(r.errors)}, failed-req {len(r.failed_requests)})"
        )
    print("=" * 76)

    # Counter cross-check against the independent scene-level trace of seed
    # 555555 (knowledge strategy). The trace predates the A1.4 prefix
    # removal; the expected typed total is the trace total minus the
    # per-scene deltas, each delta being stripped prefix length on lines the
    # run displays. Every difference is itemized here, not averaged.
    trace_report = {"checked": False}
    twin_run = runs[0] if runs else None
    if REFERENCE_TRACE.exists() and twin_run is not None and twin_run.completed:
        trace = json.loads(REFERENCE_TRACE.read_text())
        events_now = json.loads((REPO_ROOT / "data" / "events.json").read_text())["events"]
        scenes_now = json.loads((REPO_ROOT / "data" / "scenes.json").read_text())["scenes"]
        def scene_len(sid):
            for s in scenes_now:
                if s["id"] == sid:
                    return sum(len(l["text"]) for l in s["dialogue"])
            for e in events_now:
                for s in e["scenes"]:
                    if s["id"] == sid:
                        return sum(len(l["text"]) for l in s["dialogue"])
            return None
        expected_typed = trace["typedDialogueChars"]
        deltas = []
        for shown in trace["shown"]:
            cur = scene_len(shown["id"])
            if cur is None:
                deltas.append(f"{shown['id']}: missing from current data")
                continue
            if cur != shown["chars"]:
                deltas.append(f"{shown['id']}: trace {shown['chars']} -> now {cur} (delta {cur - shown['chars']}, A1.4 prefix removal)")
                expected_typed -= shown["chars"] - cur
        typed_delta = twin_run.typed_chars - expected_typed
        trace_comms = sum(beat["chars"] for beat in trace["beats"])
        # The trace's beat objects carry tierId and total chars (no timing).
        # Comms text is untouched by the amendment's content changes, so the
        # expected comms total is the trace total when every trace beat's
        # char count still matches a current-data beat of the same tier.
        comms_data = json.loads((REPO_ROOT / "data" / "comms-beats.json").read_text())["commsBeats"]
        comms_matched = []
        for beat in trace["beats"]:
            candidates = [
                sum(len(l["text"]) for l in b["lines"])
                for t in comms_data if t["id"] == beat["tierId"]
                for b in t["beats"]
            ]
            comms_matched.append(beat["chars"] in candidates)
        comms_expected = trace_comms if all(comms_matched) else -1
        trace_report = {
            "checked": True,
            "trace_typed": trace["typedDialogueChars"],
            "reconciled_expected_typed": expected_typed,
            "harness_typed": twin_run.typed_chars,
            "harness_typed_lines": twin_run.typed_lines,
            "typed_delta_vs_reconciled": typed_delta,
            "scene_deltas": deltas,
            "trace_comms_chars": trace_comms,
            "current_data_comms_chars_for_seen_beats": comms_expected,
            "harness_comms_chars": twin_run.instant_breakdown.get("comms", 0),
            "trace_epilogue_chars": trace["epilogueChars"],
            "harness_epilogue_chars": twin_run.instant_breakdown.get("epilogue", 0),
        }
        print("Counter cross-check (seed 555555 vs independent trace):")
        print(f"  trace typed {trace['typedDialogueChars']} -> reconciled for A1.4 prefix removal: {expected_typed}")
        for d in deltas:
            print(f"    {d}")
        print(f"  harness typed: {twin_run.typed_chars} chars / {twin_run.typed_lines} lines (delta {typed_delta})")
        print(f"  comms: trace {trace_comms}, harness {twin_run.instant_breakdown.get('comms', 0)}")
        print(f"  epilogue: trace {trace['epilogueChars']}, harness {twin_run.instant_breakdown.get('epilogue', 0)}")
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
        ("a mid-run save and resume is in the set", (not trace_check_only) and any(r.resumed for r in completed)),
        ("save/resume twin scores match",
         (not trace_check_only) and twin.completed and resumed.completed
         and twin.score == resumed.score and twin.ending == resumed.ending),
        ("zero uncaught console errors", len(all_errors) == 0),
        ("zero failed required asset requests (HTTP status)", len(all_failed) == 0),
        ("no run reported No eligible events", not no_eligible),
        ("tests/baseline/ untouched", baseline_before == baseline_after),
        ("counter matches the reconciled independent trace (seed 555555)",
         trace_report["checked"]
         and trace_report["typed_delta_vs_reconciled"] == 0
         and trace_report["harness_comms_chars"] == trace_report["current_data_comms_chars_for_seen_beats"]
         and trace_report["trace_comms_chars"] > 0
         and trace_report["harness_epilogue_chars"] == trace_report["trace_epilogue_chars"]),
        # A2.4: the aggregate that drives the duration estimate must equal
        # the sum of its validated categories — instant_chars collects the
        # same epilogue/comms/document/breakdown contributions the breakdown
        # records, so a mutation to either side alone breaks this equality.
        ("instant aggregate equals its category breakdown for every run",
         all(r.instant_chars == sum(r.instant_breakdown.values()) for r in runs)),
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
                    "raw_score": r.raw_score,
                    "grade": r.grade,
                    "docs_read": r.docs_read,
                    "comms_tiers": r.comms_tiers,
                    "typed_chars": r.typed_chars,
                    "typed_lines": r.typed_lines,
                    "instant_chars": r.instant_chars,
                    "instant_breakdown": r.instant_breakdown,
                    "decisions": r.decisions,
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
