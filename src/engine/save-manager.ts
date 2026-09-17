/**
 * Save / load manager — localStorage serialization for game state.
 * One autosave slot ('auto') plus 5 manual slots (0-4).
 * PersistentData (runs started, endings seen, audio settings) is stored
 * separately from save slots and is never overwritten by loading a save.
 *
 * @module engine/save-manager
 */

import type { GameState, SaveSlot, PersistentData, EngineSnapshot } from '../types/index';

const KEYS = {
  auto: 'wp_save_auto',
  slot: (i: number) => `wp_save_${i}`,
  persistent: 'wp_persistent',
} as const;

const SLOT_COUNT = 5;

function buildSlot(
  id: number | 'auto',
  state: GameState,
  sceneLabel: string,
  beatLabel: string,
  engine?: EngineSnapshot
): SaveSlot {
  return {
    id,
    label: id === 'auto' ? 'Autosave' : `Slot ${(id as number) + 1}`,
    state,
    savedAt: Date.now(),
    sceneLabel,
    beatLabel,
    ...(engine !== undefined ? { engine } : {}),
  };
}

export function autosave(
  state: GameState,
  sceneLabel: string,
  beatLabel: string,
  engine?: EngineSnapshot
): void {
  const slot = buildSlot('auto', state, sceneLabel, beatLabel, engine);
  try {
    localStorage.setItem(KEYS.auto, JSON.stringify(slot));
  } catch (e) {
    console.warn('[save-manager] autosave failed:', e);
  }
}

export function saveToSlot(
  slotIndex: number,
  state: GameState,
  sceneLabel: string,
  beatLabel: string,
  engine?: EngineSnapshot
): void {
  if (slotIndex < 0 || slotIndex >= SLOT_COUNT) {
    console.warn(`[save-manager] invalid slot index: ${slotIndex}`);
    return;
  }
  const slot = buildSlot(slotIndex, state, sceneLabel, beatLabel, engine);
  try {
    localStorage.setItem(KEYS.slot(slotIndex), JSON.stringify(slot));
  } catch (e) {
    console.warn('[save-manager] saveToSlot failed:', e);
  }
}

/** Loads the full slot (state + engine snapshot); null when absent or corrupt. */
export function loadSlot(slotId: number | 'auto'): SaveSlot | null {
  const key = slotId === 'auto' ? KEYS.auto : KEYS.slot(slotId as number);
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as SaveSlot;
  } catch (e) {
    console.warn('[save-manager] loadSlot failed:', e);
    return null;
  }
}

export function loadFromSlot(slotId: number | 'auto'): GameState | null {
  const key = slotId === 'auto' ? KEYS.auto : KEYS.slot(slotId as number);
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const slot = JSON.parse(raw) as SaveSlot;
    return slot.state;
  } catch (e) {
    console.warn('[save-manager] loadFromSlot failed:', e);
    return null;
  }
}

/** Returns all non-empty slots (autosave first, then manual slots 0-4). Silently skips corrupted entries. */
export function getSlotSummaries(): SaveSlot[] {
  const summaries: SaveSlot[] = [];

  const autoRaw = localStorage.getItem(KEYS.auto);
  if (autoRaw) {
    try {
      summaries.push(JSON.parse(autoRaw) as SaveSlot);
    } catch {
      // corrupted — skip
    }
  }

  for (let i = 0; i < SLOT_COUNT; i++) {
    const raw = localStorage.getItem(KEYS.slot(i));
    if (raw) {
      try {
        summaries.push(JSON.parse(raw) as SaveSlot);
      } catch {
        // corrupted — skip
      }
    }
  }

  return summaries;
}

export function hasAutosave(): boolean {
  return localStorage.getItem(KEYS.auto) !== null;
}

export function clearSlot(slotId: number | 'auto'): void {
  const key = slotId === 'auto' ? KEYS.auto : KEYS.slot(slotId as number);
  localStorage.removeItem(key);
}

const defaultPersistent: PersistentData = {
  runsStarted: 0,
  runsCompleted: 0,
  endingsSeen: [],
  audioMuted: false,
  cutscenesSetting: 'all',
};

export function savePersistentData(data: PersistentData): void {
  try {
    localStorage.setItem(KEYS.persistent, JSON.stringify(data));
  } catch (e) {
    console.warn('[save-manager] savePersistentData failed:', e);
  }
}

/**
 * AI NOTE: Merges loaded data with defaultPersistent — new fields added to PersistentData
 * will auto-populate for existing users without migration.
 */
export function loadPersistentData(): PersistentData {
  try {
    const raw = localStorage.getItem(KEYS.persistent);
    if (!raw) return { ...defaultPersistent };
    return { ...defaultPersistent, ...(JSON.parse(raw) as Partial<PersistentData>) };
  } catch {
    return { ...defaultPersistent };
  }
}
