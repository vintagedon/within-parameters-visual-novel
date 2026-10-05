/**
 * Application entry point — bootstraps the engine and wires the UI.
 * Loads all data files in parallel, initializes all subsystems, then shows
 * the title screen. Each new game or loaded save creates a fresh SceneRunner.
 *
 * The dialogue sequencer (runDialogueSequence) is the bridge between the
 * SceneRunner callbacks and the dialogue/choice UI.
 */

import './styles.css';
import './ui/wp.css';

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
  CommsBeatsData,
  SaveSlot,
} from './types/index';

// Engine
import { initNewGame, deriveRapport } from './engine/game-state';
import { getRewardsForStop, applyReward } from './engine/event-system';
import {
  SceneRunner,
  buildSceneRegistry,
  slotResumeProblem,
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
import { createRunRng } from './engine/run-rng';
import {
  autosave,
  saveToSlot,
  loadFromSlot,
  loadSlot,
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
  showLoadRefusal,
  showEndingScreen,
  hideEndingScreen,
  showSettings,
  hideSettings,
  showRewardOverlay,
  showCommsOverlay,
  showDocumentOverlay,
  showDossierScreen,
  hideDossierScreen,
  type CommsLineView,
} from './ui/screens';
import { createStageHost } from './ui/stage';

// Audio
import * as Audio from './audio/audio-manager';

// Data (loaded at runtime via fetch to keep the bundle clean)
let config: GameConfig;
let manifest: CharacterManifest;
let scenesData: Scene[];
let eventsData: EventDef[];
let communitiesData: Community[];
let documentsData: FoundDocument[];
let commsBeatsData: CommsBeatsData;
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
  [config, manifest, scenesData, eventsData, { communities: communitiesData }, pool, documentsData, commsBeatsData] =
    await Promise.all([
      fetch('/data/config.json').then((r) => r.json()) as Promise<GameConfig>,
      fetch('/data/characters.json').then((r) => r.json()) as Promise<CharacterManifest>,
      fetch('/data/scenes.json').then((r) => r.json()).then((d) => d.scenes) as Promise<Scene[]>,
      fetch('/data/events.json').then((r) => r.json()).then((d) => d.events) as Promise<EventDef[]>,
      fetch('/data/communities.json').then((r) => r.json()) as Promise<{ communities: Community[] }>,
      fetch('/data/protagonist-pool.json').then((r) => r.json()).then(parseProtagonistPool) as Promise<ProtagonistPool>,
      fetch('/data/found-documents.json').then((r) => r.json()).then((d) => d.documents ?? []) as Promise<FoundDocument[]>,
      fetch('/data/comms-beats.json').then((r) => r.json()) as Promise<CommsBeatsData>,
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
  initHUD(layout.sidebar, config, () => openSaveMenu());

  // Show title screen
  Audio.playBGM('bgm-title', false);
  setFullScreen();

  showTitleScreen(hasAutosave(), {
    onNewGame: () => {
      hideTitleScreen();
      startNewGame();
    },
    onContinue: () => {
      loadSlotGuarded(loadSlot('auto'), () => {});
    },
    onLoad: () => {
      showSaveLoadScreen('load', getSlotSummaries(), (slotId) => {
        loadSlotGuarded(loadSlot(slotId), hideSaveLoadScreen);
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
      { community: { name: 'Georgetown Hydro', description: 'a water reclamation community dependent on surface-fed filtration' }, state: 'helped', stop: 1 },
      { community: { name: 'Foggy Bottom Relay', description: 'a transit workers\' cooperative maintaining the eastern tunnel network' }, state: 'helped', stop: 2 },
      { community: { name: 'Silver Spring Junction', description: 'a small trading post at the intersection of three major tunnel routes' }, state: 'harmed', stop: 3 },
    ] as unknown as GameState['communities'];
    (window as unknown as {
    __wp?: {
      triggerComms: () => void;
      triggerEnding: () => void;
      triggerReward: (caseName: string) => void;
      seedAutosave: () => void;
      setClock: (current: number) => void;
      setKnowledge: (knowledge: number) => void;
      stageFixture: () => void;
    };
    }).__wp = {
      triggerComms: () => {
        // Renders a real beat from the loaded data (amber, after stop 1) so
        // the surface is captured with production content.
        const tier = commsBeatsData.commsBeats.find((t) => t.id === 'amber');
        const beat = tier?.beats.find((b) => b.afterStop === 1) ?? tier?.beats[0];
        if (!beat) return;
        const lines: CommsLineView[] = beat.lines.map((line) => ({
          speaker:
            line.speaker === 'protagonist'
              ? 'RELAY-7'
              : characterMap.get(line.speaker)?.name ?? line.speaker.toUpperCase(),
          text: line.text,
        }));
        showCommsOverlay(lines, () => {});
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
      triggerReward: (caseName: string) => {
        // Boundary fixture (A2.3): renders the REAL reward overlay from the
        // real event data for a controlled (rapport, clock) state, and
        // applies the picked card through the REAL getRewardsForStop /
        // applyReward pair. A boundary fixture only — not natural-run
        // reachability evidence; no production hook (DEV-gated like the
        // other harness triggers).
        const event = eventsData.find((e) => e.rewards.some((r) => r.type === 'clock-reduction'));
        if (!event) return;
        const presets: Record<string, { rapport: number; clock: number }> = {
          remove: { rapport: 0, clock: 4 },
          zeroReduction: { rapport: -2, clock: 4 },
          negativeReduction: { rapport: -5, clock: 2 },
          clockEmpty: { rapport: 0, clock: 0 },
          capped: { rapport: 2, clock: 1 },
        };
        const preset = presets[caseName];
        if (!preset) return;
        const base = initNewGame(config, 1);
        const state: GameState = {
          ...base,
          stats: { ...base.stats, rapport: preset.rapport, startingRapport: preset.rapport },
          clock: { ...base.clock, current: preset.clock },
          communities: [],
        };
        const rewards = getRewardsForStop(event, state, config);
        refreshHud(state);
        showRewardOverlay(rewards, (index) => {
          const after = applyReward(rewards[index]!, state, config);
          refreshHud(after);
        });
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
      // Gate 5.4 isolated-host fixture: swaps the app root for the bare
      // stage host with representative (game-concept-free) controls, so the
      // stage-fit checks measure the host in isolation. DEV-gated like the
      // other harness hooks; stripped from production builds.
      stageFixture: () => {
        // Remove the app's screen overlays (mounted on body, some visible at
        // boot) so the bare host is the only hit-test target.
        document.body.querySelectorAll('.screen-overlay, #reward-overlay, #comms-overlay, #document-overlay').forEach((el) => el.remove());
        root.innerHTML = `
          <div class="wp-stage-host" id="stage-host">
            <div class="wp-stage" id="stage">
              <button class="gc-button wp-fixture-control" id="fx-center" style="position:absolute;left:936px;top:516px;" type="button">CENTER</button>
              <button class="gc-button wp-fixture-control" id="fx-topleft" style="position:absolute;left:48px;top:48px;" type="button">TOP LEFT</button>
              <button class="gc-button wp-fixture-control" id="fx-bottomright" style="position:absolute;left:1720px;top:984px;" type="button">BOTTOM RIGHT</button>
              <div class="gc-meter" data-shape="segmented" data-orientation="vertical" id="fx-vmeter" style="--gc-meter-count:10;position:absolute;left:100px;top:200px;width:56px;height:400px;">
                <div class="gc-meter__track"><div class="gc-meter__fill" style="--amount:0.4;"></div></div>
              </div>
              <div class="gc-meter" data-shape="continuous" id="fx-hmeter" style="position:absolute;left:400px;top:200px;width:600px;height:24px;">
                <div class="gc-meter__track"><div class="gc-meter__fill" style="--amount:0.6;"></div></div>
              </div>
              <p class="wp-fixture-text" id="fx-text" style="position:absolute;left:400px;top:300px;width:600px;">Stage host fixture text. The quick brown fox jumps over the lazy dog while measuring scale and input alignment.</p>
            </div>
          </div>
        `;
        const hostEl = document.getElementById('stage-host')!;
        const stageEl = document.getElementById('stage')!;
        const host = createStageHost({ host: hostEl, stage: stageEl });
        (window as unknown as { __wpStageHost?: unknown }).__wpStageHost = host;
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
  const registry = buildSceneRegistry(scenesData, eventsData, documentsData, commsBeatsData);
  clearDialogue();
  // New game: supply the chargen pool + the run's stateful RNG (one stream
  // for the protagonist roll and everything after it: pool shuffles,
  // community assignment, clock jitter). The Playwright harness sets
  // window.__wpSeed for deterministic captures; in normal play it is unset,
  // so the seed is time+random (truly random per run). No-op in production.
  const harnessSeed = (window as unknown as { __wpSeed?: number }).__wpSeed;
  const seed = harnessSeed ?? ((Date.now() ^ Math.floor(Math.random() * 1e9)) >>> 0);
  const runRng = createRunRng(seed);
  runner = new SceneRunner(state, config, registry, communitiesData, buildRunnerCallbacks(), {
    pool,
    rng: runRng,
  });
  runner.beginNewRun();
}

/** Resume path for CONTINUE/LOAD — does NOT regenerate the protagonist.
 *  Restores the journey presentation (sidebar, clock, stats, route, SAVE)
 *  and the journey audio: a loaded run renders and sounds exactly like one
 *  that never saved. Event scenes do not carry showGameUI, so the layout
 *  mode is set here, not left to the first loaded scene (amendment A1.2,
 *  review finding R2). Restore the latest scene-declared music from the
 *  saved history, including tracks inherited by later facility scenes.
 *  Do this instantly before the runner starts to avoid overlapping fades
 *  from title music and the resumed scene. */
function startGameFromState(state: GameState, slotEngine?: SaveSlot['engine']): void {
  clearDialogue();
  setGameUI();
  const registry = buildSceneRegistry(scenesData, eventsData, documentsData, commsBeatsData);
  const effConfig = effectiveConfigFromState(state);
  const runRng = createRunRng(0);
  runner = new SceneRunner(state, effConfig, registry, communitiesData, buildRunnerCallbacks(), undefined, runRng);
  const resumeBgm = [state.currentScene, ...state.sceneHistory.slice().reverse()]
    .map((id) => registry.scenes.get(id)?.bgm)
    .find((bgm): bgm is string => typeof bgm === 'string') ?? 'bgm-ambient';
  Audio.playBGM(resumeBgm, false);
  if (slotEngine) {
    runner.restoreEngine(slotEngine);
  }
  runner.start();
}

/**
 * Guard for every load entry point: refuse visibly (slot preserved) when the
 * slot cannot resume into this build's data, instead of crashing on restore
 * or resuming into a blank screen. Comms-window saves — including legacy
 * pre-amendment slots — resume through the stop transition and pass here.
 */
function slotCanBeResumed(slot: SaveSlot): boolean {
  return (
    slotResumeProblem(slot, {
      scenes: scenesData,
      events: eventsData,
      journeyStops: config.journeyStops,
    }) === null
  );
}

/** Loads a slot through the real entry points, refusing visibly when the
 *  slot cannot resume. The slot is never cleared or overwritten; the title
 *  screen and its LOAD control stay usable after a refusal. */
function loadSlotGuarded(slot: SaveSlot | null, afterRefusal: () => void): void {
  if (!slot) {
    afterRefusal();
    return;
  }
  const problem = slotResumeProblem(slot, {
    scenes: scenesData,
    events: eventsData,
    journeyStops: config.journeyStops,
  });
  if (problem !== null) {
    console.warn(`[main] load refused: ${problem}`);
    showLoadRefusal(problem, afterRefusal);
    return;
  }
  hideSaveLoadScreen();
  hideTitleScreen();
  startGameFromState(slot.state, slot.engine);
}

/** Manual save surface (gate 4.7): reachable from the HUD during a run. */
function openSaveMenu(): void {
  if (!runner) return;
  showSaveLoadScreen('save', getSlotSummaries(), (slotId) => {
    if (slotId === 'auto') return; // autosave slot is not manually writable
    const state = runner!.getState();
    saveToSlot(
      slotId,
      state,
      state.currentScene,
      state.currentBeat,
      runner!.snapshot() ?? undefined
    );
    hideSaveLoadScreen();
  }, hideSaveLoadScreen);
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
                loadSlotGuarded(loadSlot('auto'), () => {});
              },
              onLoad: () => {
                showSaveLoadScreen('load', getSlotSummaries(), (slotId) => {
                  loadSlotGuarded(loadSlot(slotId), hideSaveLoadScreen);
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

    onCommsInterrupt(currentState, beat, _tierId, onContinue) {
      // Comms speakers keep the callsign: Jay addresses RELAY-7 and the
      // protagonist's rolled name never appears on the comms channel.
      const lines: CommsLineView[] = beat.lines.map((line) => ({
        speaker:
          line.speaker === 'protagonist'
            ? currentState.protagonist.callsign
            : characterMap.get(line.speaker)?.name ?? line.speaker.toUpperCase(),
        text: line.text,
      }));
      showCommsOverlay(lines, onContinue);
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
  let character = characterMap.get(line.speaker) ?? null;

  // Internal-monologue headers carry the generated protagonist's first name
  // (character-generation.md: headers are "[First]:"). Comms channels keep
  // the RELAY-7 callsign, and the dialogue bar shows no protagonist portrait
  // (updatePortrait), so this is the only protagonist-name surface here.
  if (line.speaker === 'protagonist' && state.protagonist.name) {
    const first = state.protagonist.name.split(' ')[0] ?? null;
    if (first && character) {
      character = { ...character, name: first };
    }
  }

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
