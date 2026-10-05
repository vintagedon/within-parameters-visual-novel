/**
 * HUD (status rail) — stat meters, intrusion clock, journey timeline.
 * All elements are built once in initHUD and updated in place thereafter.
 *
 * Rendered through the gc framework's meter family: the intrusion clock is a
 * segmented meter, knowledge and rapport are continuous meters, resources are
 * pips. Values ride the framework's --gc-meter-value channel; the count rides
 * --gc-meter-count. WP provides only the label rows and the urgency role
 * mapping (data-wp-accent: cyan safe, amber warn, red danger).
 *
 * @module ui/hud
 */

import type { GameState, CommunityRunState, GameConfig } from "../types/index";
import { createButton } from './gameui';

// ─── Display constants ────────────────────────────────────────────────────────

const RESOURCE_SEGMENTS = 8;

// ─── DOM References ───────────────────────────────────────────────────────────

let clockPanel: HTMLElement;
let clockReading: HTMLElement;
let clockBar: HTMLElement;

let knowledgeBar: HTMLElement;
let knowledgeValue: HTMLElement;
let knowledgeMarker: HTMLElement | null = null;

/** Fixed visual scale for the knowledge meter: twice the default threshold,
 *  documented in the composition contract. The threshold marker positions
 *  against this scale (never against the trait-adjusted threshold), so a
 *  threshold-modifying trait visibly moves the marker. */
let knowledgeScale = 22;

let rapportBar: HTMLElement;
let rapportValue: HTMLElement;

let resourcesBar: HTMLElement;
let resourcesValue: HTMLElement;

let timelineBody: HTMLElement;

let totalStops = 6;

// ─── Init ─────────────────────────────────────────────────────────────────────

export function initHUD(sidebar: HTMLElement, config: GameConfig, onSave?: () => void): void {
  totalStops = config.journeyStops;

  // Status rail per the composition contract: the intrusion clock is a
  // vertical segmented meter at the rail's left edge spanning the stat rows
  // (--gc-meter-count = the clock maximum), then the stat rows, then the
  // route tracker and SAVE. Knowledge carries a threshold marker positioned
  // by the effective threshold against a fixed visual scale (2x the default
  // threshold), so a threshold-modifying trait moves the marker.
  const KNOWLEDGE_SCALE = config.knowledgeThreshold * 2;
  sidebar.innerHTML = `
    <section class="gc-panel wp-clock-panel" id="clock-panel" data-wp-accent="cyan">
      <div class="wp-rail-row">
        <div class="gc-meter" data-shape="segmented" data-orientation="vertical" id="clock-bar"
             data-wp-accent="red"
             style="--gc-meter-count: ${config.clockMax}; --gc-meter-value: 0%;" aria-label="Intrusion clock">
          <div class="gc-meter__fill" id="clock-segments"></div>
        </div>
        <div class="wp-rail-stats" id="stat-panel">
          <div class="wp-meter-head">
            <span class="wp-meter-label">Intrusion</span>
            <span class="wp-meter-value wp-clock-reading" id="clock-reading" data-level="safe">0 / ${config.clockMax}</span>
          </div>
          <div class="wp-meter-head">
            <span class="wp-meter-label">Knowledge</span>
            <span class="wp-meter-value" id="knowledge-value">0 / ${config.knowledgeThreshold}</span>
          </div>
          <div class="gc-meter wp-knowledge-meter" data-shape="continuous" id="knowledge-bar"
               data-wp-accent="cyan" style="--gc-meter-value: 0%;">
            <div class="gc-meter__fill"></div>
            <div class="wp-meter-marker" id="knowledge-marker" style="left: ${(config.knowledgeThreshold / KNOWLEDGE_SCALE) * 100}%;"></div>
          </div>
          <div class="wp-meter-head">
            <span class="wp-meter-label">Rapport</span>
            <span class="wp-meter-value" id="rapport-value">0</span>
          </div>
          <div class="gc-meter" data-shape="continuous" id="rapport-bar" data-wp-accent="amber" style="--gc-meter-value: 0%;">
            <div class="gc-meter__fill"></div>
          </div>
          <div class="wp-meter-head">
            <span class="wp-meter-label">Resources</span>
            <span class="wp-meter-value" id="resources-value">0</span>
          </div>
          <div class="gc-meter" data-shape="pips" id="resources-bar" data-wp-accent="amber"
               style="--gc-meter-count: ${RESOURCE_SEGMENTS}; --gc-meter-value: 0%;"
               title="Bypass modules: one pip per module, display capped at ${RESOURCE_SEGMENTS}; the readout carries the exact count">
            <div class="gc-meter__fill"></div>
          </div>
        </div>
      </div>
    </section>

    <section class="gc-panel" id="timeline-panel">
      <div class="wp-panel__header">
        <div class="wp-panel__title">Route</div>
      </div>
      <div class="wp-timeline" id="timeline-body"></div>
      <div class="wp-panel__footer wp-hud-actions" id="hud-actions"></div>
    </section>
  `;

  clockPanel = document.getElementById('clock-panel')!;
  clockReading = document.getElementById('clock-reading')!;
  clockBar = document.getElementById('clock-bar')!;

  knowledgeBar = document.getElementById('knowledge-bar')!;
  knowledgeValue = document.getElementById('knowledge-value')!;
  knowledgeMarker = document.getElementById('knowledge-marker');
  knowledgeScale = config.knowledgeThreshold * 2;

  rapportBar = document.getElementById('rapport-bar')!;
  rapportValue = document.getElementById('rapport-value')!;

  resourcesBar = document.getElementById('resources-bar')!;
  resourcesValue = document.getElementById('resources-value')!;

  timelineBody = document.getElementById('timeline-body')!;

  // Manual save action (gate 4.7): reachable from the sidebar during a run.
  const actions = document.getElementById('hud-actions');
  if (actions && onSave) {
    const save = createButton({
      label: 'SAVE',
      accent: 'primary',
      variant: 'outline',
      onClick: onSave,
    });
    save.el.id = 'hud-save';
    actions.appendChild(save.el);
  }
}

// ─── Update Functions ─────────────────────────────────────────────────────────

/** Updates all HUD values from current state. All meters ride the framework's
 *  --gc-meter-value channel; the segmented clock quantizes in CSS. Urgency
 *  and direction are expressed through the WP accent roles on the owning
 *  elements (data-wp-accent: cyan/amber/red).
 *
 *  The knowledge meter scales against the run's effective correction
 *  threshold (trait-adjusted, passed in by the caller): the fill uses the
 *  fixed visual scale, while the marker and readout carry the effective
 *  threshold so the target remains visible. */
export function updateStats(state: GameState, knowledgeThreshold: number): void {
  const { stats, clock } = state;

  // ─── Intrusion Clock ── segmented meter + urgency accent ─────────────────
  // Fill segments render red (danger role) at every urgency; the panel
  // border and the readout carry the cyan/amber/red urgency ramp.
  const clockPct = clock.max > 0 ? (clock.current / clock.max) * 100 : 0;
  clockReading.textContent = `${clock.current} / ${clock.max}`;
  clockBar.style.setProperty('--gc-meter-value', `${Math.min(100, clockPct)}%`);

  setUrgency(clockPanel, clockPct);
  clockReading.dataset.level = urgencyLevel(clockPct);

  // ─── Knowledge ── continuous meter against the fixed visual scale, with
  // the threshold marker at the effective (trait-adjusted) threshold ──────
  const knowledgeFraction = Math.min(1, stats.knowledge / knowledgeScale);
  knowledgeBar.style.setProperty('--gc-meter-value', `${knowledgeFraction * 100}%`);
  knowledgeValue.textContent = `${stats.knowledge} / ${knowledgeThreshold}`;
  if (knowledgeMarker) {
    knowledgeMarker.style.left = `${(knowledgeThreshold / knowledgeScale) * 100}%`;
  }

  // ─── Rapport ── continuous meter, amber (>=0) or red (<0), fill = magnitude ─
  const clamped = Math.max(-6, Math.min(6, stats.rapport));
  rapportValue.textContent = clamped >= 0 ? `+${clamped}` : String(clamped);
  const rapportFraction = Math.abs(clamped) / 6;
  rapportBar.style.setProperty('--gc-meter-value', `${rapportFraction * 100}%`);
  rapportBar.dataset.wpAccent = stats.rapport >= 0 ? 'amber' : 'red';

  // ─── Resources ── pips (amber, the human-economy role) ───────────────────
  const shown = Math.min(RESOURCE_SEGMENTS, Math.max(0, stats.consumables));
  resourcesBar.style.setProperty('--gc-meter-value', `${(shown / RESOURCE_SEGMENTS) * 100}%`);
  resourcesValue.textContent = String(stats.consumables);
}

/** Rebuilds the route timeline on every stop advance. Community names appear
 *  once assigned; earlier stops show as visited, current as active, future as
 *  placeholder. This is WP-specific composition rendered through tokens. */
export function updateTimeline(
  currentStop: number,
  stops: number,
  communities: CommunityRunState[]
): void {
  timelineBody.innerHTML = '';

  for (let i = 1; i <= stops; i++) {
    const stop = document.createElement('div');
    stop.className = 'wp-timeline__stop';

    if (i < currentStop) {
      stop.classList.add('is-visited');
    } else if (i === currentStop) {
      stop.classList.add('is-current');
    } else {
      stop.classList.add('is-upcoming');
    }

    const dot = document.createElement('span');
    dot.className = 'wp-timeline__dot';

    const label = document.createElement('span');
    label.className = 'wp-timeline__label';

    const community = communities.find((c) => c.stop === i);
    if (community) {
      label.textContent = community.community.name;
    } else if (i === currentStop) {
      label.textContent = `STOP ${i}`;
    } else {
      label.textContent = `— STOP ${i} —`;
    }

    stop.appendChild(dot);
    stop.appendChild(label);
    timelineBody.appendChild(stop);
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function urgencyLevel(pct: number): 'safe' | 'warn' | 'danger' {
  if (pct >= 70) return 'danger';
  if (pct >= 40) return 'warn';
  return 'safe';
}

/** Applies the WP accent role for a clock urgency level on any element
 *  (cyan safe, amber warn, red danger). The framework's meter fill and the
 *  panel border consume the scoped accent. */
function setUrgency(el: HTMLElement, pct: number): void {
  const level = urgencyLevel(pct);
  el.dataset.wpAccent = level === 'danger' ? 'red' : level === 'warn' ? 'amber' : 'cyan';
}
