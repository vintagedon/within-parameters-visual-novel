#!/usr/bin/env python3
"""
Script Name  : audit-events.py
Description  : Mechanical audit of data/events.json against simulation/game_data.py
Repository   : within-parameters-visual-novel
Author       : VintageDon (https://github.com/vintagedon/)
Created      : 2026-09-16

Usage
-----
    /opt/agents/venv/bin/python scripts/audit-events.py

game_data.py is the MECHANICAL-VALUE authority for every choice. This script
imports it (no parsing heuristics), loads data/events.json, and compares every
choice's knowledge / module / clock / community / gate values event by event.
Exit code 0 = exact match; 1 = any mismatch.
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(REPO_ROOT / "simulation"))

from game_data import (  # noqa: E402
    APPROACH_POOL,
    COMMUNITY_POOL,
    TRANSIT_POOL,
)

POOLS = {
    "community": COMMUNITY_POOL,
    "transit": TRANSIT_POOL,
    "approach": APPROACH_POOL,
}

EXPECTED_ATTACHMENT = {
    "CE-01": ["FD-01", "FD-02"],
    "CE-04": ["FD-08"],
    "TE-02": ["FD-03", "FD-04"],
    "TE-04": ["FD-05", "FD-06"],
    "AE-03": ["FD-07"],
}


def audit() -> int:
    data = json.loads((REPO_ROOT / "data" / "events.json").read_text())
    events = data["events"]

    errors: list[str] = []
    rows: list[str] = []

    counts = {"community": 0, "transit": 0, "approach": 0}
    for ev in events:
        counts[ev["category"]] += 1

    if len(events) != 12:
        errors.append(f"pool size: expected 12 events, found {len(events)}")
    if counts != {"community": 5, "transit": 4, "approach": 3}:
        errors.append(f"zone split: expected 5/4/3, found {counts}")

    for category, pool in POOLS.items():
        for sim_event in pool:
            json_event = next((e for e in events if e["id"] == sim_event.id), None)
            if json_event is None:
                errors.append(f"{sim_event.id}: missing from events.json")
                continue
            if json_event["category"] != category:
                errors.append(
                    f"{sim_event.id}: category {json_event['category']} != {category}"
                )

            # Situation scene must carry exactly the simulated choices.
            situation = next(
                (
                    s
                    for s in json_event["scenes"]
                    if s.get("choices") and len(s["choices"]) > 0
                ),
                None,
            )
            if situation is None:
                errors.append(f"{sim_event.id}: no choice scene")
                continue
            choices = situation["choices"]
            if len(choices) != len(sim_event.choices):
                errors.append(
                    f"{sim_event.id}: {len(choices)} choices != {len(sim_event.choices)}"
                )
                continue

            for i, sim_choice in enumerate(sim_event.choices):
                choice = choices[i]
                sc = choice.get("statChanges") or {}
                jk = sc.get("knowledge", 0)
                jm = sc.get("consumables", 0)
                jc = sc.get("clock", 0)

                # Community effect: JSON expresses helped/harmed explicitly;
                # omission is 'ignored' for community events, 'none' otherwise.
                explicit = choice.get("communityEffect")
                if explicit is not None:
                    je = explicit
                else:
                    je = "ignored" if category == "community" else "none"

                cond = choice.get("condition")
                gate_k = cond["min"] if cond and cond["stat"] == "knowledge" else 0
                gate_r = cond["min"] if cond and cond["stat"] == "rapport" else 0

                row_ok = True
                for label, jv, sv in [
                    ("knowledge", jk, sim_choice.knowledge_change),
                    ("modules", jm, sim_choice.module_change),
                    ("clock", jc, sim_choice.clock_change),
                    ("community", je, sim_choice.community_effect),
                    ("knowledge_gate", gate_k, sim_choice.knowledge_gate),
                    ("rapport_gate", gate_r, sim_choice.rapport_gate),
                ]:
                    if jv != sv:
                        errors.append(
                            f"{sim_event.id} choice {i} ({sim_choice.label}): "
                            f"{label} {jv!r} != game_data {sv!r}"
                        )
                        row_ok = False
                rows.append(
                    f"{sim_event.id}[{sim_choice.label}]: "
                    f"k={jk} m={jm} c={jc} comm={je} gk={gate_k} gr={gate_r}"
                    + ("" if row_ok else "  <-- MISMATCH")
                )

            # Found-document attachment matches the M3 table.
            attach = json_event.get("foundDocumentIds", [])
            want = EXPECTED_ATTACHMENT.get(sim_event.id, [])
            has_doc = want != []
            if has_doc != sim_event.has_found_document:
                errors.append(
                    f"{sim_event.id}: has_found_document {sim_event.has_found_document} "
                    f"but attachment list {want}"
                )
            if sorted(attach) != sorted(want):
                errors.append(
                    f"{sim_event.id}: attachment {attach} != expected {want}"
                )

            # Situation text present for every event and per-choice dialogue
            # scenes exist.
            arrive = json_event.get("scenes", [])[0]
            if not any(
                ln.get("text", "").strip() for ln in arrive.get("dialogue", [])
            ):
                errors.append(f"{sim_event.id}: empty arrive dialogue")
            for i in range(len(sim_event.choices)):
                target = choices[i]["nextScene"]
                target_scene = next(
                    (s for s in json_event["scenes"] if s["id"] == target), None
                )
                if target_scene is None:
                    errors.append(f"{sim_event.id}: consequence scene {target} missing")
                elif not any(
                    ln.get("text", "").strip() for ln in target_scene.get("dialogue", [])
                ):
                    errors.append(f"{sim_event.id}: consequence {target} has no dialogue")

    # No scaffold gate text remains.
    raw = (REPO_ROOT / "data" / "events.json").read_text()
    for marker in ["Requires Knowledge", "[2 resources]", "[Knowledge 5]"]:
        if marker in raw:
            errors.append(f"scaffold gate text remains: {marker!r}")

    print("Event audit: data/events.json vs simulation/game_data.py")
    for row in rows:
        print(f"  {row}")
    if errors:
        print(f"\nFAIL: {len(errors)} mismatch(es):")
        for e in errors:
            print(f"  - {e}")
        return 1
    print("\nall 36 choices match game_data.py exactly; attachments and text present")
    return 0


if __name__ == "__main__":
    sys.exit(audit())
