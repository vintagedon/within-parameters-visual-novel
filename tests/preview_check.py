#!/usr/bin/env python3
"""
Script Name  : preview_check.py
Description  : Gate 4.7 preview verification — runs a segment of the game
               against the production build (vite preview) and asserts zero
               failed asset requests by inspecting HTTP response status
               codes (not console-message text).
Repository   : within-parameters-visual-novel
Author       : VintageDon (https://github.com/vintagedon/)
Created      : 2026-09-16

Usage
-----
    /opt/agents/venv/bin/python tests/preview_check.py

Requires a fresh build (npm run build). Starts `vite preview` on a free
port, drives NEW GAME -> deploy -> a run segment, and records the HTTP
status of every same-origin /assets/ and /data/ response. Any status >= 400
is a failure. Console errors are also collected.
"""

from __future__ import annotations

import os
import socket
import subprocess
import sys
import time
from pathlib import Path
from urllib.parse import urlparse

from playwright.sync_api import sync_playwright

REPO_ROOT = Path(__file__).resolve().parent.parent
VIEWPORT = {"width": 1440, "height": 900}


def free_port() -> int:
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.bind(("127.0.0.1", 0))
        return s.getsockname()[1]


def start_preview(port: int) -> subprocess.Popen:
    env = os.environ.copy()
    proc = subprocess.Popen(
        ["node", "node_modules/vite/bin/vite.js", "preview", "--port", str(port), "--strictPort"],
        cwd=str(REPO_ROOT),
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
        env=env,
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


def main() -> int:
    if not (REPO_ROOT / "dist" / "index.html").exists():
        print("no dist/ build found; run npm run build first")
        return 1

    port = free_port()
    base = f"http://127.0.0.1:{port}/"
    origin = f"127.0.0.1:{port}"
    server = start_preview(port)

    statuses: list[tuple[int, str]] = []
    errors: list[str] = []

    try:
        with sync_playwright() as pw:
            browser = pw.chromium.launch(headless=True)
            page = browser.new_page(viewport=VIEWPORT)
            page.on(
                "response",
                lambda r: statuses.append((r.status, r.url))
                if urlparse(r.url).netloc == origin
                and (r.url.split(base, 1)[-1].startswith("assets/") or r.url.split(base, 1)[-1].startswith("data/"))
                else None,
            )
            page.on("console", lambda m: errors.append(f"console.{m.type}: {m.text}") if m.type == "error" else None)
            page.on("pageerror", lambda e: errors.append(f"pageerror: {e}"))
            page.add_init_script("window.__wpSeed = 2027;")
            page.goto(base, wait_until="networkidle")
            page.wait_for_selector("#title-screen:not(.hidden)", timeout=15000)
            page.locator("#title-menu .gui-btn", has_text="NEW GAME").first.click()
            page.wait_for_selector("#dossier-screen:not(.hidden)", timeout=10000)
            page.click("#dossier-deploy")
            page.wait_for_selector("#dialogue-text", timeout=10000)

            # Run segment: two events' worth of play.
            rewards_seen = 0
            for _ in range(700):
                if rewards_seen >= 2:
                    break
                if page.locator("#document-overlay:not(.hidden)").count() > 0:
                    page.click("#document-footer .gui-btn")
                    time.sleep(0.1)
                    continue
                if page.locator("#comms-overlay:not(.hidden)").count() > 0:
                    page.click("#comms-panel-body .gui-btn")
                    time.sleep(0.1)
                    continue
                if page.locator("#reward-overlay:not(.hidden)").count() > 0:
                    rewards_seen += 1
                    page.locator(".wp-reward-cards .gui-card").first.click()
                    time.sleep(0.12)
                    continue
                if page.query_selector("#choices-area .gui-btn:not([disabled])"):
                    page.query_selector("#choices-area .gui-btn:not([disabled])").click()
                    time.sleep(0.12)
                    continue
                page.click("#bottom-bar")
                time.sleep(0.08)

            page.close()
            browser.close()
    finally:
        server.terminate()
        try:
            server.wait(timeout=5)
        except subprocess.TimeoutExpired:
            server.kill()

    failed = [(s, u) for s, u in statuses if s >= 400]
    print(f"HTTP status check against the production build (preview):")
    print(f"  same-origin /assets/ + /data/ responses: {len(statuses)}")
    print(f"  failed (status >= 400):                   {len(failed)}")
    for s, u in failed[:20]:
        print(f"    {s} {u}")
    print(f"  console errors: {len(errors)}")
    for e in errors[:10]:
        print(f"    {e}")

    if failed or errors or rewards_seen < 2:
        return 1
    print("run segment completed with zero failed asset requests")
    return 0


if __name__ == "__main__":
    sys.exit(main())
