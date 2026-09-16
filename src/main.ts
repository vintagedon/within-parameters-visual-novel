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
  FoundDocument,
} from './types/index';

// Engine
import { initNewGame, deriveRapport } from './engine/game-state';
import {
  SceneRunner,
  buildSceneRegistry,
  type SceneRunnerCallbacks,
} from './engine/scene-runner';
import { buildEffectiveConfig } from './engine/traits';
import {
  generateProtagonist,
  buildDossierView,
  parseProtagonistPool,
  type ProtagonistPool,
} from './engine/chargen';
import { createRng } from './engine/rng';
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
  showDocumentOverlay,
  showDossierScreen,
  hideDossierScreen,
} from './ui/screens';

// Audio
import * as Audio from './audio/audio-manager';

// Data (loaded at runtime via fetch to keep the bundle clean)
let config: GameConfig;
let manifest: CharacterManifest;
let scenesData: Scene[];
let eventsData: EventDef[];
let communitiesData: Community[];
let documentsData: FoundDocument[];
let pool: ProtagonistPool;

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
  [config, manifest, scenesData, eventsData, { communities: communitiesData }, pool, documentsData] =
    await Promise.all([
      fetch('/data/config.json').then((r) => r.json()) as Promise<GameConfig>,
      fetch('/data/characters.json').then((r) => r.json()) as Promise<CharacterManifest>,
      fetch('/data/scenes.json').then((r) => r.json()).then((d) => d.scenes) as Promise<Scene[]>,
      fetch('/data/events.json').then((r) => r.json()).then((d) => d.events) as Promise<EventDef[]>,
      fetch('/data/communities.json').then((r) => r.json()) as Promise<{ communities: Community[] }>,
      fetch('/data/protagonist-pool.json').then((r) => r.json()).then(parseProtagonistPool) as Promise<ProtagonistPool>,
      fetch('/data/found-documents.json').then((r) => r.json()).then((d) => d.documents ?? []) as Promise<FoundDocument[]>,
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
  initHUD(layout.sidebar, config);

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
        setClock: (current: number) => void;
        setKnowledge: (knowledge: number) => void;
      };
    }).__wp = {
      triggerComms: () => {
        showCommsOverlay("CHEN: Clock is climbing. What's your status?", () => {});
      },
      triggerEnding: () => {
        // Build a representative complete run state (committed protagonist,
        // rerollCount=1 so the penalty line shows, final stats, and an outcome)
        // so the new score breakdown — grade, components, reroll penalty, and
        // backstory + trait lines — renders for capture.
        const r = createRng(1337);
        const protagonist = generateProtagonist(pool, r);
        const effConfig = buildEffectiveConfig(
          config,
          protagonist.positiveTrait!,
          protagonist.negativeTrait!
        );
        const hookState: GameState = {
          ...initNewGame(effConfig, 1),
          protagonist,
          rerollCount: 1,
          stats: { knowledge: 13, consumables: 4, rapport: 2, startingRapport: 0 },
          communities: sampleCommunities,
          clock: { current: 4, max: config.clockMax },
          alive: true,
        };
        showEndingScreen('correction', hookState, { config: effConfig, pool }, {
          onNewGame: () => {},
          onTitle: () => {},
        });
      },
      seedAutosave: () => {
        autosave(initNewGame(config, 1), 'scene-discovery-01', 'discovery');
      },
      // Presentation probes: re-render the HUD through the real refreshHud
      // path with a clock or knowledge override, so urgency accents and the
      // threshold display are verifiable at values a short walk never reaches.
      setClock: (current: number) => {
        const s = runner?.getState();
        if (!s) return;
        refreshHud({ ...s, clock: { ...s.clock, current } });
      },
      setKnowledge: (knowledge: number) => {
        const s = runner?.getState();
        if (!s) return;
        refreshHud({ ...s, stats: { ...s.stats, knowledge } });
      },
    };
  }
}

// ─── Game Start ───────────────────────────────────────────────────────────────

/**
 * Re-derives the effective (trait-modified) config from a committed protagonist.
 * Reproduces exactly what the runner's deployProtagonist() computed at run start,
 * so a loaded save resumes with the same effective config and the ending-screen
 * breakdown matches the run's recorded outcome.
 */
function effectiveConfigFromState(state: GameState): GameConfig {
  const p = state.protagonist;
  if (p.positiveTrait && p.negativeTrait) {
    return buildEffectiveConfig(config, p.positiveTrait, p.negativeTrait);
  }
  return config;
}

/** Single HUD refresh path: stats against the run's effective knowledge
 *  threshold, plus the journey timeline. When a runner is live its effective
 *  config is the display authority — the same object the resolver and the
 *  ending determination read — so the bar and the ending gate cannot diverge
 *  (including under threshold-modifying traits like Clear-Headed). */
function refreshHud(state: GameState): void {
  const effConfig = runner?.getEffectiveConfig() ?? effectiveConfigFromState(state);
  updateStats(state, effConfig.knowledgeThreshold);
  updateTimeline(state.currentStop, config.journeyStops, state.communities);
}

function startNewGame(): void {
  const persistent = loadPersistentData();
  persistent.runsStarted++;
  savePersistentData(persistent);

  const state = initNewGame(config, persistent.runsStarted);
  const registry = buildSceneRegistry(scenesData, eventsData, documentsData);
  clearDialogue();
  // New game: supply the chargen pool + a seeded RNG so the runner can roll a
  // protagonist and show the dossier before the lore card. The Playwright harness
  // sets window.__wpSeed for deterministic captures; in normal play it is unset,
  // so the seed is time+random (truly random per run). No-op in production.
  const harnessSeed = (window as unknown as { __wpSeed?: number }).__wpSeed;
  const seed = harnessSeed ?? ((Date.now() ^ Math.floor(Math.random() * 1e9)) >>> 0);
  runner = new SceneRunner(state, config, registry, communitiesData, buildRunnerCallbacks(), {
    pool,
    rng: createRng(seed),
  });
  runner.beginNewRun();
}

/** Resume path for CONTINUE/LOAD — does NOT regenerate the protagonist. */
function startGameFromState(state: GameState): void {
  clearDialogue();
  const registry = buildSceneRegistry(scenesData, eventsData, documentsData);
  const effConfig = effectiveConfigFromState(state);
  runner = new SceneRunner(state, effConfig, registry, communitiesData, buildRunnerCallbacks());
  runner.start();
}

function buildRunnerCallbacks(): SceneRunnerCallbacks {
  return {
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
      refreshHud(currentState);

      // Run dialogue sequence
      if (scene.dialogue.length === 0) {
        runner?.sceneComplete(scene);
        return;
      }

      runDialogueSequence(scene, currentState, 0);
    },

    onStateUpdate(currentState) {
      refreshHud(currentState);
    },

    onRewardChoice(rewards: RewardOption[], onSelect: (index: number) => void) {
      showRewardOverlay(rewards, onSelect);
    },

    onDossier(candidate, rerollCount, actions) {
      const view = buildDossierView(candidate, pool, config, portraitColors, rerollCount);
      showDossierScreen(view, { onDeploy: actions.deploy, onReroll: actions.reroll });
    },

    onDossierHide() {
      hideDossierScreen();
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

      // Pass the effective config so the breakdown matches the run's outcome.
      showEndingScreen(
        endingType,
        currentState,
        { config: effectiveConfigFromState(currentState), pool },
        {
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
        }
      );
    },

    onCommsInterrupt(currentState, onContinue) {
      const rapport = deriveRapport(currentState);
      const msg = rapport >= 0
        ? `CHEN: Clock is climbing. What's your status?`
        : `CHEN: Clock is climbing and I'm getting reports from the communities along your route. What's happening out there?`;
      showCommsOverlay(msg, onContinue);
    },

    onFoundDocument(doc, onContinue) {
      showDocumentOverlay(doc, onContinue);
    },
  };
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
      // Runner-resolved views: effective costs, gates, and trait restrictions.
      // Falls back to plain labels only when no runner exists (not reachable
      // in normal play; keeps the function total).
      const views = runner?.getChoiceViews(scene) ?? scene.choices.map((c, i) => ({
        index: i,
        label: c.label,
        enabled: true,
      }));
      renderChoices(views, (choiceIndex) => {
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
