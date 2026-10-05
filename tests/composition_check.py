#!/usr/bin/env python3
"""
Script Name  : composition_check.py
Description  : Gate 5.6 composition verification: journey and title regions
               match the composition contract within 2 logical px; live-run
               meter values equal the state (clock quantization, knowledge
               threshold marker under the default and a threshold-modifying
               configuration, module pips capacity and overflow); the
               PA-003 fill-width confirmation against the track box; the
               palette role check (no green anywhere visible); every enabled
               control performs its documented action in a live run; and the
               contract type sizes at 1920x1080.
Repository   : within-parameters-visual-novel
Author       : VintageDon (https://github.com/vintagedon/)
Created      : 2026-10-04

Usage
-----
    /opt/agents/venv/bin/python tests/composition_check.py [--base URL]
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

# Composition contract bounds (logical px at scale 1).
CONTRACT = {
    "viewport": {"x": 48, "y": 48, "w": 1423, "h": 688},
    "sidebar": {"x": 1471, "y": 48, "w": 401, "h": 688},
    "bottom-bar": {"x": 48, "y": 760, "w": 1824, "h": 272},
}

THEME_CONTRACT_JS = """
(surfaceSelector) => {
  const root = document.documentElement;
  const rootStyle = getComputedStyle(root);
  const surface = document.querySelector(surfaceSelector);
  const color = surface ? getComputedStyle(surface).color : '';
  const readLightness = (value) => {
    const match = value.match(/oklch\\(\\s*([\\d.]+)(%?)/i);
    if (!match) return null;
    const amount = Number(match[1]);
    return match[2] === '%' || amount > 1 ? amount / 100 : amount;
  };
  return {
    theme: root.dataset.gcTheme || '',
    accent: rootStyle.getPropertyValue('--gc-accent').trim(),
    primary: rootStyle.getPropertyValue('--gc-text-primary').trim(),
    surfaceColor: color,
    primaryLightness: readLightness(rootStyle.getPropertyValue('--gc-text-primary').trim()),
    surfaceLightness: readLightness(color),
  };
}
"""

METER_COLORS_JS = """
() => {
  const stage = document.getElementById('stage');
  const resolveToken = (token) => {
    const probe = document.createElement('span');
    probe.style.color = `var(${token})`;
    stage.appendChild(probe);
    const value = getComputedStyle(probe).color;
    probe.remove();
    return value;
  };
  const fill = (id) => {
    const meter = document.getElementById(id);
    const probe = document.createElement('span');
    probe.style.color = 'var(--gc-meter-fill)';
    meter.appendChild(probe);
    const value = getComputedStyle(probe).color;
    probe.remove();
    return value;
  };
  return {
    clock: fill('clock-bar'),
    knowledge: fill('knowledge-bar'),
    rapport: fill('rapport-bar'),
    resources: fill('resources-bar'),
    cyan: resolveToken('--gc-palette-scifi-accent'),
    amber: resolveToken('--gc-status-warning'),
    red: resolveToken('--gc-status-danger'),
  };
}
"""

OKLCH_TO_SRGB_JS = """
function oklchToSrgb(L, C, H) {
  const angle = H * Math.PI / 180;
  const a = C * Math.cos(angle);
  const b = C * Math.sin(angle);
  const lPrime = L + 0.3963377774 * a + 0.2158037573 * b;
  const mPrime = L - 0.1055613458 * a - 0.0638541728 * b;
  const sPrime = L - 0.0894841775 * a - 1.2914855480 * b;
  const l = lPrime * lPrime * lPrime;
  const m = mPrime * mPrime * mPrime;
  const s = sPrime * sPrime * sPrime;
  const linear = [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s,
  ];
  const transfer = (channel) => channel <= 0.0031308
    ? 12.92 * channel
    : 1.055 * Math.pow(channel, 1 / 2.4) - 0.055;
  return linear.map(transfer).map((value) => Math.min(1, Math.max(0, value)));
}
"""

GREEN_CHECK_JS = """
() => {
""" + OKLCH_TO_SRGB_JS + """
  // Sample every visible element's color, background-color, border-color,
  // and outline-color on the given root; flag any green (HSL hue 90..160 at
  // saturation >= 0.25). Handles rgb(), oklch(), and color(srgb ...) forms.
  function parseColor(s) {
    if (!s || s === 'none' || s === 'normal') return null;
    let m = s.match(/rgba?\\(([\\d.]+)[, ]+([\\d.]+)[, ]+([\\d.]+)/);
    if (m) return [Number(m[1]) / 255, Number(m[2]) / 255, Number(m[3]) / 255];
    m = s.match(/oklch\\(([\\d.]+)%?\\s+([\\d.]+)\\s+([\\d.]+)/) || s.match(/oklch\\(0*\\.?([\\d.]+)\\s+([\\d.]+)\\s+([\\d.]+)/);
    if (s.startsWith('oklch')) {
      m = s.match(/oklch\\(\\s*([\\d.]+)(?:%?)\\s+([\\d.]+)\\s+(-?[\\d.]+)/);
      if (!m) return null;
      let L = Number(m[1]); if (L > 1) L = L / 100;
      return oklchToSrgb(L, Number(m[2]), Number(m[3]));
    }
    m = s.match(/color\\(srgb\\s+([\\d.]+)\\s+([\\d.]+)\\s+([\\d.]+)/);
    if (m) return [Number(m[1]), Number(m[2]), Number(m[3])];
    return null;
  }
  function rgbToHsl(r, g, b) {
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    const l = (max + min) / 2;
    if (max === min) return [0, 0, l * 100];
    const d = max - min;
    const sat = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    let h;
    if (max === r) h = ((g - b) / d + (g < b ? 6 : 0));
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    return [h * 60, sat * 100, l * 100];
  }
  const root = document.getElementById('stage');
  const out = { colors: new Set(), violations: [], unparsed: [] };
  const els = root.querySelectorAll('*');
  for (const el of els) {
    const cs = getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden') continue;
    const r = el.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) continue;
    for (const prop of ['color', 'backgroundColor', 'borderColor', 'outlineColor']) {
      const raw = cs[prop];
      if (!raw || raw === 'none') continue;
      const rgb = parseColor(raw);
      if (!rgb) { if (out.unparsed.length < 8) out.unparsed.push(prop + '=' + raw); continue; }
      const key = raw;
      out.colors.add(key);
      const [h, s] = rgbToHsl(rgb[0], rgb[1], rgb[2]);
      if (h >= 90 && h <= 160 && s >= 25) {
        out.violations.push(`${el.tagName}.${String(el.className).slice(0, 40)} ${prop}=${raw} hsl(${h.toFixed(0)},${s.toFixed(0)}%)`);
      }
    }
  }
  out.colors = Array.from(out.colors);
  return out;
}
"""


def free_port() -> int:
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.bind(("127.0.0.1", 0))
        return s.getsockname()[1]


def start_dev(port: int) -> subprocess.Popen:
    proc = subprocess.Popen(
        ["node", "node_modules/vite/bin/vite.js", "--port", str(port), "--strictPort"],
        cwd=str(REPO_ROOT), stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
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


def record(failures: list[str], label: str, ok: bool, detail: str = "") -> None:
    print(f"  [{'PASS' if ok else 'FAIL'}] {label}{(': ' + detail) if detail else ''}")
    if not ok:
        failures.append(f"{label}: {detail}")


def rect_of(page, sel: str) -> dict:
    return page.evaluate(
        "(sel) => { const r = document.querySelector(sel).getBoundingClientRect(); return {x: r.x, y: r.y, w: r.width, h: r.height}; }",
        sel,
    )


def check_region(page, failures: list[str], sel: str, key: str) -> None:
    r = rect_of(page, sel)
    c = CONTRACT[key]
    ok = all(abs(r[a] - c[a]) <= 2 for a in ("x", "y", "w", "h"))
    record(failures, f"region {sel}", ok, f"got x{r['x']:.0f} y{r['y']:.0f} w{r['w']:.0f} h{r['h']:.0f}, want {c}")


def check_theme_contract(page, failures: list[str], surface: str, selector: str) -> None:
    values = page.evaluate(THEME_CONTRACT_JS, selector)
    record(failures, f"{surface} theme is sci-fi", values["theme"] == "sci-fi", values["theme"] or "missing")
    record(
        failures,
        f"{surface} root accent is contract cyan",
        values["accent"] == "oklch(78% 0.18 195)",
        values["accent"],
    )
    record(
        failures,
        f"{surface} primary text is light on the stage",
        values["primaryLightness"] is not None
        and values["primaryLightness"] >= 0.9
        and values["surfaceLightness"] is not None
        and values["surfaceLightness"] >= 0.9,
        f"token={values['primary']} rendered={values['surfaceColor']}",
    )


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--base", default=None)
    ap.add_argument("--mutation-remove-theme", action="store_true", help=argparse.SUPPRESS)
    args = ap.parse_args()

    failures: list[str] = []
    port = free_port()
    base = args.base or f"http://127.0.0.1:{port}/"
    server = None if args.base else start_dev(port)

    try:
        with sync_playwright() as pw:
            browser = pw.chromium.launch(headless=True)
            context = browser.new_context(viewport=VIEWPORT)
            page = context.new_page()
            page.add_init_script("window.__wpSeed = 20260916;")
            page.goto(base, wait_until="networkidle")
            page.wait_for_function("() => window.__wp && typeof window.__wp.stageFixture === 'function'", timeout=30000)
            if args.mutation_remove_theme:
                page.evaluate("() => document.documentElement.removeAttribute('data-gc-theme')")

            # ── Title regions and type sizes ──
            page.wait_for_selector("#title-screen:not(.hidden)")
            check_theme_contract(page, failures, "title", ".title-main")
            logo = rect_of(page, ".title-logo")
            record(failures, "title logo block within stage", 0 <= logo["x"] and logo["x"] + logo["w"] <= 1920, str(logo))
            menu = rect_of(page, ".title-menu")
            record(failures, "title menu 560px wide", abs(menu["w"] - 560) <= 2, f"w={menu['w']:.0f}")
            fs = page.evaluate("() => getComputedStyle(document.querySelector('.title-main')).fontSize")
            record(failures, "title display 96px", fs == "96px", fs)

            # Disabled CONTINUE retains its state and is not actionable.
            cont = page.locator("#title-menu .gc-button", has_text="CONTINUE").first
            record(failures, "CONTINUE disabled without autosave", cont.is_disabled())
            cont.click(force=True)
            page.wait_for_timeout(300)
            record(failures, "disabled CONTINUE click does nothing", page.locator("#title-screen:not(.hidden)").count() > 0)

            # SETTINGS opens and closes (documented action).
            page.locator("#title-menu .gc-button", has_text="SETTINGS").first.click()
            page.wait_for_selector("#settings-screen:not(.hidden)")
            record(failures, "SETTINGS opens settings", True)
            page.locator("#settings-footer .gc-button", has_text="CLOSE").first.click()
            page.wait_for_timeout(200)
            record(failures, "CLOSE returns to title", page.locator("#title-screen:not(.hidden)").count() > 0)

            # LOAD GAME opens the save/load screen (documented action).
            page.locator("#title-menu .gc-button", has_text="LOAD GAME").first.click()
            page.wait_for_selector("#save-load-screen:not(.hidden)")
            record(failures, "LOAD GAME opens slots", True)
            page.locator("#save-load-footer .gc-button", has_text="CANCEL").first.click()

            # ── Journey regions during a live run ──
            page.locator("#title-menu .gc-button", has_text="NEW GAME").first.click()
            page.wait_for_selector("#dossier-screen:not(.hidden)")

            # Clear-Headed hunt: reroll until the dossier shows it, so the
            # threshold marker is verified under a threshold-modifying trait.
            for _ in range(40):
                body = page.locator("#dossier-body").text_content() or ""
                if "Clear-Headed" in body:
                    break
                page.click("#dossier-reroll")
                page.wait_for_timeout(120)
            body = page.locator("#dossier-body").text_content() or ""
            record(failures, "Clear-Headed roll found", "Clear-Headed" in body)
            page.click("#dossier-deploy")
            page.wait_for_selector("#dialogue-text", timeout=15000)
            page.wait_for_timeout(400)

            # Knowledge meter + marker under the DEFAULT threshold (11/22):
            # reload with no rerolls for the default configuration.
            page2 = context.new_page()
            page2.add_init_script("window.__wpSeed = 20260916;")
            page2.goto(base, wait_until="networkidle")
            page2.wait_for_function("() => window.__wp && typeof window.__wp.stageFixture === 'function'", timeout=30000)
            page2.locator("#title-menu .gc-button", has_text="NEW GAME").first.click()
            page2.wait_for_selector("#dossier-screen:not(.hidden)")
            page2.click("#dossier-deploy")
            page2.wait_for_selector("#dialogue-text", timeout=15000)
            # Drive out of the fullscreen scenes so the rail (and the marker
            # with it) is rendered in the game-UI layout: click lines and,
            # where choices gate the way, take the first enabled one.
            for _ in range(40):
                if page2.evaluate("() => !document.getElementById('game-container').classList.contains('fullscreen')"):
                    break
                enabled = page2.query_selector_all("#choices-area .gc-button:not([disabled])")
                if enabled:
                    enabled[0].click()
                else:
                    page2.click("#bottom-bar")
                time.sleep(ACTION_MS / 1000)
            page2.wait_for_timeout(400)
            marker_left = page2.evaluate(
                "() => { const m = document.getElementById('knowledge-marker'); const k = document.getElementById('knowledge-bar').getBoundingClientRect(); const r = m.getBoundingClientRect(); return (r.x + r.width / 2 - k.x) / k.width * 100; }"
            )
            record(failures, "marker at default threshold (11/22)", abs(marker_left - 50.0) < 1.0, f"{marker_left:.2f}%")
            kv = page2.locator("#knowledge-value").text_content()
            record(failures, "knowledge readout default threshold", kv.strip() == "0 / 11", kv)

            # Module pips: capacity 8 with the exact count in the readout,
            # including a reachable value above eight.
            page2.evaluate("() => window.__wp.setModules(10)")
            page2.wait_for_timeout(300)
            mods = page2.evaluate(
                """() => {
                    const bar = document.getElementById('resources-bar');
                    const fill = bar.querySelector('.gc-meter__fill');
                    return { value: getComputedStyle(bar).getPropertyValue('--gc-meter-value').trim(), readout: document.getElementById('resources-value').textContent };
                }"""
            )
            record(failures, "modules above eight: pips capped, readout exact", mods["value"] == "100%" and mods["readout"] == "10", str(mods))
            page2.close()

                        # ── Live control actions in the run ──
            # Advance a dialogue line by clicking the band.
            before = page.evaluate("() => document.getElementById('dialogue-text').textContent")
            page.click("#bottom-bar")
            page.wait_for_timeout(200)
            after = page.evaluate("() => document.getElementById('dialogue-text').textContent")
            record(failures, "band click advances the line", before != after)

            # Drive to the first choices and take one; the scene advances.
            reached = False
            for _ in range(60):
                if page.query_selector_all("#choices-area .gc-button:not([disabled])"):
                    reached = True
                    break
                if page.locator("#reward-overlay:not(.hidden)").count() > 0:
                    break
                page.click("#bottom-bar")
                time.sleep(ACTION_MS / 1000)
            record(failures, "run reaches the event phase", reached or page.locator("#reward-overlay:not(.hidden)").count() > 0)

            speaker_prefix = page.locator("#speaker-name").text_content() or ""
            record(
                failures,
                "speaker label carries the contract ': ' separator",
                bool(speaker_prefix.strip()) and speaker_prefix.endswith(": "),
                repr(speaker_prefix),
            )

            # ── Journey regions and meter mechanics (event phase: the rail
            # and band are the game-UI layout, not the fullscreen scene) ──
            check_region(page, failures, "#viewport", "viewport")
            check_region(page, failures, "#sidebar", "sidebar")
            check_region(page, failures, "#bottom-bar", "bottom-bar")

            # Knowledge threshold marker under Clear-Headed (threshold 10):
            # marker sits at 10/22 = 45.455% of the meter, not the default 50%.
            marker_left = page.evaluate(
                "() => { const m = document.getElementById('knowledge-marker'); const k = document.getElementById('knowledge-bar').getBoundingClientRect(); const r = m.getBoundingClientRect(); return (r.x + r.width / 2 - k.x) / k.width * 100; }"
            )
            record(failures, "marker at effective threshold (Clear-Headed 10/22)", abs(marker_left - 100 * 10 / 22) < 1.0, f"{marker_left:.2f}%")
            kv = page.locator("#knowledge-value").text_content()
            record(failures, "knowledge readout carries effective threshold", kv.strip() == "0 / 10", kv)

            # Clock quantization: live state clock is 0 at run start; the
            # quantized fill must be zero segments.
            def clock_segments() -> tuple[float, int]:
                return page.evaluate(
                    """() => {
                        const bar = document.getElementById('clock-bar');
                        const fill = bar.querySelector('.gc-meter__fill');
                        const count = Number(getComputedStyle(bar).getPropertyValue('--gc-meter-count')) || 10;
                        const inner = bar.clientHeight;
                        const step = inner / count;
                        const filled = fill.getBoundingClientRect().height / step;
                        return [filled, count];
                    }"""
                )

            filled, count = clock_segments()
            record(failures, "clock segments 0 at start", abs(filled) < 0.5, f"filled={filled:.2f}")
            record(failures, "clock count equals clockMax", count == 10, f"count={count}")

            # PA-003: vertical fill width spans the track's inner width
            # (excluding border) within 1 logical px at 0, mid, and max.
            for clk in (0, 4, 10):
                page.evaluate("(c) => window.__wp.setClock(c)", clk)
                page.wait_for_timeout(400)
                w = page.evaluate(
                    """() => {
                        const bar = document.getElementById('clock-bar');
                        const fill = bar.querySelector('.gc-meter__fill');
                        return { fill: fill.getBoundingClientRect().width, inner: bar.clientWidth };
                    }"""
                )
                record(failures, f"PA-003 fill width at clock {clk}", abs(w["fill"] - w["inner"]) <= 1.0, f"fill={w['fill']:.2f} inner={w['inner']:.2f}")
                colors = page.evaluate(METER_COLORS_JS)
                roles_ok = (
                    colors["clock"] == colors["red"]
                    and colors["knowledge"] == colors["cyan"]
                    and colors["rapport"] == colors["amber"]
                    and colors["resources"] == colors["amber"]
                )
                record(
                    failures,
                    f"meter fill roles remain scoped at clock {clk}",
                    roles_ok,
                    str(colors),
                )

            page.evaluate("() => window.__wp.triggerReward('negativeReduction')")
            page.wait_for_selector("#reward-overlay:not(.hidden)")
            colors = page.evaluate(METER_COLORS_JS)
            record(
                failures,
                "negative rapport fill uses the danger role",
                colors["rapport"] == colors["red"],
                str(colors),
            )
            page.evaluate("() => window.__wp.hideOverlays()")

            # ── Palette check: journey during the live run (rail and band
            # visible in the game-UI layout) ──
            check_theme_contract(page, failures, "journey", "#dialogue-text")
            result = page.evaluate(GREEN_CHECK_JS)
            record(failures, "journey palette: no green", not result["violations"], "; ".join(result["violations"][:4]))
            if result["unparsed"]:
                print(f"  [note] unparsed colors (not classified): {result['unparsed']}")

            # Dialogue band type sizes at 1920x1080.
            fs = page.evaluate("() => getComputedStyle(document.getElementById('dialogue-text')).fontSize")
            record(failures, "dialogue body 28px", fs == "28px", fs)

            # SAVE opens the save screen; CANCEL returns. (The sidebar is
            # visible in the event phase; it is hidden in fullscreen scenes.)
            page.click("#hud-save")
            page.wait_for_selector("#save-load-screen:not(.hidden)", timeout=5000)
            record(failures, "SAVE opens slots", True)
            page.locator("#save-load-footer .gc-button", has_text="CANCEL").first.click()
            page.wait_for_timeout(200)

            if reached:
                scene_before = page.evaluate("() => document.getElementById('dialogue-text').textContent")
                page.query_selector_all("#choices-area .gc-button:not([disabled])")[0].click()
                page.wait_for_timeout(400)
                scene_after = page.evaluate("() => document.getElementById('dialogue-text').textContent")
                record(failures, "choice click advances the scene", scene_before != scene_after or page.locator("#reward-overlay:not(.hidden)").count() > 0)
                # Title palette check after returning to the title.
            else:
                record(failures, "choice click advances the scene", False, "no choices reached")

            # Reward pick applies and closes (if shown during the walk).
            if page.locator("#reward-overlay:not(.hidden)").count() > 0:
                res_before = page.locator("#resources-value").text_content()
                page.locator(".wp-reward-cards .wp-card").first.click()
                page.wait_for_timeout(400)
                record(failures, "reward card click closes overlay", page.locator("#reward-overlay:not(.hidden)").count() == 0)
                res_after = page.locator("#resources-value").text_content()
                record(failures, "reward pick changes state", res_before != res_after, f"{res_before} -> {res_after}")

            # Title palette: back at the title via a fresh page.
            page3 = context.new_page()
            page3.goto(base, wait_until="networkidle")
            page3.wait_for_selector("#title-screen:not(.hidden)")
            result = page3.evaluate(GREEN_CHECK_JS)
            record(failures, "title palette: no green", not result["violations"], "; ".join(result["violations"][:4]))
            page3.close()

            browser.close()
    finally:
        if server is not None:
            server.terminate()
            try:
                server.wait(timeout=5)
            except subprocess.TimeoutExpired:
                server.kill()

    print("=" * 76)
    if failures:
        print(f"composition check FAILED ({len(failures)} failure(s))")
        return 1
    print("composition check PASSED")
    return 0


if __name__ == "__main__":
    sys.exit(main())
