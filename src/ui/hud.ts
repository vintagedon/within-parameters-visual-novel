/**
 * HUD (sidebar) — stat bars, intrusion clock, and journey timeline.
 * All elements are built once in initHUD and updated in place thereafter.
 *
 * Rendered through the GameUI framework: each section is a .gui-panel and the
 * stats are .gui-bar components (linear bars for knowledge/rapport, segmented
 * bars for the intrusion clock and resources). Only the WP stat semantics and
 * the engine bindings are preserved; the rendering is the framework's.
 *
 * Clock urgency is expressed through framework accent roles: success (safe),
 * warning (≥40%), danger (≥70%), applied to both the clock panel and the
 * segmented bar.
 *
 * @module ui/hud
 */

import type { GameState, CommunityRunState } from "../types/index";

// ─── Display constants ────────────────────────────────────────────────────────

const KNOWLEDGE_DISPLAY_MAX = 10;
const RAPPORT_DISPLAY_MAX = 6;
const RESOURCE_SEGMENTS = 8;

// ─── DOM References ───────────────────────────────────────────────────────────

let clockPanel: HTMLElement;
let clockReading: HTMLElement;
let clockBar: HTMLElement;
let clockSegments: HTMLElement;

let knowledgeBar: HTMLElement;
let knowledgeValue: HTMLElement;

let rapportBar: HTMLElement;
let rapportValue: HTMLElement;

let resourcesValue: HTMLElement;
let resourceSegments: HTMLElement;

let timelineBody: HTMLElement;

let totalStops = 6;

// ─── Init ─────────────────────────────────────────────────────────────────────

export function initHUD(sidebar: HTMLElement, journeyStops: number): void {
  totalStops = journeyStops;

  sidebar.innerHTML = `
    <section class="gui-panel gui-panel--success wp-clock-panel" id="clock-panel">
      <div class="gui-panel__header">
        <div class="gui-panel__title">Intrusion Clock</div>
        <div class="wp-clock-reading" id="clock-reading">0 / 10</div>
      </div>
      <div class="gui-bar gui-bar--success gui-bar--segmented" id="clock-bar">
        <div class="gui-bar__segments" id="clock-segments"></div>
      </div>
    </section>

    <section class="gui-panel gui-panel--info" id="stat-panel">
      <div class="gui-bar gui-bar--info" id="knowledge-bar" style="--amount: 0;">
        <div class="gui-bar__header">
          <span class="gui-bar__label">Knowledge</span>
          <span class="gui-bar__value" id="knowledge-value">0</span>
        </div>
        <div class="gui-bar__track"><div class="gui-bar__fill"></div></div>
      </div>

      <div class="gui-bar gui-bar--success" id="rapport-bar" style="--amount: 0;">
        <div class="gui-bar__header">
          <span class="gui-bar__label">Rapport</span>
          <span class="gui-bar__value" id="rapport-value">0</span>
        </div>
        <div class="gui-bar__track"><div class="gui-bar__fill"></div></div>
      </div>

      <div class="gui-bar gui-bar--success gui-bar--segmented" id="resources-bar">
        <div class="gui-bar__header">
          <span class="gui-bar__label">Resources</span>
          <span class="gui-bar__value" id="resources-value">0</span>
        </div>
        <div class="gui-bar__segments" id="resources-segments"></div>
      </div>
    </section>

    <section class="gui-panel" id="timeline-panel">
      <div class="gui-panel__header">
        <div class="gui-panel__title">Route</div>
      </div>
      <div class="wp-timeline" id="timeline-body"></div>
    </section>
  `;

  clockPanel = document.getElementById('clock-panel')!;
  clockReading = document.getElementById('clock-reading')!;
  clockBar = document.getElementById('clock-bar')!;
  clockSegments = document.getElementById('clock-segments')!;

  knowledgeBar = document.getElementById('knowledge-bar')!;
  knowledgeValue = document.getElementById('knowledge-value')!;

  rapportBar = document.getElementById('rapport-bar')!;
  rapportValue = document.getElementById('rapport-value')!;

  resourcesValue = document.getElementById('resources-value')!;
  resourceSegments = document.getElementById('resources-segments')!;

  timelineBody = document.getElementById('timeline-body')!;

  // Seed segmented bars and timeline at their initial state.
  renderSegmented(clockSegments, 0, totalStops > 0 ? 0 : 0, getStateClockMax());
  renderSegmented(resourceSegments, 0, RESOURCE_SEGMENTS, RESOURCE_SEGMENTS);
  updateTimeline(0, totalStops, []);
}

function getStateClockMax(): number {
  return 10;
}

// ─── Update Functions ─────────────────────────────────────────────────────────

/** Updates all HUD values from current state. The clock and resources use
 *  segmented bars (pip fill counts); knowledge and rapport use linear bars
 *  (--amount scaleX fill). Accent roles convey urgency and direction. */
export function updateStats(state: GameState): void {
  const { stats, clock } = state;

  // ─── Intrusion Clock ── segmented bar + urgency accent ───────────────────
  const clockPct = clock.max > 0 ? (clock.current / clock.max) * 100 : 0;
  clockReading.textContent = `${clock.current} / ${clock.max}`;
  renderSegmented(clockSegments, clock.current, clock.max, clock.max);

  setBarUrgency(clockBar, clockPct);
  setPanelUrgency(clockPanel, clockPct);
  clockReading.dataset.level = urgencyLevel(clockPct);

  // ─── Knowledge ── linear bar (info/cyan) ─────────────────────────────────
  const knowledgeFraction = Math.min(1, stats.knowledge / KNOWLEDGE_DISPLAY_MAX);
  knowledgeBar.style.setProperty('--amount', String(knowledgeFraction));
  knowledgeValue.textContent = String(stats.knowledge);

  // ─── Rapport ── linear bar, success (≥0) or danger (<0), fill = magnitude ─
  const clamped = Math.max(-RAPPORT_DISPLAY_MAX, Math.min(RAPPORT_DISPLAY_MAX, stats.rapport));
  rapportValue.textContent = clamped >= 0 ? `+${clamped}` : String(clamped);
  const rapportFraction = Math.abs(clamped) / RAPPORT_DISPLAY_MAX;
  rapportBar.style.setProperty('--amount', String(rapportFraction));
  setRapportAccent(rapportBar, stats.rapport);

  // ─── Resources ── segmented bar (success/green) ──────────────────────────
  const shown = Math.min(RESOURCE_SEGMENTS, Math.max(0, stats.consumables));
  renderSegmented(resourceSegments, shown, RESOURCE_SEGMENTS, RESOURCE_SEGMENTS);
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

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Emits `total` pip elements into the container and marks the first `filled`
 *  with .is-filled, matching the framework's segmented-bar contract. */
function renderSegmented(container: HTMLElement, filled: number, total: number, _max: number): void {
  container.innerHTML = '';
  const count = Math.max(0, total);
  for (let i = 0; i < count; i++) {
    const pip = document.createElement('span');
    pip.className = 'gui-bar__pip';
    if (i < filled) pip.classList.add('is-filled');
    container.appendChild(pip);
  }
}

function urgencyLevel(pct: number): 'safe' | 'warn' | 'danger' {
  if (pct >= 70) return 'danger';
  if (pct >= 40) return 'warn';
  return 'safe';
}

/** Swaps the bar's color modifier to convey clock urgency (success→warning→danger). */
function setBarUrgency(bar: HTMLElement, pct: number): void {
  bar.classList.remove('gui-bar--success', 'gui-bar--warning', 'gui-bar--danger');
  bar.classList.add(`gui-bar--${urgencyLevel(pct)}`);
}

/** Swaps the clock panel's accent modifier to convey urgency. */
function setPanelUrgency(panel: HTMLElement, pct: number): void {
  panel.classList.remove('gui-panel--success', 'gui-panel--warning', 'gui-panel--danger');
  panel.classList.add(`gui-panel--${urgencyLevel(pct)}`);
}

/** Sets the rapport bar accent: success for net-positive, danger for net-negative. */
function setRapportAccent(bar: HTMLElement, rapport: number): void {
  bar.classList.remove('gui-bar--success', 'gui-bar--danger');
  bar.classList.add(rapport >= 0 ? 'gui-bar--success' : 'gui-bar--danger');
}
