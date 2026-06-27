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

import type { SaveSlot, PersistentData, GameState, CommunityRunState, RewardOption } from "../types/index";
import {
  createButton,
  createSwitch,
  createToggle,
  createModal,
  createCard,
  type ModalControl,
} from "./gameui";

// ─── Screen container refs ─────────────────────────────────────────────────────

let titleScreen: HTMLElement;
let saveLoadScreen: HTMLElement;
let endingScreen: HTMLElement;
let settingsScreen: HTMLElement;
let rewardOverlay: HTMLElement;
let commsOverlay: HTMLElement;

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
        <div class="gui-panel__footer wp-ending-actions" id="ending-actions"></div>
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
    accent: slot ? 'primary' : 'primary',
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
  callbacks: {
    onNewGame: () => void;
    onTitle: () => void;
  }
): void {
  const typeLabel = document.getElementById('ending-type-label')!;
  const titleEl = document.getElementById('ending-title')!;
  const epilogueEl = document.getElementById('ending-epilogue')!;

  typeLabel.textContent = ENDING_SUBTITLES[endingType] ?? '';
  titleEl.textContent = ENDING_TITLES[endingType] ?? 'THE END';

  epilogueEl.innerHTML = buildEpilogue(endingType, state.communities);

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

/** Generates epilogue HTML from the run's community outcome data. Named communities appear as styled spans. Three branches: clock-failure, destruction, correction. */
function buildEpilogue(
  endingType: string,
  communities: CommunityRunState[]
): string {
  const helped = communities.filter((c) => c.state === 'helped');
  const harmed = communities.filter((c) => c.state === 'harmed');
  const ignored = communities.filter((c) => c.state === 'ignored');

  const communitySpan = (name: string) =>
    `<span class="ending-community">${name}</span>`;

  if (endingType === 'clock-failure') {
    const losses = communities.map((c) => communitySpan(c.community.name)).join(', ') || 'the settlements along your route';
    return `<p>The intrusion clock ran out. The archive AI's salvage protocol accelerated beyond containment, stripping infrastructure from ${losses} before any intervention could be mounted. You never made it to the facility.</p><p>The grid went dark in segments. People adapted — they always do. But they would have adapted differently if you'd arrived in time.</p>`;
  }

  if (endingType === 'destruction') {
    let text = `<p>You reached the facility. You found the archive. What you brought with you wasn't enough to correct it — only to destroy it.</p>`;
    if (harmed.length > 0) {
      text += `<p>The route cost you: ${harmed.map((c) => communitySpan(c.community.name)).join(', ')} were worse off for your passing. That sat with you as you made the call.</p>`;
    }
    if (helped.length > 0) {
      text += `<p>${helped.map((c) => communitySpan(c.community.name)).join(' and ')} had reason to remember you differently. It was something.</p>`;
    }
    text += `<p>The archive's micro-reactor was breached. The core failed. No more salvage signal. No more cannibalized relays. The grid stabilized — or will, eventually, in the segments that still had power to stabilize.</p>`;
    return text;
  }

  // Correction
  let text = `<p>You reached the facility with enough documentation to remap the archive's operational scope. The AI accepted the correction — not because it understood, but because the new parameters were valid within its framework. It resumed its original function: preserve and index. It stopped cannibalizing the relay network because the relay network was now within its definition of "infrastructure to protect."</p>`;
  if (helped.length > 0) {
    text += `<p>${helped.map((c) => communitySpan(c.community.name)).join(', ')} — the communities that gave you something along the way — received the first clean relay connections in three years. The archive's grid access was re-scoped to serve the network it had been dismantling.</p>`;
  }
  if (harmed.length > 0) {
    text += `<p>${harmed.map((c) => communitySpan(c.community.name)).join(' and ')} didn't benefit from your choices on the way in. The route matters. You knew that now in a way the briefing hadn't conveyed.</p>`;
  }
  if (ignored.length > 0 && helped.length === 0) {
    text += `<p>The communities along your route got a working relay network. Whether they knew who to thank was less clear.</p>`;
  }
  return text;
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

export function showCommsOverlay(text: string, onDismiss: () => void): void {
  const panel = document.getElementById('comms-panel-body')!;
  panel.innerHTML = '';

  const header = document.createElement('div');
  header.className = 'gui-panel__header';
  const title = document.createElement('div');
  title.className = 'gui-panel__title wp-comms-title';
  title.textContent = '⚡ Incoming Comms';
  header.appendChild(title);

  const body = document.createElement('div');
  body.className = 'wp-comms-text';
  body.textContent = text;

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

  panel.appendChild(header);
  panel.appendChild(body);
  panel.appendChild(footer);

  commsOverlay.classList.remove('hidden');
}

export function hideCommsOverlay(): void {
  commsOverlay.classList.add('hidden');
}
