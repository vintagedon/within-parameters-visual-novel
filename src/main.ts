/**
 * Application entry point — bootstraps the engine and wires the UI.
 * Loads all data files in parallel, initializes all subsystems, then shows
 * the title screen. Each new game or loaded save creates a fresh SceneRunner.
 *
 * The dialogue sequencer (runDialogueSequence) is the bridge between the
 * SceneRunner callbacks and the dialogue/choice UI.
 */

import './styles.css';

import type {
  GameConfig,
  GameState,
  Scene,
  EventDef,
  Community,
  RewardOption,
  CharacterManifest,
  Character,
} from './types/index';

// Engine
import { initNewGame, deriveRapport } from './engine/game-state';
import {
  SceneRunner,
  buildSceneRegistry,
  type SceneRunnerCallbacks,
} from './engine/scene-runner';
import {
  autosave,
  saveToSlot,
  loadFromSlot,
  getSlotSummaries,
  hasAutosave,
  loadPersistentData,
  savePersistentData,
} from './engine/save-manager';

// UI
import {
  initLayout,
  setFullScreen,
  setGameUI,
  setBackground,
  registerBackgrounds,
} from './ui/layout';
import {
  initDialogue,
  renderLine,
  renderChoices,
  clearDialogue,
} from './ui/dialogue';
import { initHUD, updateStats, updateTimeline } from './ui/hud';
import {
  initScreens,
  showTitleScreen,
  hideTitleScreen,
  showSaveLoadScreen,
  hideSaveLoadScreen,
  showEndingScreen,
  hideEndingScreen,
  showSettings,
  hideSettings,
  showRewardOverlay,
  showCommsOverlay,
} from './ui/screens';

// Audio
import * as Audio from './audio/audio-manager';

// Data (loaded at runtime via fetch to keep the bundle clean)
let config: GameConfig;
let manifest: CharacterManifest;
let scenesData: Scene[];
let eventsData: EventDef[];
let communitiesData: Community[];

let runner: SceneRunner | null = null;

// Character lookup map
let characterMap: Map<string, Character> = new Map();
// Portrait placeholder color lookup: assetKey → color
let portraitColors: Map<string, string> = new Map();

// ─── Boot ─────────────────────────────────────────────────────────────────────

async function boot(): Promise<void> {
  const root = document.getElementById('root');
  if (!root) throw new Error('No #root element found');

  // Build DOM skeleton
  const layout = initLayout(root);
  initScreens(document.body);

  // Load all data files in parallel
  [config, manifest, scenesData, eventsData, { communities: communitiesData }] =
    await Promise.all([
      fetch('/data/config.json').then((r) => r.json()) as Promise<GameConfig>,
      fetch('/data/characters.json').then((r) => r.json()) as Promise<CharacterManifest>,
      fetch('/data/scenes.json').then((r) => r.json()).then((d) => d.scenes) as Promise<Scene[]>,
      fetch('/data/events.json').then((r) => r.json()).then((d) => d.events) as Promise<EventDef[]>,
      fetch('/data/communities.json').then((r) => r.json()) as Promise<{ communities: Community[] }>,
    ]);

  // Register backgrounds for layout crossfade
  registerBackgrounds(manifest.backgrounds);

  // Build character map and portrait color map
  for (const char of manifest.characters) {
    characterMap.set(char.id, char);
  }
  for (const portrait of manifest.portraits) {
    portraitColors.set(portrait.key, portrait.placeholderColor);
  }

  // Init audio
  const persistent = loadPersistentData();
  Audio.init(manifest.audio, persistent.audioMuted, config.bgmCrossfadeDuration);

  // Init dialogue area
  initDialogue(layout.bottomBar, config);

  // Init HUD (hidden until game starts)
  initHUD(layout.sidebar, config.journeyStops);

  // Show title screen
  Audio.playBGM('bgm-title', false);
  setFullScreen();

  showTitleScreen(hasAutosave(), {
    onNewGame: () => {
      hideTitleScreen();
      startNewGame();
    },
    onContinue: () => {
      const state = loadFromSlot('auto');
      if (state) {
        hideTitleScreen();
        startGameFromState(state);
      }
    },
    onLoad: () => {
      showSaveLoadScreen('load', getSlotSummaries(), (slotId) => {
        const state = loadFromSlot(slotId);
        if (state) {
          hideSaveLoadScreen();
          hideTitleScreen();
          startGameFromState(state);
        }
      }, hideSaveLoadScreen);
    },
    onSettings: () => {
      showSettings(loadPersistentData(), {
        onToggleMute: (muted) => {
          Audio.setMuted(muted);
          savePersistentData({ ...loadPersistentData(), audioMuted: muted });
        },
        onToggleCutscenes: (setting) => {
          savePersistentData({ ...loadPersistentData(), cutscenesSetting: setting });
        },
        onClose: hideSettings,
      });
    },
  });

  // Resume audio after first gesture
  document.addEventListener('click', Audio.resumeAfterGesture, { once: true });

  // Dev-only hooks for the Playwright screenshot harness. These trigger migrated
  // UI surfaces that are otherwise balance-gated or deep in run flow — the comms
  // interrupt (needs a clock state unreachable in short runs), the ending shell
  // (the natural run flow stalls at the approach-event reward, an engine edge
  // case outside this presentation spec's scope), and a seeded autosave (so the
  // save/load confirm is reachable without a completed run). DEV-gated: stripped
  // from production builds, and they only drive presentation overlays and real
  // save-manager calls — no engine mechanics.
  const devEnv = (import.meta as { env?: { DEV?: boolean } }).env;
  if (devEnv?.DEV) {
    const sampleCommunities = [
      { community: { name: 'Georgetown Hydro' }, state: 'helped', stop: 1 },
      { community: { name: 'Foggy Bottom Relay' }, state: 'helped', stop: 2 },
      { community: { name: 'Silver Spring Junction' }, state: 'harmed', stop: 3 },
    ] as unknown as GameState['communities'];
    (window as unknown as {
      __wp?: {
        triggerComms: () => void;
        triggerEnding: () => void;
        seedAutosave: () => void;
      };
    }).__wp = {
      triggerComms: () => {
        showCommsOverlay("CHEN: Clock is climbing. What's your status?", () => {});
      },
      triggerEnding: () => {
        showEndingScreen('correction', { communities: sampleCommunities } as unknown as GameState, {
          onNewGame: () => {},
          onTitle: () => {},
        });
      },
      seedAutosave: () => {
        autosave(initNewGame(config, 1), 'scene-discovery-01', 'discovery');
      },
    };
  }
}

// ─── Game Start ───────────────────────────────────────────────────────────────

function startNewGame(): void {
  const persistent = loadPersistentData();
  persistent.runsStarted++;
  savePersistentData(persistent);

  const state = initNewGame(config, persistent.runsStarted);
  startGameFromState(state);
}

function startGameFromState(state: GameState): void {
  clearDialogue();

  const registry = buildSceneRegistry(scenesData, eventsData);

  const callbacks: SceneRunnerCallbacks = {
    onSceneStart(scene, currentState) {
      // Background
      setBackground(scene.background);

      // BGM change if specified on scene
      if (scene.bgm !== undefined && scene.bgm !== null) {
        Audio.playBGM(scene.bgm);
      }

      // Layout mode
      if (scene.flags?.showGameUI) {
        setGameUI();
      }

      // Update HUD
      updateStats(currentState);
      updateTimeline(currentState.currentStop, config.journeyStops, currentState.communities);

      // Run dialogue sequence
      if (scene.dialogue.length === 0) {
        runner?.sceneComplete(scene);
        return;
      }

      runDialogueSequence(scene, currentState, 0);
    },

    onStateUpdate(currentState) {
      updateStats(currentState);
      updateTimeline(currentState.currentStop, config.journeyStops, currentState.communities);
    },

    onRewardChoice(rewards: RewardOption[], onSelect: (index: number) => void) {
      showRewardOverlay(rewards, onSelect);
    },

    onEnding(endingType, currentState) {
      setFullScreen();
      clearDialogue();

      const persistent = loadPersistentData();
      if (!persistent.endingsSeen.includes(endingType)) {
        persistent.endingsSeen.push(endingType);
      }
      persistent.runsCompleted++;
      savePersistentData(persistent);

      Audio.playBGM('bgm-ending');

      showEndingScreen(endingType, currentState, {
        onNewGame: () => {
          hideEndingScreen();
          startNewGame();
        },
        onTitle: () => {
          hideEndingScreen();
          runner = null;
          Audio.playBGM('bgm-title', false);
          setFullScreen();
          showTitleScreen(hasAutosave(), {
            onNewGame: () => {
              hideTitleScreen();
              startNewGame();
            },
            onContinue: () => {
              const s = loadFromSlot('auto');
              if (s) { hideTitleScreen(); startGameFromState(s); }
            },
            onLoad: () => {
              showSaveLoadScreen('load', getSlotSummaries(), (slotId) => {
                const s = loadFromSlot(slotId);
                if (s) { hideSaveLoadScreen(); hideTitleScreen(); startGameFromState(s); }
              }, hideSaveLoadScreen);
            },
            onSettings: () => {
              showSettings(loadPersistentData(), {
                onToggleMute: (m) => { Audio.setMuted(m); savePersistentData({ ...loadPersistentData(), audioMuted: m }); },
                onToggleCutscenes: (s) => { savePersistentData({ ...loadPersistentData(), cutscenesSetting: s }); },
                onClose: hideSettings,
              });
            },
          });
        },
      });
    },

    onCommsInterrupt(currentState, onContinue) {
      const rapport = deriveRapport(currentState);
      const msg = rapport >= 0
        ? `CHEN: Clock is climbing. What's your status?`
        : `CHEN: Clock is climbing and I'm getting reports from the communities along your route. What's happening out there?`;
      showCommsOverlay(msg, onContinue);
    },
  };

  runner = new SceneRunner(
    state,
    config,
    registry,
    communitiesData,
    callbacks
  );

  runner.start();
}

// ─── Dialogue Sequencer ───────────────────────────────────────────────────────

function runDialogueSequence(
  scene: typeof scenesData[number],
  state: GameState,
  lineIndex: number
): void {
  if (lineIndex >= scene.dialogue.length) {
    // All lines done — show choices or complete scene
    if (scene.choices && scene.choices.length > 0) {
      const currentState = runner?.getState() ?? state;
      renderChoices(scene.choices, currentState, (choiceIndex) => {
        runner?.selectChoice(scene, choiceIndex);
      });
    } else {
      runner?.sceneComplete(scene);
      if (runner?.getState().activeEventId) {
        runner?.eventSceneComplete(scene.id);
      }
    }
    return;
  }

  const line = scene.dialogue[lineIndex]!;
  const character = characterMap.get(line.speaker) ?? null;

  // Handle per-line triggers
  if (line.background) setBackground(line.background);
  if (line.bgm) Audio.playBGM(line.bgm);
  if (line.sfx) Audio.playSFX(line.sfx);

  renderLine(line, character, portraitColors, () => {
    // Line complete — advance to next on next click
    runDialogueSequence(scene, state, lineIndex + 1);
  });
}

// ─── Start ────────────────────────────────────────────────────────────────────

boot().catch((err) => {
  console.error('[main] Boot failed:', err);
  document.body.innerHTML = `
    <div style="color:var(--gui-accent-danger,#ff3b30);font-family:var(--gui-font-mono,monospace);padding:40px">
      <h2>BOOT FAILURE</h2>
      <pre>${String(err)}</pre>
    </div>
  `;
});
