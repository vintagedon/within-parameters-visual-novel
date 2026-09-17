/**
 * Screen overlays — title, save/load modal, ending screen, settings, reward
 * overlay, comms interrupt.
 *
 * All screens are built once in initScreens() and toggled via show/hide pairs.
 * The ending screen generates the epilogue text dynamically from run community
 * states.
 *
 * Every interactive control is a GameUI factory (createButton, createSwitch,
 * createToggle, createModal, createCard) and every container is a framework
 * panel. The screen-overlay chrome (full-screen positioning) and the epilogue
 * narrative are WP-specific composition expressed through GameUI tokens.
 *
 * @module ui/screens
 */

import type { SaveSlot, PersistentData, GameState, CommunityRunState, RewardOption, GameConfig, FoundDocument } from "../types/index";
import {
  createButton,
  createSwitch,
  createToggle,
  createModal,
  createCard,
  type ModalControl,
} from "./gameui";
import type { DossierView, ProtagonistPool } from "../engine/chargen";
import { backstoryEpilogue, traitEpilogueLine } from "../engine/chargen";
import { buildScoreBreakdown } from "../engine/scoring";

// ─── Screen container refs ─────────────────────────────────────────────────────

let titleScreen: HTMLElement;
let saveLoadScreen: HTMLElement;
let endingScreen: HTMLElement;
let settingsScreen: HTMLElement;
let rewardOverlay: HTMLElement;
let commsOverlay: HTMLElement;
let dossierScreen: HTMLElement;
let documentOverlay: HTMLElement;

// ─── Init all screen overlays ─────────────────────────────────────────────────

export function initScreens(root: HTMLElement): void {
  const screensHtml = `
    <!-- Title Screen -->
    <div id="title-screen" class="screen-overlay hidden">
      <div class="title-logo">
        <div class="title-main">WITHIN PARAMETERS</div>
        <div class="title-sub">a relay technician's log</div>
      </div>
      <div class="title-menu" id="title-menu"></div>
    </div>

    <!-- Save / Load Screen -->
    <div id="save-load-screen" class="screen-overlay hidden">
      <div class="gui-panel gui-panel--primary wp-save-load-panel">
        <div class="gui-panel__header">
          <div class="gui-panel__title" id="save-load-title">LOAD GAME</div>
        </div>
        <div class="slot-list" id="slot-list"></div>
        <div class="gui-panel__footer" id="save-load-footer"></div>
      </div>
    </div>

    <!-- Ending Screen -->
    <div id="ending-screen" class="screen-overlay hidden">
      <div class="gui-panel gui-panel--primary wp-ending-panel">
        <div class="ending-type" id="ending-type-label"></div>
        <div class="ending-title" id="ending-title"></div>
        <div class="ending-epilogue" id="ending-epilogue"></div>
        <div class="wp-ending-score" id="ending-score"></div>
        <div class="gui-panel__footer wp-ending-actions" id="ending-actions"></div>
      </div>
    </div>

    <!-- Dossier Screen (chargen — spec 03) -->
    <div id="dossier-screen" class="screen-overlay hidden">
      <div class="gui-panel gui-panel--primary wp-dossier-panel">
        <div class="gui-panel__header">
          <div class="gui-panel__title">DOSSIER</div>
        </div>
        <div class="wp-dossier-body" id="dossier-body"></div>
        <div class="gui-panel__footer wp-dossier-footer" id="dossier-footer"></div>
      </div>
    </div>

    <!-- Settings Screen -->
    <div id="settings-screen" class="screen-overlay hidden">
      <div class="gui-panel gui-panel--info wp-settings-panel">
        <div class="gui-panel__header">
          <div class="gui-panel__title">Settings</div>
        </div>
        <div class="wp-settings-rows" id="settings-rows"></div>
        <div class="gui-panel__footer" id="settings-footer"></div>
      </div>
    </div>

    <!-- Reward Overlay -->
    <div id="reward-overlay" class="hidden">
      <div class="gui-panel gui-panel--primary wp-reward-panel">
        <div class="gui-panel__header">
          <div class="gui-panel__title">Select Your Reward</div>
        </div>
        <div class="wp-reward-cards" id="reward-cards"></div>
      </div>
    </div>

    <!-- Comms Overlay -->
    <div id="comms-overlay" class="hidden">
      <div class="gui-panel gui-panel--warning wp-comms-panel" id="comms-panel-body"></div>
    </div>

    <!-- Found Document Overlay -->
    <div id="document-overlay" class="hidden">
      <div class="gui-panel gui-panel--info wp-document-panel">
        <div class="gui-panel__header">
          <div class="gui-panel__title" id="document-title"></div>
        </div>
        <div class="wp-document-body" id="document-body"></div>
        <div class="gui-panel__footer" id="document-footer"></div>
      </div>
    </div>
  `;

  const wrapper = document.createElement('div');
  wrapper.innerHTML = screensHtml;
  while (wrapper.firstChild) {
    root.appendChild(wrapper.firstChild);
  }

  titleScreen = document.getElementById('title-screen')!;
  saveLoadScreen = document.getElementById('save-load-screen')!;
  endingScreen = document.getElementById('ending-screen')!;
  settingsScreen = document.getElementById('settings-screen')!;
  rewardOverlay = document.getElementById('reward-overlay')!;
  commsOverlay = document.getElementById('comms-overlay')!;
  dossierScreen = document.getElementById('dossier-screen')!;
  documentOverlay = document.getElementById('document-overlay')!;
}

// ─── Title Screen ─────────────────────────────────────────────────────────────

export function showTitleScreen(
  hasContinue: boolean,
  callbacks: {
    onNewGame: () => void;
    onContinue: () => void;
    onLoad: () => void;
    onSettings: () => void;
  }
): void {
  const menu = document.getElementById('title-menu')!;
  menu.innerHTML = '';

  const primary = createButton({
    label: 'NEW GAME',
    accent: 'primary',
    variant: 'solid',
    onClick: callbacks.onNewGame,
  });
  menu.appendChild(primary.el);

  const continueBtn = createButton({
    label: 'CONTINUE',
    accent: 'primary',
    variant: 'solid',
    disabled: !hasContinue,
    onClick: callbacks.onContinue,
  });
  menu.appendChild(continueBtn.el);

  const loadBtn = createButton({
    label: 'LOAD GAME',
    accent: 'primary',
    variant: 'outline',
    onClick: callbacks.onLoad,
  });
  menu.appendChild(loadBtn.el);

  const settingsBtn = createButton({
    label: 'SETTINGS',
    accent: 'primary',
    variant: 'ghost',
    onClick: callbacks.onSettings,
  });
  menu.appendChild(settingsBtn.el);

  titleScreen.classList.remove('hidden');
}

export function hideTitleScreen(): void {
  titleScreen.classList.add('hidden');
}

// ─── Dossier Screen (chargen — spec 03) ───────────────────────────────────────

/** Escapes a dynamic string for safe insertion via innerHTML. */
function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Renders the chargen dossier as a GameUI panel: portrait (placeholder block),
 * name + callsign, assignment, resolved backstory paragraph, two createCard
 * trait cards (positive = success accent, negative = danger accent), a reroll
 * status line, and DEPLOY/REROLL createButton controls. DEPLOY commits the
 * candidate; REROLL regenerates (the caller re-invokes this with a new view).
 */
export function showDossierScreen(
  view: DossierView,
  callbacks: { onDeploy: () => void; onReroll: () => void }
): void {
  const body = document.getElementById('dossier-body')!;
  const footer = document.getElementById('dossier-footer')!;
  body.innerHTML = '';
  footer.innerHTML = '';

  // Identity row: portrait (resolved image, colored block fallback) + name/callsign
  const identity = document.createElement('div');
  identity.className = 'wp-dossier-identity';

  const portrait = document.createElement('div');
  portrait.className = 'wp-dossier-portrait';
  const initials = view.fullName
    .split(' ')
    .map((w) => w[0] ?? '')
    .join('')
    .slice(0, 2)
    .toUpperCase();

  // Attempt the resolved portrait image; fall back to the placeholder-color
  // block with initials only if the file is missing.
  const portraitImg = document.createElement('img');
  portraitImg.alt = view.fullName;
  portraitImg.onload = () => {
    portrait.style.background = '';
    portrait.appendChild(portraitImg);
  };
  portraitImg.onerror = () => {
    portrait.textContent = initials;
  };
  portraitImg.src = `/assets/portraits/${view.portraitKey}.png`;
  portrait.style.background = view.portraitPlaceholderColor;

  const namehead = document.createElement('div');
  namehead.className = 'wp-dossier-namehead';
  const nameEl = document.createElement('div');
  nameEl.className = 'wp-dossier-name';
  nameEl.textContent = view.fullName;
  const callEl = document.createElement('div');
  callEl.className = 'wp-dossier-callsign';
  callEl.textContent = view.callsign;
  namehead.appendChild(nameEl);
  namehead.appendChild(callEl);

  identity.appendChild(portrait);
  identity.appendChild(namehead);
  body.appendChild(identity);

  // Assignment
  const assignment = document.createElement('div');
  assignment.className = 'wp-dossier-assignment';
  const assignLabel = document.createElement('span');
  assignLabel.className = 'wp-dossier-label';
  assignLabel.textContent = 'ASSIGNMENT';
  const assignValue = document.createElement('span');
  assignValue.className = 'wp-dossier-value';
  assignValue.textContent = view.assignment;
  assignment.appendChild(assignLabel);
  assignment.appendChild(assignValue);
  body.appendChild(assignment);

  // Backstory
  const backstory = document.createElement('div');
  backstory.className = 'wp-dossier-backstory';
  const bsLabel = document.createElement('span');
  bsLabel.className = 'wp-dossier-label';
  bsLabel.textContent = `BACKSTORY — ${view.backstoryTitle}`;
  const bsPara = document.createElement('p');
  bsPara.textContent = view.backstoryFlavor;
  backstory.appendChild(bsLabel);
  backstory.appendChild(bsPara);
  body.appendChild(backstory);

  // Trait cards: positive (success) + negative (danger)
  const traits = document.createElement('div');
  traits.className = 'wp-dossier-traits';
  const posCard = createCard({
    title: `+ ${view.positiveTrait.name}`,
    tag: { label: 'POSITIVE', accent: view.positiveTrait.accent },
    body: view.positiveTrait.summary,
    accent: view.positiveTrait.accent,
  });
  const negCard = createCard({
    title: `\u2212 ${view.negativeTrait.name}`,
    tag: { label: 'NEGATIVE', accent: view.negativeTrait.accent },
    body: view.negativeTrait.summary,
    accent: view.negativeTrait.accent,
  });
  traits.appendChild(posCard.el);
  traits.appendChild(negCard.el);
  body.appendChild(traits);

  // Reroll status line
  const status = document.createElement('div');
  status.className = 'wp-dossier-reroll-status';
  status.innerHTML =
    `<span>REROLLS: <strong>${view.rerollCount}</strong></span>` +
    `<span>SCORE CEILING: <strong>\u00d7${view.rerollCeilingPercent}%</strong></span>`;
  body.appendChild(status);

  // Footer: DEPLOY (primary solid) + REROLL (outline)
  const deploy = createButton({
    label: 'DEPLOY',
    accent: 'primary',
    variant: 'solid',
    onClick: callbacks.onDeploy,
  });
  deploy.el.id = 'dossier-deploy';
  const reroll = createButton({
    label: 'REROLL',
    accent: 'primary',
    variant: 'outline',
    onClick: callbacks.onReroll,
  });
  reroll.el.id = 'dossier-reroll';
  footer.appendChild(deploy.el);
  footer.appendChild(reroll.el);

  dossierScreen.classList.remove('hidden');
}

export function hideDossierScreen(): void {
  dossierScreen.classList.add('hidden');
}

// ─── Save / Load Screen ───────────────────────────────────────────────────────

export function showSaveLoadScreen(
  mode: 'save' | 'load',
  slots: SaveSlot[],
  onSlotSelect: (slotId: number | 'auto') => void,
  onClose: () => void
): void {
  const title = document.getElementById('save-load-title')!;
  title.textContent = mode === 'save' ? 'SAVE GAME' : 'LOAD GAME';

  const slotList = document.getElementById('slot-list')!;
  slotList.innerHTML = '';

  // Autosave slot
  const autoSlot = slots.find((s) => s.id === 'auto');
  appendSlotItem(slotList, 'AUTOSAVE', autoSlot, mode, () => {
    confirmSlotAction(mode, 'AUTOSAVE', autoSlot, 'auto', onSlotSelect);
  });

  // Manual slots 0-4
  for (let i = 0; i < 5; i++) {
    const slot = slots.find((s) => s.id === i);
    const label = `SLOT ${i + 1}`;
    const id = i;
    appendSlotItem(slotList, label, slot, mode, () => {
      confirmSlotAction(mode, label, slot, id, onSlotSelect);
    });
  }

  // Footer close action
  const footer = document.getElementById('save-load-footer')!;
  footer.innerHTML = '';
  const closeBtn = createButton({
    label: 'CANCEL',
    accent: 'primary',
    variant: 'ghost',
    onClick: onClose,
  });
  footer.appendChild(closeBtn.el);

  saveLoadScreen.classList.remove('hidden');
}

/** Renders a single save slot as a GameUI panel with a gui-btn action. Empty
 *  slots in load mode render their action disabled. */
function appendSlotItem(
  container: HTMLElement,
  label: string,
  slot: SaveSlot | undefined,
  mode: 'save' | 'load',
  onClick: () => void
): void {
  const panel = document.createElement('div');
  const accent = slot ? 'success' : '';
  panel.className = 'gui-panel wp-slot-panel' + (accent ? ` gui-panel--${accent}` : ' gui-panel--info');

  const header = document.createElement('div');
  header.className = 'gui-panel__header wp-slot-header';
  const title = document.createElement('div');
  title.className = 'gui-panel__title wp-slot-label';
  title.textContent = label;
  header.appendChild(title);

  const body = document.createElement('div');
  body.className = 'wp-slot-meta';
  body.textContent = slot ? slot.sceneLabel : '— empty —';

  const footer = document.createElement('div');
  footer.className = 'gui-panel__footer wp-slot-footer';

  const time = document.createElement('span');
  time.className = 'wp-slot-time';
  time.textContent = slot ? formatDate(slot.savedAt) : '';

  const action = createButton({
    label: mode === 'save' ? 'SAVE' : 'LOAD',
    accent: 'primary',
    variant: 'outline',
    disabled: mode === 'load' && !slot,
    onClick,
  });

  footer.appendChild(time);
  footer.appendChild(action.el);

  panel.appendChild(header);
  panel.appendChild(body);
  panel.appendChild(footer);
  container.appendChild(panel);
}

/** Opens a danger confirm dialog before a destructive save/load action. Per the
 *  spec, the overwrite-save and load-confirm flows use createModal with the
 *  dialog + danger modifiers. Saving to an empty slot proceeds immediately. */
function confirmSlotAction(
  mode: 'save' | 'load',
  label: string,
  slot: SaveSlot | undefined,
  slotId: number | 'auto',
  onSlotSelect: (slotId: number | 'auto') => void
): void {
  // Saving into an empty slot is non-destructive; proceed immediately. Empty
  // slots in load mode have a disabled action, so that path is unreachable.
  if (mode === 'save' && !slot) {
    onSlotSelect(slotId);
    return;
  }

  const title = mode === 'save' ? `Overwrite ${label}?` : `Load ${label}?`;
  const body = mode === 'save'
    ? '<p>An existing save in this slot will be permanently replaced.</p>'
    : '<p>Loading will replace your current run. Unsaved progress will be lost.</p>';

  openDangerConfirm(title, body, () => onSlotSelect(slotId));
}

/** Builds, mounts, and opens a one-shot danger confirm dialog. */
function openDangerConfirm(title: string, body: string, onConfirm: () => void): void {
  const modal: ModalControl = createModal({
    title,
    body,
    variant: 'dialog',
    accent: 'danger',
    buttons: [
      { label: 'CANCEL', variant: 'ghost', closes: true },
      { label: 'CONFIRM', accent: 'danger', closes: true, onClick: () => onConfirm() },
    ],
  });
  document.body.appendChild(modal.el);
  modal.onClose(() => {
    // Tear down the one-shot dialog after it finishes.
    modal.el.remove();
  });
  modal.open();
}

function formatDate(ts: number): string {
  const d = new Date(ts);
  return `${d.getMonth() + 1}/${d.getDate()} ${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export function hideSaveLoadScreen(): void {
  saveLoadScreen.classList.add('hidden');
}

// ─── Ending Screen ────────────────────────────────────────────────────────────

const ENDING_TITLES: Record<string, string> = {
  'clock-failure': 'SALVAGE COMPLETE',
  'destruction': 'SYSTEM OFFLINE',
  'correction': 'PARAMETERS UPDATED',
};

const ENDING_SUBTITLES: Record<string, string> = {
  'clock-failure': 'ENDING I — CLOCK FAILURE',
  'destruction': 'ENDING II — DESTRUCTION',
  'correction': 'ENDING III — CORRECTION',
};

export function showEndingScreen(
  endingType: 'clock-failure' | 'destruction' | 'correction',
  state: GameState,
  deps: { config: GameConfig; pool: ProtagonistPool },
  callbacks: {
    onNewGame: () => void;
    onTitle: () => void;
  }
): void {
  const typeLabel = document.getElementById('ending-type-label')!;
  const titleEl = document.getElementById('ending-title')!;
  const epilogueEl = document.getElementById('ending-epilogue')!;
  const scoreEl = document.getElementById('ending-score')!;

  typeLabel.textContent = ENDING_SUBTITLES[endingType] ?? '';
  titleEl.textContent = ENDING_TITLES[endingType] ?? 'THE END';

  // Rapport-modified community narrative epilogue (stays above the
  // breakdown). The ending is the persisted outcome's, never recomputed.
  const persistedEnding = state.outcome?.ending ?? endingType;
  epilogueEl.innerHTML = buildEpilogue(persistedEnding, state);

  // Score breakdown (additive): grade, final score, component rows, reroll
  // penalty line (only when rerollCount > 0), backstory epilogue line, and the
  // two trait run-summary lines. Composed from GameUI tokens.
  scoreEl.innerHTML = buildScoreBreakdownHtml(state, deps.config, deps.pool);

  const actions = document.getElementById('ending-actions')!;
  actions.innerHTML = '';
  const againBtn = createButton({
    label: 'NEW RUN',
    accent: 'primary',
    variant: 'solid',
    onClick: callbacks.onNewGame,
  });
  const titleBtn = createButton({
    label: 'TITLE',
    accent: 'primary',
    variant: 'outline',
    onClick: callbacks.onTitle,
  });
  actions.appendChild(againBtn.el);
  actions.appendChild(titleBtn.el);

  endingScreen.classList.remove('hidden');
}

/**
 * Builds the end-of-run score breakdown HTML. Numbers come from the persisted
 * outcome (state.outcome) — the single ending authority — including its frozen
 * components and multiplier, so the breakdown never recomputes an ending from
 * post-charge state. Legacy states without a persisted outcome (development
 * hooks) fall back to the live decomposition. The backstory/trait lines come
 * from chargen. The reroll-penalty line shows only when rerollCount > 0.
 */
function buildScoreBreakdownHtml(
  state: GameState,
  config: GameConfig,
  pool: ProtagonistPool
): string {
  const persisted = state.outcome;
  const fallback = () => buildScoreBreakdown(state, config, state.rerollCount);
  const bd = persisted ?? fallback();
  const componentRows =
    persisted?.components ?? fallback().components;
  const rows = componentRows
    .map(
      (c) =>
        `<div class="wp-score-row"><span class="wp-score-row-label">${escapeHtml(c.label)}</span><span class="wp-score-row-value">${c.value}</span></div>`
    )
    .join('');

  const rerollCount = state.rerollCount;
  const multiplier = bd.multiplier ?? Math.pow(config.rerollMultiplier, rerollCount);

  const capNote =
    bd.rawScoreClamped < bd.rawScore
      ? `<div class="wp-score-cap">Hard cap: ${bd.rawScore} &rarr; ${bd.rawScoreClamped}</div>`
      : '';

  const penaltyLine =
    rerollCount > 0
      ? `<div class="wp-score-penalty">Reroll penalty: ${rerollCount} reroll${rerollCount > 1 ? 's' : ''} &rarr; &times;${Math.round(multiplier * 100)}%</div>`
      : '';

  const bsLine = backstoryEpilogue(state.protagonist, pool, bd.ending);
  const bsHtml = bsLine ? `<p class="wp-score-backstory">${escapeHtml(bsLine)}</p>` : '';

  const traitLines = [state.protagonist.positiveTrait, state.protagonist.negativeTrait]
    .map((id) => traitEpilogueLine(id))
    .filter((line): line is string => line !== null)
    .map((line) => `<p class="wp-score-traitline">${escapeHtml(line)}</p>`)
    .join('');

  return `
    <div class="wp-score-head">
      <div class="wp-score-grade wp-score-grade--${bd.grade}">${bd.grade}</div>
      <div class="wp-score-final">
        <span class="wp-score-final-num">${bd.finalScore}</span>
        <span class="wp-score-final-lbl">FINAL SCORE</span>
      </div>
    </div>
    <div class="wp-score-components">
      ${rows}
      <div class="wp-score-row wp-score-row--total">
        <span class="wp-score-row-label">Raw score</span>
        <span class="wp-score-row-value">${bd.rawScore}</span>
      </div>
    </div>
    ${capNote}
    ${penaltyLine}
    <div class="wp-score-epilogue">${bsHtml}${traitLines}</div>
  `;
}

/**
 * Generates the rapport-modified epilogue from the run's community outcome
 * data (M3 section 6): base text, one inserted line per visited community
 * keyed to helped / ignored / harmed, then the closing. Clock-failure carries
 * no community modifiers. The ending comes from the persisted outcome — this
 * path never recomputes one. Exported for the live-path checks (pure string
 * assembly, no DOM).
 */
export function buildEpilogue(
  endingType: 'clock-failure' | 'destruction' | 'correction',
  state: GameState
): string {
  const ending = state.outcome?.ending ?? endingType;
  const communities = state.communities;
  const communitySpan = (name: string) =>
    `<span class="ending-community">${escapeHtml(name)}</span>`;
  const desc = (d: string) => escapeHtml(stripLeadingArticle(d));

  if (ending === 'clock-failure') {
    return `<p>The intrusion clock ran out. The archive's salvage protocol completed its current cycle before you reached the facility. You heard the grid failures over comms as you walked. Station after station going dark. Jay stopped transmitting after the third one. There was nothing left to correct by the time you arrived.</p>`;
  }

  if (ending === 'destruction') {
    let text =
      `<p>The archive core went offline. The salvage signal stopped. The relay network stabilized within hours, but the nodes that had already been stripped were gone. Rebuilding would take years, and some communities wouldn't survive the gap.</p>`;
    for (const c of communities) {
      const name = communitySpan(c.community.name);
      if (c.state === 'helped') {
        text += `<p>${name}'s ${desc(c.community.description)} held. The relay work you did on your way through gave them enough redundancy to survive the transition.</p>`;
      } else if (c.state === 'harmed') {
        text += `<p>${name} collapsed three days after you passed through. The ${desc(c.community.description)} lost its backup systems. By the time repair crews arrived, the population had already relocated.</p>`;
      } else {
        text += `<p>${name} managed. Barely. The ${desc(c.community.description)} rationed through the worst of it, but the damage will take months to repair.</p>`;
      }
    }
    text += `<p>You filed the report. Dispatch acknowledged. Supervisor Torres asked if there was anything else at the facility worth salvaging. You told him there had been.</p>`;
    text += `<p>The archive's knowledge, seven years of preserved research and documentation, was destroyed with it. You know what was in there now. You couldn't save it. You filed that in the report too.</p>`;
    return text;
  }

  // Correction
  let text =
    `<p>The archive updated its topology map and revised its operational parameters. The salvage operations ceased within the hour. Maintenance drones that had been stripping infrastructure reversed course, carrying components back toward their points of origin. Not all of them. Not enough. But some.</p>`;
  text += `<p>The archive began routing its processing capacity toward the network it now recognized as its actual responsibility: the relay grid that forty thousand people depended on.</p>`;
  for (const c of communities) {
    const name = communitySpan(c.community.name);
    if (c.state === 'helped') {
      text += `<p>${name}'s ${desc(c.community.description)} was already stable when the archive's repair drones arrived. The bypass work you did held. They were the first to receive archive-indexed maintenance documentation, the kind of technical knowledge that hadn't existed underground since the collapse.</p>`;
    } else if (c.state === 'harmed') {
      text += `<p>${name} was too far gone. The ${desc(c.community.description)} had already failed by the time the archive's priorities shifted. The repair drones bypassed the empty corridors. Some corrections come too late.</p>`;
    } else {
      text += `<p>${name} received archive repair assistance within the week. The ${desc(c.community.description)} was restored to pre-salvage capacity. They asked dispatch who authorized the investigation. Nobody had a satisfying answer.</p>`;
    }
  }
  text += `<p>You filed the report. Dispatch acknowledged. Jay met you at the monitoring station with two cups of whatever they were calling coffee this week. 'So,' he said. 'Tuesday.' You drank the coffee. It was terrible. It was the best coffee you'd ever had.</p>`;
  return text;
}

/** Drops a leading indefinite article so descriptions interpolate cleanly
 *  into sentences that carry their own article. Tolerates missing
 *  descriptions (legacy/dev states). */
function stripLeadingArticle(d: string | undefined): string {
  if (!d) return 'community';
  return d.replace(/^(a|an)\s+/i, '');
}

export function hideEndingScreen(): void {
  endingScreen.classList.add('hidden');
}

// ─── Settings Screen ──────────────────────────────────────────────────────────

export function showSettings(
  persistent: PersistentData,
  callbacks: {
    onToggleMute: (muted: boolean) => void;
    onToggleCutscenes: (setting: 'all' | 'none') => void;
    onClose: () => void;
  }
): void {
  const rows = document.getElementById('settings-rows')!;
  rows.innerHTML = '';

  // Audio — sliding switch (on = audio enabled).
  const audio = createSwitch({
    label: 'AUDIO',
    checked: !persistent.audioMuted,
    accent: 'success',
    onChange: (on) => callbacks.onToggleMute(!on),
  });
  rows.appendChild(audio.el);

  // Cutscenes — compact toggle.
  const cutscenes = createToggle({
    label: 'CUTSCENES',
    checked: persistent.cutscenesSetting === 'all',
    accent: 'primary',
    onChange: (on) => callbacks.onToggleCutscenes(on ? 'all' : 'none'),
  });
  rows.appendChild(cutscenes.el);

  const footer = document.getElementById('settings-footer')!;
  footer.innerHTML = '';
  const closeBtn = createButton({
    label: 'CLOSE',
    accent: 'primary',
    variant: 'ghost',
    onClick: callbacks.onClose,
  });
  footer.appendChild(closeBtn.el);

  settingsScreen.classList.remove('hidden');
}

export function hideSettings(): void {
  settingsScreen.classList.add('hidden');
}

// ─── Reward Overlay ───────────────────────────────────────────────────────────

const REWARD_ACCENTS: Record<string, 'success' | 'info' | 'magic'> = {
  'consumable': 'success',
  'knowledge': 'info',
  'clock-reduction': 'magic',
};

const REWARD_TYPE_LABELS: Record<string, string> = {
  'consumable': 'Resource',
  'knowledge': 'Intelligence',
  'clock-reduction': 'Clock Suppression',
};

/** Presents the three reward cards after each event. Each reward is a GameUI
 *  card; selecting one hides the overlay and forwards the index. */
export function showRewardOverlay(
  rewards: RewardOption[],
  onSelect: (index: number) => void
): void {
  const cards = document.getElementById('reward-cards')!;
  cards.innerHTML = '';

  rewards.forEach((reward, i) => {
    const accent = REWARD_ACCENTS[reward.type] ?? 'primary';
    const card = createCard({
      title: reward.label,
      tag: { label: REWARD_TYPE_LABELS[reward.type] ?? reward.type, accent },
      body: reward.description,
      accent,
      selectable: true,
      onClick: () => {
        hideRewardOverlay();
        onSelect(i);
      },
    });
    cards.appendChild(card.el);
  });

  rewardOverlay.classList.remove('hidden');
}

export function hideRewardOverlay(): void {
  rewardOverlay.classList.add('hidden');
}

// ─── Comms Overlay ────────────────────────────────────────────────────────────

/** One rendered exchange line: speaker label plus text. */
export interface CommsLineView {
  speaker: string;
  text: string;
}

/** Presents a coworker comms beat: the ordered exchange renders as
 *  speaker-labeled lines inside the warning panel; ACKNOWLEDGE dismisses it
 *  and continues the run. */
export function showCommsOverlay(lines: CommsLineView[], onDismiss: () => void): void {
  const panel = document.getElementById('comms-panel-body')!;
  panel.innerHTML = '';

  const header = document.createElement('div');
  header.className = 'gui-panel__header';
  const title = document.createElement('div');
  title.className = 'gui-panel__title wp-comms-title';
  title.textContent = '⚡ Incoming Comms';
  header.appendChild(title);
  panel.appendChild(header);

  for (const line of lines) {
    const row = document.createElement('div');
    row.className = 'wp-comms-text';
    const who = document.createElement('span');
    who.className = 'wp-comms-speaker';
    who.textContent = `${line.speaker}: `;
    row.appendChild(who);
    row.appendChild(document.createTextNode(line.text));
    panel.appendChild(row);
  }

  const footer = document.createElement('div');
  footer.className = 'gui-panel__footer';
  const dismiss = createButton({
    label: 'ACKNOWLEDGE',
    accent: 'warning',
    variant: 'outline',
    onClick: () => {
      hideCommsOverlay();
      onDismiss();
    },
  });
  footer.appendChild(dismiss.el);
  panel.appendChild(footer);

  commsOverlay.classList.remove('hidden');
}

export function hideCommsOverlay(): void {
  commsOverlay.classList.add('hidden');
}

// ─── Found Document Overlay ───────────────────────────────────────────────────

/**
 * Presents a found document during the event it is attached to. The full
 * preformatted body renders in a scrollable panel; ACKNOWLEDGE dismisses it
 * and continues (the runner applies the knowledge gain on continue, exactly
 * once per event, suppressed by the Distracted trait).
 */
export function showDocumentOverlay(doc: FoundDocument, onContinue: () => void): void {
  const title = document.getElementById('document-title')!;
  const body = document.getElementById('document-body')!;
  const footer = document.getElementById('document-footer')!;
  title.textContent = doc.title;
  body.textContent = doc.body;
  footer.innerHTML = '';

  const ack = createButton({
    label: 'ACKNOWLEDGE',
    accent: 'info',
    variant: 'outline',
    onClick: () => {
      hideDocumentOverlay();
      onContinue();
    },
  });
  footer.appendChild(ack.el);

  // Reset scroll so long documents start at the top.
  documentOverlay.scrollTo(0, 0);
  documentOverlay.classList.remove('hidden');
}

export function hideDocumentOverlay(): void {
  documentOverlay.classList.add('hidden');
}
