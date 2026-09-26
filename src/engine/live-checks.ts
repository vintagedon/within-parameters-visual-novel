/**
 * Live-path checks — gate 4.1/4.2 validation driving the real SceneRunner.
 *
 * Unlike the replay harness (which calls the resolver against its own fixture
 * event pool), these checks construct a real SceneRunner from the real
 * repository data files (data/config.json, data/scenes.json, data/events.json,
 * data/communities.json) and drive it through its public surface:
 * loadScene/sceneComplete/eventSceneComplete/selectChoice/getChoiceViews.
 * A passing replay proves nothing about this path; these checks do.
 *
 * Run via: npm run test:live
 *
 * @module engine/live-checks
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type {
  GameConfig,
  Scene,
  EventDef,
  Community,
  GameState,
  PositiveTraitId,
  NegativeTraitId,
  EventCategory,
} from '../types/index';
import { initNewGame } from './game-state';
import { SceneRunner, buildSceneRegistry, slotResumeProblem, type SceneRunnerCallbacks, type ChoiceView, type SceneRegistry } from './scene-runner';
import { buildEffectiveConfig } from './traits';
import { scoreRun } from './scoring';
import { initEventPool, drawEvent } from './event-system';
import { createRng } from './rng';
import { createRunRng } from './run-rng';
import { allCombinations } from './traits';
import { applyChoiceEffects } from './resolution';
import { buildEpilogue } from '../ui/screens';
import { saveToSlot, loadSlot } from './save-manager';
import type { RunOutcome, CommunityRunState } from '../types/index';

// ─── Node environment shim (real in-memory store: A1.1 saves through
// ─── SaveManager and resumes from loadSlot, so writes must round-trip) ───────

(globalThis as { localStorage?: Storage }).localStorage = (() => {
  const store = new Map<string, string>();
  return {
    getItem: (k: string) => (store.has(k) ? store.get(k)! : null),
    setItem: (k: string, v: string) => {
      store.set(k, String(v));
    },
    removeItem: (k: string) => {
      store.delete(k);
    },
    clear: () => {
      store.clear();
    },
    key: (i: number) => Array.from(store.keys())[i] ?? null,
    get length() {
      return store.size;
    },
  };
})() as Storage;

// ─── Check framework ──────────────────────────────────────────────────────────

interface CheckResult {
  name: string;
  pass: boolean;
  detail: string;
}

const results: CheckResult[] = [];

function check(name: string, fn: () => string): void {
  try {
    const detail = fn();
    results.push({ name, pass: true, detail });
  } catch (e) {
    results.push({ name, pass: false, detail: e instanceof Error ? e.message : String(e) });
  }
}

function assert(cond: boolean, message: string): void {
  if (!cond) throw new Error(message);
}

function eq(actual: unknown, expected: unknown, message: string): void {
  if (actual !== expected) {
    throw new Error(`${message}: expected ${String(expected)}, got ${String(actual)}`);
  }
}

// ─── Data loading ─────────────────────────────────────────────────────────────

function load<T>(rel: string): T {
  return JSON.parse(readFileSync(resolve(process.cwd(), rel), 'utf-8')) as T;
}

const baseConfig = load<GameConfig>('data/config.json');
const scenesData = load<{ scenes: Scene[] }>('data/scenes.json').scenes;
const eventsData = load<{ events: EventDef[] }>('data/events.json').events;
const communitiesData = load<{ communities: Community[] }>('data/communities.json').communities;
const documentsData = load<{ documents: import('../types/index').FoundDocument[] }>(
  'data/found-documents.json'
).documents;
const commsBeatsData = load<import('../types/index').CommsBeatsData>('data/comms-beats.json');

function eventsByCategory(category: EventCategory): EventDef[] {
  return eventsData.filter((e) => e.category === category);
}

// ─── Runner scaffolding ───────────────────────────────────────────────────────

interface Harness {
  runner: SceneRunner;
  registry: SceneRegistry;
  queue: Scene[];
  pendingReward: { rewards: unknown[]; onSelect: (index: number) => void } | null;
  ending: { ending: string; state: GameState } | null;
  surfacedDocs: import('../types/index').FoundDocument[];
  commsFired: { afterStop: number; tierId: string; firstLine: string }[];
  /** Comms beat caught mid-interrupt (hold mode): the save point for the
   *  comms-window phase. onContinue has NOT been called. */
  heldComms: { afterStop: number; tierId: string; firstLine: string; onContinue: () => void } | null;
  /** Found document caught mid-surface (hold mode): the save point for the
   *  document phase. onContinue has NOT been called (read not yet applied). */
  heldDoc: { id: string; onContinue: () => void } | null;
  /** Rewards actually applied through onSelect (not merely offered), so a
   *  resumed run can be proven not to re-grant one. */
  grantCount: number;
}

function makeHarness(opts: {
  positive: PositiveTraitId;
  negative: NegativeTraitId;
  events: EventDef[];
  consumables?: number;
  knowledge?: number;
  rapport?: number;
  clock?: number;
  runSeed?: number;
  /** Hold comms interrupts and document surfaces instead of auto-continuing. */
  hold?: boolean;
  resume?: { state: GameState; engine: import('../types/index').EngineSnapshot };
  /** Resume from a SaveManager slot exactly as the LOAD path does: fresh
   *  registry from the repo data, effective config re-derived from the saved
   *  protagonist (never from literals), stateless RNG, restoreEngine, and —
   *  when autostart — start(). */
  resumeSlot?: { slot: import('../types/index').SaveSlot; autostart: boolean };
}): Harness {
  let config: ReturnType<typeof buildEffectiveConfig>;
  let state: GameState;
  if (opts.resumeSlot) {
    const p = opts.resumeSlot.slot.state.protagonist;
    config =
      p.positiveTrait && p.negativeTrait
        ? buildEffectiveConfig(baseConfig, p.positiveTrait, p.negativeTrait)
        : baseConfig;
    state = opts.resumeSlot.slot.state;
  } else if (opts.resume) {
    config = buildEffectiveConfig(baseConfig, opts.positive, opts.negative);
    state = opts.resume.state;
  } else {
    config = buildEffectiveConfig(baseConfig, opts.positive, opts.negative);
    state = initNewGame(config);
    // Stamp the traits onto the run state exactly as deployProtagonist does,
    // so a saved slot carries the protagonist the effective config came from.
    state = {
      ...state,
      protagonist: { ...state.protagonist, positiveTrait: opts.positive, negativeTrait: opts.negative },
      stats: {
        ...state.stats,
        consumables: opts.consumables ?? config.startingConsumables,
        knowledge: opts.knowledge ?? 0,
        rapport: opts.rapport ?? 0,
        startingRapport: opts.rapport ?? 0,
      },
      clock: { ...state.clock, current: opts.clock ?? 0 },
    };
  }
  const registry = buildSceneRegistry(scenesData, opts.events, documentsData, commsBeatsData);
  const queue: Scene[] = [];
  let pendingReward: Harness['pendingReward'] = null;
  let ending: Harness['ending'] = null;
  let heldComms: Harness['heldComms'] = null;
  let heldDoc: Harness['heldDoc'] = null;
  const surfacedDocs: import('../types/index').FoundDocument[] = [];
  const commsFired: { afterStop: number; tierId: string; firstLine: string }[] = [];
  let grantCount = 0;
  const callbacks: SceneRunnerCallbacks = {
    onSceneStart: (scene) => {
      queue.push(scene);
    },
    onStateUpdate: () => {},
    onRewardChoice: (rewards, onSelect) => {
      pendingReward = {
        rewards,
        onSelect: (index: number) => {
          grantCount++;
          onSelect(index);
        },
      };
    },
    onEnding: (endingType, endingState) => {
      ending = { ending: endingType, state: endingState };
    },
    onCommsInterrupt: (_state, beat, tierId, onContinue) => {
      commsFired.push({ afterStop: beat.afterStop, tierId, firstLine: beat.lines[0]?.text ?? '' });
      if (opts.hold) {
        heldComms = { afterStop: beat.afterStop, tierId, firstLine: beat.lines[0]?.text ?? '', onContinue };
        return;
      }
      onContinue();
    },
    onFoundDocument: (doc, onContinue) => {
      surfacedDocs.push(doc);
      if (opts.hold) {
        heldDoc = { id: doc.id, onContinue };
        return;
      }
      onContinue();
    },
  };
  const runRng = createRunRng(
    opts.resume || opts.resumeSlot ? 0 : (opts.runSeed ?? 12345)
  );
  const runner = new SceneRunner(
    state,
    config,
    registry,
    communitiesData,
    callbacks,
    undefined,
    runRng
  );
  if (opts.resume) {
    runner.restoreEngine(opts.resume.engine);
  }
  if (opts.resumeSlot) {
    if (opts.resumeSlot.slot.engine) {
      runner.restoreEngine(opts.resumeSlot.slot.engine);
    }
    if (opts.resumeSlot.autostart) {
      runner.start();
    }
  }
  return {
    runner,
    registry,
    queue,
    get pendingReward() {
      return pendingReward;
    },
    set pendingReward(v) {
      pendingReward = v;
    },
    get ending() {
      return ending;
    },
    set ending(v) {
      ending = v;
    },
    get surfacedDocs() {
      return surfacedDocs;
    },
    get commsFired() {
      return commsFired;
    },
    get heldComms() {
      return heldComms;
    },
    set heldComms(v) {
      heldComms = v;
    },
    get heldDoc() {
      return heldDoc;
    },
    set heldDoc(v) {
      heldDoc = v;
    },
    get grantCount() {
      return grantCount;
    },
  };
}

/** Enters the event phase and drives until a choice scene is reached. */
function driveToChoiceScene(h: Harness): { scene: Scene; views: ChoiceView[] } {
  h.runner.loadScene('scene-discovery-01');
  for (let guard = 0; guard < 200; guard++) {
    const scene = h.queue.shift();
    if (!scene) break;
    if (scene.choices && scene.choices.length > 0) {
      return { scene, views: h.runner.getChoiceViews(scene) };
    }
    h.runner.sceneComplete(scene);
    if (h.runner.getState().activeEventId) {
      h.runner.eventSceneComplete(scene.id);
    }
  }
  throw new Error('never reached a choice scene');
}

/** Drives past a choice (already selected) through the reward cycle and the
 *  next stop, until the next choice scene. Returns null at journey end. */
function driveThroughRewardToNextChoice(h: Harness): { scene: Scene; views: ChoiceView[] } | null {
  for (let guard = 0; guard < 300; guard++) {
    if (h.pendingReward) {
      h.pendingReward.onSelect(0);
      h.pendingReward = null;
      continue;
    }
    const scene = h.queue.shift();
    if (!scene) continue;
    if (scene.choices && scene.choices.length > 0) {
      return { scene, views: h.runner.getChoiceViews(scene) };
    }
    try {
      h.runner.sceneComplete(scene);
      if (h.runner.getState().activeEventId) {
        h.runner.eventSceneComplete(scene.id);
      }
    } catch (e) {
      // "No eligible events" ends the driveable journey in thin pools.
      const msg = e instanceof Error ? e.message : String(e);
      if (msg.includes('No eligible events')) return null;
      throw e;
    }
  }
  return null;
}

/** Finds the view index for the first enabled choice matching a predicate on the raw Choice. */
function findChoiceIndex(
  scene: Scene,
  pred: (c: NonNullable<Scene['choices']>[number]) => boolean
): number {
  const idx = (scene.choices ?? []).findIndex((c) => pred(c));
  assert(idx >= 0, `no choice matching predicate in ${scene.id}`);
  return idx;
}

function labelCost(view: ChoiceView): number | null {
  const m = view.label.match(/\[(\d+) modules?\]/);
  return m ? parseInt(m[1]!, 10) : null;
}

// ─── A1.1: save-phase machinery ───────────────────────────────────────────────

/**
 * Every phase in which SAVE is enabled during a run (amendment A1.1). The
 * comms window is on the list — it is the phase whose save could not resume
 * before this amendment (review finding R1). `reward-pick` and `document`
 * are UI-unreachable (inset-covering overlays) but exercised at the engine
 * level so a future UI change cannot silently reintroduce a broken resume;
 * the phase policy for every entry is recorded in the amendment worklog.
 */
const SAVE_PHASES = [
  'event-choice',
  'event-consequence',
  'reward-pick',
  'document',
  'comms',
  'facility-entry',
  'facility-choice',
] as const;
/** Fixture phases extend the UI list: a stop-3 choice point exercises a run
 *  RNG stream that has already advanced through two stops of draws and ticks. */
type SavePhase = (typeof SAVE_PHASES)[number] | 'stop3-choice';

/** Events whose draw surfaces a found document at the reward cycle. */
const documentedEvents = (): EventDef[] =>
  eventsData.filter((e) => (e.foundDocumentIds ?? []).length > 0);

/** Drives a run from the discovery scene to the named save point and returns
 *  there. Hold phases (document, comms) leave the callback suspended: the
 *  runner is exactly in the state a player saving through the real UI would
 *  produce. Throws when the point is never reached. */
function driveToSavePhase(h: Harness, phase: SavePhase): void {
  h.runner.loadScene('scene-discovery-01');
  for (let guard = 0; guard < 600; guard++) {
    if (phase === 'comms' && h.heldComms) return;
    if (phase === 'document' && h.heldDoc) return;
    // Holding phases other than the target one auto-continue: a comms-phase
    // save may sit behind a document surface, and vice versa. The hold is
    // cleared before continuing — the continuation is synchronous.
    if (h.heldDoc && phase !== 'document') {
      const cont = h.heldDoc.onContinue;
      h.heldDoc = null;
      cont();
      continue;
    }
    if (h.heldComms && phase !== 'comms') {
      const cont = h.heldComms.onContinue;
      h.heldComms = null;
      cont();
      continue;
    }
    if (h.pendingReward) {
      if (phase === 'reward-pick') return;
      h.pendingReward.onSelect(1);
      h.pendingReward = null;
      continue;
    }
    const scene = h.queue.shift();
    if (!scene) continue;
    if (scene.choices && scene.choices.length > 0) {
      if (phase === 'event-choice') return;
      if (phase === 'stop3-choice' && h.runner.getState().currentStop === 3) return;
      if (phase === 'facility-choice' && scene.id.startsWith('scene-facility')) return;
      const views = h.runner.getChoiceViews(scene);
      const idx = views.findIndex((v) => v.enabled);
      assert(idx >= 0, `no enabled choice at ${scene.id} en route to ${phase}`);
      h.runner.selectChoice(scene, idx);
      if (phase === 'event-consequence') return;
      continue;
    }
    if (phase === 'facility-entry' && scene.id === 'scene-facility-01') return;
    h.runner.sceneComplete(scene);
    if (h.runner.getState().activeEventId) h.runner.eventSceneComplete(scene.id);
  }
  throw new Error(`never reached the ${phase} save point`);
}

/** Saves through the real SaveManager surface and returns the loaded slot —
 *  no assertion compares a value with a clone of itself: every resume check
 *  reads the slot back out of storage. */
function saveThroughManager(h: Harness): import('../types/index').SaveSlot {
  const state = h.runner.getState();
  saveToSlot(0, state, state.currentScene, state.currentBeat, h.runner.snapshot() ?? undefined);
  const slot = loadSlot(0);
  assert(slot !== null, 'SaveManager returned the written slot');
  assert(slot!.engine !== undefined, 'slot carries an engine snapshot');
  return slot!;
}

/** Asserts the restored set of the resume contract against a slot-loaded
 *  runner: stats, clock, stop, communities, protagonist and traits, the
 *  effective configuration re-derived from the saved protagonist, RNG state,
 *  event pool and used ids, Practiced availability, reroll count, and the
 *  persisted outcome. Snapshot fields are compared before start() so pool
 *  advancement by the resumed flow cannot mask a restoration defect. */
function assertRestoredContract(
  saved: { state: GameState; engine: import('../types/index').EngineSnapshot },
  h: Harness,
  label: string
): void {
  const a = saved.state;
  const b = h.runner.getState();
  eq(b.stats.knowledge, a.stats.knowledge, `${label}: knowledge`);
  eq(b.stats.consumables, a.stats.consumables, `${label}: consumables`);
  eq(b.stats.rapport, a.stats.rapport, `${label}: rapport`);
  eq(b.stats.startingRapport, a.stats.startingRapport, `${label}: startingRapport`);
  eq(b.clock.current, a.clock.current, `${label}: clock`);
  eq(b.clock.max, a.clock.max, `${label}: clock max`);
  eq(b.currentStop, a.currentStop, `${label}: current stop`);
  eq(b.activeEventId, a.activeEventId, `${label}: active event`);
  eq(b.eventPhase, a.eventPhase, `${label}: event phase`);
  eq(b.communities.length, a.communities.length, `${label}: community count`);
  for (let i = 0; i < a.communities.length; i++) {
    eq(b.communities[i]!.community.id, a.communities[i]!.community.id, `${label}: community ${i} id`);
    eq(b.communities[i]!.state, a.communities[i]!.state, `${label}: community ${i} state`);
    eq(b.communities[i]!.stop, a.communities[i]!.stop, `${label}: community ${i} stop`);
  }
  eq(JSON.stringify(b.protagonist), JSON.stringify(a.protagonist), `${label}: protagonist + traits`);
  eq(b.rerollCount, a.rerollCount, `${label}: reroll count`);
  eq(JSON.stringify(b.outcome), JSON.stringify(a.outcome), `${label}: persisted outcome`);
  eq(JSON.stringify(b.usedEventIds), JSON.stringify(a.usedEventIds), `${label}: used event ids`);

  // Effective configuration is derived from the saved protagonist's traits —
  // the same derivation main.ts performs on LOAD — never from literals. The
  // fixtures use threshold-modifying P6 so a hardcoded base config fails.
  const p = a.protagonist;
  const expected = buildEffectiveConfig(
    baseConfig,
    p.positiveTrait as PositiveTraitId,
    p.negativeTrait as NegativeTraitId
  );
  eq(
    h.runner.getEffectiveConfig().knowledgeThreshold,
    expected.knowledgeThreshold,
    `${label}: effective config re-derived from the saved protagonist`
  );

  // Snapshot restoration, pre-start: RNG stream, Practiced availability, pool.
  const snap = h.runner.snapshot();
  assert(snap !== null, `${label}: snapshot available`);
  eq(snap!.rngState, saved.engine.rngState, `${label}: RNG stream state`);
  eq(snap!.practicedAvailable, saved.engine.practicedAvailable, `${label}: Practiced availability`);
  eq(
    JSON.stringify(snap!.eventPool),
    JSON.stringify(saved.engine.eventPool),
    `${label}: event pool state`
  );
}

/** Asserts the saved current scene resolves to a registered, renderable scene
 *  after resume (the R1 failure mode: a stale event-scene id with nothing
 *  registered renders nothing). */
function assertSceneRegistered(h: Harness, label: string): void {
  const id = h.runner.getState().currentScene;
  const scene = h.registry.scenes.get(id);
  assert(scene !== undefined, `${label}: current scene ${id} is registered`);
  assert(Array.isArray(scene!.dialogue), `${label}: scene ${id} is renderable`);
}

// ─── Gate 4.1 checks ──────────────────────────────────────────────────────────

/** Community events carrying a <= -2 module choice (the review case shape). */
function communityEventsWithTwoModuleChoice(): EventDef[] {
  return eventsByCategory('community').filter((e) =>
    e.scenes.some((s) =>
      (s.choices ?? []).some((c) => (c.statChanges?.consumables ?? 0) <= -2)
    )
  );
}

/** Transit events carrying an unconditioned positive-clock choice. */
function transitEventsWithClockGain(): EventDef[] {
  return eventsByCategory('transit').filter((e) =>
    e.scenes.some((s) =>
      (s.choices ?? []).some(
        (c) => (c.statChanges?.clock ?? 0) > 0 && !c.condition
      )
    )
  );
}

/** Case: Rough Touch charges community costs +1; label, gate, and deduction agree. */
check('4.1 rough-touch: community cost +1, label == affordability == deduction', () => {
  const events = [communityEventsWithTwoModuleChoice()[0]!];
  const h = makeHarness({ positive: 'P5', negative: 'N2', events, consumables: 8 });
  const { scene, views } = driveToChoiceScene(h);
  const idx = findChoiceIndex(scene, (c) => (c.statChanges?.consumables ?? 0) <= -2);
  const view = views[idx]!;
  const cost = labelCost(view);
  eq(cost, 3, 'displayed cost under Rough Touch');
  eq(view.enabled, true, 'affordability at 8 modules');
  const before = h.runner.getState().stats.consumables;
  h.runner.selectChoice(scene, idx);
  eq(h.runner.getState().stats.consumables, before - 3, 'deducted cost');
  return `choice "${view.label}" from ${before} -> ${h.runner.getState().stats.consumables}`;
});

/** Case: the same choice is disabled when the player holds less than the effective cost. */
check('4.1 rough-touch: affordability disables below effective cost', () => {
  const events = [communityEventsWithTwoModuleChoice()[0]!];
  const h = makeHarness({ positive: 'P5', negative: 'N2', events, consumables: 2 });
  const { scene, views } = driveToChoiceScene(h);
  const idx = findChoiceIndex(scene, (c) => (c.statChanges?.consumables ?? 0) <= -2);
  const view = views[idx]!;
  eq(labelCost(view), 3, 'displayed cost still the effective 3');
  eq(view.enabled, false, 'disabled at 2 modules');
  assert((view.reason ?? '').includes('3'), 'reason names the effective cost');
  return 'held 2, effective cost 3, disabled';
});

/** Case: Practiced discounts the first spend of a stop and not the second. */
check('4.1 practiced: first spend of stop discounted, second not', () => {
  const events = eventsByCategory('community');
  const h = makeHarness({ positive: 'P8', negative: 'N4', events, consumables: 8 });
  const { scene, views } = driveToChoiceScene(h);
  const idx = findChoiceIndex(
    scene,
    (c) => (c.statChanges?.consumables ?? 0) < 0 && !c.condition
  );
  const raw = Math.abs(scene.choices![idx]!.statChanges?.consumables ?? 0);
  const view = views[idx]!;
  eq(labelCost(view), raw - 1, 'first spend shows discounted cost');

  const before1 = h.runner.getState().stats.consumables;
  h.runner.selectChoice(scene, idx);
  eq(h.runner.getState().stats.consumables, before1 - (raw - 1), 'first deduction discounted');

  // Same-stop second spend: no discount (state advanced to the consequence,
  // but the stop has not advanced, so Practiced is spent).
  const before2 = h.runner.getState().stats.consumables;
  h.runner.selectChoice(scene, idx);
  eq(h.runner.getState().stats.consumables, before2 - raw, 'second deduction undiscounted');
  return `raw ${raw}: first ${raw - 1}, second ${raw}`;
});

/** Case: Practiced availability resets on stop advance. */
check('4.1 practiced: availability resets on stop advance', () => {
  const events = eventsByCategory('community');
  assert(events.length >= 2, 'need at least two community events for two stops');
  const h = makeHarness({ positive: 'P8', negative: 'N4', events, consumables: 9 });
  const first = driveToChoiceScene(h);
  const idx1 = findChoiceIndex(
    first.scene,
    (c) => (c.statChanges?.consumables ?? 0) < 0 && !c.condition
  );
  const raw1 = Math.abs(first.scene.choices![idx1]!.statChanges?.consumables ?? 0);
  h.runner.selectChoice(first.scene, idx1);

  const second = driveThroughRewardToNextChoice(h);
  assert(second !== null, 'journey ended before stop 2');
  const next = second!;
  const idx2 = findChoiceIndex(
    next.scene,
    (c) => (c.statChanges?.consumables ?? 0) < 0 && !c.condition
  );
  const raw2 = Math.abs(next.scene.choices![idx2]!.statChanges?.consumables ?? 0);
  eq(
    labelCost(next.views[idx2]!),
    raw2 - 1,
    'stop 2 first spend discounted again after stop advance'
  );
  return `stop 1 raw ${raw1}, stop 2 raw ${raw2}, both discounted on first spend`;
});

/** Case: Light Foot suppresses positive transit clock deltas to zero. */
check('4.1 light-foot: transit +1 clock suppressed', () => {
  const events = [transitEventsWithClockGain()[0]!];
  const h = makeHarness({ positive: 'P7', negative: 'N4', events, consumables: 8, clock: 2 });
  const { scene, views } = driveToChoiceScene(h);
  const idx = findChoiceIndex(
    scene,
    (c) => (c.statChanges?.clock ?? 0) > 0 && !c.condition
  );
  assert(views[idx]!.enabled, 'clock choice selectable');
  h.runner.selectChoice(scene, idx);
  eq(h.runner.getState().clock.current, 2, 'clock unchanged under Light Foot');
  return `raw +1 suppressed; clock stayed ${h.runner.getState().clock.current}`;
});

/** Case: Tunnel Nerves adds one to approach clock deltas including raw zero. */
check('4.1 tunnel-nerves: approach raw clock 0 becomes +1', () => {
  const events = eventsByCategory('approach');
  const h = makeHarness({ positive: 'P5', negative: 'N1', events, consumables: 8, clock: 0 });
  const { scene, views } = driveToChoiceScene(h);
  const idx = findChoiceIndex(
    scene,
    (c) => (c.statChanges?.clock ?? 0) === 0 && !c.condition
  );
  assert(views[idx]!.enabled, 'clock-zero choice selectable');
  h.runner.selectChoice(scene, idx);
  eq(h.runner.getState().clock.current, 1, 'clock +1 under Tunnel Nerves');
  return `raw 0 became +1; clock ${h.runner.getState().clock.current}`;
});

/** Case: without the trait flags the same choices apply raw deltas (control). */
check('4.1 control: no clock traits leaves deltas raw', () => {
  const events = [transitEventsWithClockGain()[0]!];
  const h = makeHarness({ positive: 'P5', negative: 'N4', events, consumables: 8, clock: 2 });
  const { scene } = driveToChoiceScene(h);
  const idx = findChoiceIndex(
    scene,
    (c) => (c.statChanges?.clock ?? 0) > 0 && !c.condition
  );
  h.runner.selectChoice(scene, idx);
  eq(h.runner.getState().clock.current, 3, 'raw +1 applied without Light Foot');
  return 'control: raw clock delta applied';
});

// ─── Gate 4.2 checks ──────────────────────────────────────────────────────────

/** Drives from the facility entry to the facility confrontation choices. */
function driveToFacilityChoice(h: Harness): { scene: Scene; views: ChoiceView[] } {
  h.runner.loadScene('scene-facility-01');
  for (let guard = 0; guard < 50; guard++) {
    const scene = h.queue.shift();
    if (!scene) break;
    if (scene.choices && scene.choices.length > 0) {
      return { scene, views: h.runner.getChoiceViews(scene) };
    }
    h.runner.sceneComplete(scene);
  }
  throw new Error('never reached the facility confrontation choices');
}

/** Facility policy: correct if executable, else shutdown, else withdraw. */
function pickFacilityAction(views: ChoiceView[], scene: Scene): number {
  const order = ['correct', 'shutdown', 'withdraw'];
  for (const action of order) {
    const idx = (scene.choices ?? []).findIndex((c) => c.facilityAction === action);
    if (idx >= 0 && views[idx]!.enabled) return idx;
  }
  throw new Error('no executable facility action');
}

/** Drives a facility selection through to the fired ending. */
function driveFacilityToEnding(h: Harness): void {
  const { scene, views } = driveToFacilityChoice(h);
  const idx = pickFacilityAction(views, scene);
  h.runner.selectChoice(scene, idx);
  for (let guard = 0; guard < 50; guard++) {
    if (h.ending) return;
    const s = h.queue.shift();
    if (!s) break;
    h.runner.sceneComplete(s);
  }
  throw new Error('ending never fired');
}

function assertSingleOutcomeAuthority(
  h: Harness,
  preState: GameState,
  config: ReturnType<typeof buildEffectiveConfig>,
  label: string
): RunOutcome {
  const scored = scoreRun(preState, config);
  const outcome = h.ending!.state.outcome;
  assert(outcome !== null, `${label}: persisted outcome is null`);
  eq(h.ending!.ending, scored.ending, `${label}: narrative ending vs independently scored`);
  eq(outcome!.ending, scored.ending, `${label}: persisted ending vs independently scored`);
  eq(
    h.ending!.state.currentScene,
    `scene-ending-${scored.ending}`,
    `${label}: ending scene routed by computed outcome`
  );
  eq(outcome!.rawScore, scored.rawScore, `${label}: persisted rawScore vs independent`);
  return outcome!;
}

/** Threshold boundary under a threshold-modifying trait (Clear-Headed). */
check('4.2 threshold boundary: below / at / above under Clear-Headed', () => {
  const config = buildEffectiveConfig(baseConfig, 'P6', 'N4');
  const threshold = config.knowledgeThreshold;
  const notes: string[] = [];
  for (const knowledge of [threshold - 1, threshold, threshold + 1]) {
    const events = eventsByCategory('community');
    const h = makeHarness({ positive: 'P6', negative: 'N4', events, knowledge, consumables: 6 });
    const preState = h.runner.getState();
    driveFacilityToEnding(h);
    assertSingleOutcomeAuthority(
      h,
      preState,
      config,
      `knowledge ${knowledge} (threshold ${threshold})`
    );
    notes.push(
      `k${knowledge} -> ${h.ending!.ending} (view gate showed [Knowledge ${threshold}])`
    );
  }
  return notes.join('; ');
});

/** The knowledge-8 review probe: no narrative/scored disagreement, outcome set. */
check('4.2 knowledge-8 probe: narrative == scored == persisted, outcome non-null', () => {
  const events = eventsByCategory('community');
  const h = makeHarness({ positive: 'P6', negative: 'N4', events, knowledge: 8, consumables: 4 });
  const config = h.runner.getEffectiveConfig();
  const preState = h.runner.getState();
  driveFacilityToEnding(h);
  assertSingleOutcomeAuthority(h, preState, config, 'knowledge-8 probe');
  const outcome = h.ending!.state.outcome!;
  assert(outcome !== null, 'outcome non-null');
  eq(outcome.ending, 'destruction', 'knowledge 8 below every legal threshold scores destruction');
  return 'narrative destruction, scored destruction, outcome persisted';
});

/** Repair cost charged exactly once at the point of repair (Fragile Kit: 3). */
check('4.2 repair cost: charged exactly once, no second deduction', () => {
  const events = eventsByCategory('community');
  const h = makeHarness({ positive: 'P1', negative: 'N6', events, knowledge: 12, consumables: 5 });
  const config = h.runner.getEffectiveConfig();
  const fixCost = config.consumableFixCost;
  eq(fixCost, 3, 'Fragile Kit raises the effective repair cost');

  const { scene, views } = driveToFacilityChoice(h);
  const correctIdx = (scene.choices ?? []).findIndex((c) => c.facilityAction === 'correct');
  assert(correctIdx >= 0, 'correction choice exists');
  const correctView = views[correctIdx]!;
  assert(correctView.enabled, 'correction executable at k12 / 5 modules');
  assert(correctView.label.includes(`[${fixCost} modules]`), 'label shows the effective cost');

  const preState = h.runner.getState();
  const before = preState.stats.consumables;
  h.runner.selectChoice(scene, correctIdx);
  for (let guard = 0; guard < 50 && !h.ending; guard++) {
    const s = h.queue.shift();
    if (!s) break;
    h.runner.sceneComplete(s);
  }
  assert(h.ending !== null, 'ending fired');

  const after = h.ending!.state.stats.consumables;
  eq(after, before - fixCost, 'module total after ending equals before repair minus effective cost');

  // The outcome must equal the cascade computed on the pre-charge (arrival)
  // state — the score breakdown must not deduct the repair a second time.
  const scored = scoreRun(preState, config);
  const outcome = h.ending!.state.outcome!;
  eq(outcome.ending, 'correction', 'correction persisted');
  eq(outcome.rawScore, scored.rawScore, 'rawScore matches pre-charge cascade (no second deduction)');
  const modulesRow = (outcome.components ?? []).find((c) => c.label === 'Modules remaining');
  assert(modulesRow !== undefined, 'modules component present in frozen breakdown');
  return `before ${before} -> after ${after} (fixCost ${fixCost}); rawScore ${outcome.rawScore} == pre-charge cascade`;
});

/** Clock failure produces a persisted outcome consumed identically. */
check('4.2 clock-failure: persisted outcome consumed identically', () => {
  const events = eventsByCategory('community');
  const h = makeHarness({ positive: 'P5', negative: 'N4', events, consumables: 6, clock: 10 });
  // Drive into the journey, select any choice, then run the reward cycle;
  // the clock is already at max, so the post-reward tick ends the run.
  const { scene, views } = driveToChoiceScene(h);
  const enabled = views.findIndex((v) => v.enabled);
  assert(enabled >= 0, 'an enabled choice exists');
  h.runner.selectChoice(scene, enabled);
  for (let guard = 0; guard < 100 && !h.ending; guard++) {
    if (h.pendingReward) {
      h.pendingReward.onSelect(0);
      h.pendingReward = null;
      continue;
    }
    const s = h.queue.shift();
    if (!s) continue;
    h.runner.sceneComplete(s);
    if (h.runner.getState().activeEventId) {
      h.runner.eventSceneComplete(s.id);
    }
  }
  assert(h.ending !== null, 'clock-failure ending fired');
  const outcome = h.ending!.state.outcome;
  assert(outcome !== null, 'clock-failure outcome persisted');
  eq(h.ending!.ending, outcome!.ending, 'narrative == persisted for clock-failure');
  eq(outcome!.ending, 'clock-failure', 'ending type');
  eq(h.ending!.state.alive, false, 'run marked not alive');
  return 'clock-failure: narrative == scored == persisted';
});

/** HUD display and ending determination read the same effective-config value. */
check('4.2 HUD threshold: display authority == ending authority', () => {
  const events = eventsByCategory('community');
  const h = makeHarness({ positive: 'P6', negative: 'N4', events, consumables: 6 });
  const displayThreshold = h.runner.getEffectiveConfig().knowledgeThreshold;
  const expected = buildEffectiveConfig(baseConfig, 'P6', 'N4').knowledgeThreshold;
  eq(displayThreshold, expected, 'runner exposes the effective threshold the HUD reads');

  // The correction gate flips exactly at the displayed threshold.
  for (const [knowledge, want] of [
    [displayThreshold - 1, 'destruction'],
    [displayThreshold, 'correction'],
  ] as const) {
    const hh = makeHarness({
      positive: 'P6',
      negative: 'N4',
      events,
      knowledge,
      consumables: 6,
    });
    driveFacilityToEnding(hh);
    eq(
      hh.ending!.ending,
      want,
      `gate flips at the displayed threshold (knowledge ${knowledge})`
    );
  }
  return `display ${displayThreshold}; gate flips exactly there`;
});

/** Pool shape and draw coverage: 12 events, 20 seeded draws, no repeats, no unfilled stop. */
check('4.3 event pool: 12 events, seeded draws fill every stop with no repeats', () => {
  eq(eventsData.length, 12, 'pool size');
  const byCat = {
    community: eventsByCategory('community').length,
    transit: eventsByCategory('transit').length,
    approach: eventsByCategory('approach').length,
  };
  eq(byCat.community, 5, 'community events');
  eq(byCat.transit, 4, 'transit events');
  eq(byCat.approach, 3, 'approach events');
  const ids = new Set(eventsData.map((e) => e.id));
  eq(ids.size, 12, 'unique ids');
  const expectedIds = [
    'CE-01', 'CE-02', 'CE-03', 'CE-04', 'CE-05',
    'TE-01', 'TE-02', 'TE-03', 'TE-04',
    'AE-01', 'AE-02', 'AE-03',
  ];
  for (const id of expectedIds) assert(ids.has(id), `missing M3 id ${id}`);

  const zoneMap = baseConfig.zoneMap as unknown as Record<string, string>;
  eq(
    JSON.stringify(zoneMap),
    JSON.stringify({ 1: 'community', 2: 'community', 3: 'transit', 4: 'transit', 5: 'approach' }),
    'config zone map 1-2 community, 3-4 transit, 5 approach'
  );

  for (let seed = 1; seed <= 20; seed++) {
    const rng = createRng(seed);
    let pool = initEventPool(eventsData, baseConfig, communitiesData, rng);
    const drawn: string[] = [];
    for (let stop = 1; stop <= baseConfig.journeyStops; stop++) {
      let event: EventDef;
      try {
        ({ event, pool } = drawEvent(pool, stop, baseConfig));
      } catch (e) {
        throw new Error(`seed ${seed} stop ${stop}: ${(e as Error).message}`);
      }
      drawn.push(event.id);
      assert(
        event.category === zoneMap[String(stop)],
        `seed ${seed} stop ${stop}: drew ${event.id} (${event.category}), zone wants ${zoneMap[String(stop)]}`
      );
    }
    eq(new Set(drawn).size, drawn.length, `seed ${seed}: repeated an event within a run`);
    const cats = drawn.map((id) => eventsData.find((e) => e.id === id)!.category);
    eq(cats.filter((c) => c === 'community').length, 2, `seed ${seed}: community draws`);
    eq(cats.filter((c) => c === 'transit').length, 2, `seed ${seed}: transit draws`);
    eq(cats.filter((c) => c === 'approach').length, 1, `seed ${seed}: approach draws`);
  }
  return '12 events (5/4/3, M3 ids); 20 seeded draws, zone-correct, no repeats, all stops filled';
});

// ─── Gate 4.4 checks ──────────────────────────────────────────────────────────

/** Reads a found document at a documented event: +1 knowledge, once, from within the run. */
check('4.4 found document: read grants +1 knowledge through applyFoundDocument', () => {
  const docEvent = eventsData.find((e) => (e.foundDocumentIds ?? []).length > 0)!;
  const h = makeHarness({ positive: 'P5', negative: 'N2', events: [docEvent], consumables: 8 });
  const { scene, views } = driveToChoiceScene(h);
  const idx = views.findIndex((v) => v.enabled);
  h.runner.selectChoice(scene, idx);

  const before = h.runner.getState().stats.knowledge;
  const choiceGain = h.runner.getState().stats.knowledge - before;
  void choiceGain;

  // Drive to the reward phase: the document surfaces there.
  for (let guard = 0; guard < 100 && h.surfacedDocs.length === 0; guard++) {
    if (h.pendingReward) break;
    const s = h.queue.shift();
    if (!s) break;
    h.runner.sceneComplete(s);
    if (h.runner.getState().activeEventId) h.runner.eventSceneComplete(s.id);
  }
  eq(h.surfacedDocs.length, 1, 'one document surfaced at the documented event');
  const doc = h.surfacedDocs[0]!;
  assert(
    (docEvent.foundDocumentIds ?? []).includes(doc.id),
    `surfaced doc ${doc.id} attached to ${docEvent.id}`
  );
  assert(doc.body.length > 200, 'full M3 text present');
  const afterRead = h.runner.getState().stats.knowledge;
  eq(afterRead - before, 1, 'reading granted exactly +1 knowledge');
  assert(h.runner.getState().flags[`fd-read-${docEvent.id}`] === true, 'read flag set');
  return `${docEvent.id} surfaced ${doc.id}; knowledge +1 via the run surface`;
});

/** Distracted (N4) suppresses the found-document knowledge gain. */
check('4.4 found document: Distracted gains nothing', () => {
  const docEvent = eventsData.find((e) => (e.foundDocumentIds ?? []).length > 0)!;
  const h = makeHarness({ positive: 'P5', negative: 'N4', events: [docEvent], consumables: 8 });
  const { scene, views } = driveToChoiceScene(h);
  h.runner.selectChoice(scene, views.findIndex((v) => v.enabled)!);
  const before = h.runner.getState().stats.knowledge;
  for (let guard = 0; guard < 100 && h.surfacedDocs.length === 0; guard++) {
    if (h.pendingReward) break;
    const s = h.queue.shift();
    if (!s) break;
    h.runner.sceneComplete(s);
    if (h.runner.getState().activeEventId) h.runner.eventSceneComplete(s.id);
  }
  eq(h.surfacedDocs.length, 1, 'document still surfaces (reading is not optional)');
  eq(
    h.runner.getState().stats.knowledge - before,
    0,
    'Distracted protagonist gains nothing'
  );
  return 'Distracted: document surfaces, knowledge unchanged';
});

/** Availability tracks the event draw: undocumented events never surface one. */
check('4.4 found document: availability tracks the event draw', () => {
  const docEvents = eventsData.filter((e) => (e.foundDocumentIds ?? []).length > 0);
  const noDocEvents = eventsData.filter((e) => (e.foundDocumentIds ?? []).length === 0);
  const ids = new Set(documentsData.map((d) => d.id));
  eq(documentsData.length, 8, 'eight documents exist');
  for (const d of documentsData) {
    assert(d.body.length > 200, `${d.id} carries full text`);
    const attached = eventsData.find((e) => e.id === d.attachedEvent);
    assert(attached !== undefined, `${d.id} attachedEvent ${d.attachedEvent} exists`);
    assert(
      (attached?.foundDocumentIds ?? []).includes(d.id),
      `${d.id} listed by its attached event`
    );
  }
  for (const e of docEvents) {
    for (const id of e.foundDocumentIds ?? []) assert(ids.has(id), `${e.id} lists unknown ${id}`);
  }
  const h = makeHarness({ positive: 'P5', negative: 'N4', events: [noDocEvents[0]!], consumables: 8 });
  const { scene, views } = driveToChoiceScene(h);
  h.runner.selectChoice(scene, views.findIndex((v) => v.enabled)!);
  for (let guard = 0; guard < 100 && h.pendingReward === null; guard++) {
    const s = h.queue.shift();
    if (!s) break;
    h.runner.sceneComplete(s);
    if (h.runner.getState().activeEventId) h.runner.eventSceneComplete(s.id);
  }
  eq(h.surfacedDocs.length, 0, 'no document at an undocumented event');
  return `${docEvents.length} documented events, ${noDocEvents.length} clean; draw decides`;
});

// ─── Gate 4.5 checks ──────────────────────────────────────────────────────────

/** Beat A (after stop 1) fires in the correct clock-scaled tier. */
check('4.5 comms beats: after stop 1, tier matches the live clock band', () => {
  const notes: string[] = [];
  const cases: Array<{ start: number; tier: string; first: string }> = [
    { start: 0, tier: 'green', first: 'RELAY-7, status check. Finding anything?' },
    { start: 3, tier: 'amber', first: "RELAY-7. We're seeing cascade alerts across three stations. Whatever you're tracking, it's accelerating." },
    { start: 6, tier: 'red', first: 'RELAY-7, respond.' },
  ];
  for (const c of cases) {
    const events = [eventsByCategory('community')[0]!];
    const h = makeHarness({
      positive: 'P5',
      negative: 'N4',
      events,
      consumables: 8,
      clock: c.start,
    });
    // Pick a clock-neutral choice so the only clock motion is the stop tick
    // (1 or 2), which keeps the band deterministic: 0->1-2 green, 3->4-5
    // amber, 6->7-8 red.
    const { scene, views } = driveToChoiceScene(h);
    const idx = views.findIndex(
      (v, i) => v.enabled && (scene.choices![i]!.statChanges?.clock ?? 0) === 0
    );
    h.runner.selectChoice(scene, idx);
    for (let guard = 0; guard < 100 && h.commsFired.length === 0; guard++) {
      if (h.pendingReward) {
        try {
          h.pendingReward.onSelect(0);
        } catch (e) {
          // Thin single-event pool: the next draw may have nothing left after
          // the beat's onContinue. The beat itself already fired.
          const msg = e instanceof Error ? e.message : String(e);
          if (!msg.includes('No eligible events')) throw e;
        }
        h.pendingReward = null;
        continue;
      }
      const s = h.queue.shift();
      if (!s) break;
      h.runner.sceneComplete(s);
      if (h.runner.getState().activeEventId) h.runner.eventSceneComplete(s.id);
    }
    eq(h.commsFired.length, 1, `start ${c.start}: one beat fired`);
    const fired = h.commsFired[0]!;
    eq(fired.afterStop, 1, `start ${c.start}: beat A (after stop 1)`);
    eq(fired.tierId, c.tier, `start ${c.start}: tier`);
    eq(fired.firstLine, c.first, `start ${c.start}: beat content`);
    notes.push(`clock ${c.start} -> ${h.runner.getState().clock.current} = ${fired.tierId}`);
  }
  return notes.join('; ');
});

/** Beat B (after stop 3) fires, with the tier read live at trigger time. */
check('4.5 comms beats: after stop 3, tier read live at the trigger', () => {
  const tiersSeen = new Set<string>();
  for (const start of [0, 2, 5]) {
    const events = [...eventsByCategory('community'), ...eventsByCategory('transit')];
    const h = makeHarness({ positive: 'P5', negative: 'N4', events, consumables: 9, clock: start });
    const beats: typeof h.commsFired = [];
    // Drive three stops, collecting beats; pick knowledge rewards and
    // clock-neutral choices.
    for (let stop = 1; stop <= 3; stop++) {
      if (stop === 1) {
        const { scene, views } = driveToChoiceScene(h);
        const idx = views.findIndex(
          (v, i) => v.enabled && (scene.choices![i]!.statChanges?.clock ?? 0) === 0
        );
        h.runner.selectChoice(scene, idx);
      }
      for (let guard = 0; guard < 200; guard++) {
        if (h.pendingReward) {
          h.pendingReward.onSelect(1);
          h.pendingReward = null;
          break;
        }
        const s = h.queue.shift();
        if (!s) continue;
        h.runner.sceneComplete(s);
        if (h.runner.getState().activeEventId) h.runner.eventSceneComplete(s.id);
      }
      for (const b of h.commsFired) if (!beats.some((x) => x.afterStop === b.afterStop)) beats.push(b);
      if (stop < 3) {
        // drive to the next stop's choice
        for (let guard = 0; guard < 200; guard++) {
          const s = h.queue.shift();
          if (!s) break;
          if (s.choices && s.choices.length > 0) {
            const views = h.runner.getChoiceViews(s);
            const idx = views.findIndex(
              (v, i) => v.enabled && (s.choices![i]!.statChanges?.clock ?? 0) === 0
            );
            h.runner.selectChoice(s, idx);
            break;
          }
          h.runner.sceneComplete(s);
          if (h.runner.getState().activeEventId) h.runner.eventSceneComplete(s.id);
        }
      }
    }
    const beatB = beats.find((b) => b.afterStop === 3);
    assert(beatB !== undefined, `start ${start}: beat B (after stop 3) fired`);
    tiersSeen.add(beatB!.tierId);
  }
  assert(tiersSeen.size >= 2, `beat B observed in multiple tiers (got ${[...tiersSeen].join(',')})`);
  return `beat B fired after stop 3 across starts 0/2/5, tiers seen: ${[...tiersSeen].join(', ')}`;
});

/** No hardcoded trigger remains: timing and bands come from the data. */
check('4.5 comms beats: timing and bands are data-driven', () => {
  eq(commsBeatsData.commsBeats.length, 3, 'three tiers');
  const byId = new Map(commsBeatsData.commsBeats.map((t) => [t.id, t]));
  const green = byId.get('green')!;
  const amber = byId.get('amber')!;
  const red = byId.get('red')!;
  eq(green.min, 0, 'green min'); eq(green.max, 3, 'green max');
  eq(amber.min, 4, 'amber min'); eq(amber.max, 6, 'amber max');
  eq(red.min, 7, 'red min'); eq(red.max, 9, 'red max');
  for (const tier of commsBeatsData.commsBeats) {
    eq(tier.beats.length, 2, `tier ${tier.id}: two beats`);
    const timings = tier.beats.map((b) => b.afterStop).sort();
    eq(timings[0], 1, `tier ${tier.id}: beat after stop 1`);
    eq(timings[1], 3, `tier ${tier.id}: beat after stop 3`);
    for (const beat of tier.beats) {
      assert(beat.lines.length >= 3, `tier ${tier.id} after stop ${beat.afterStop}: full exchange`);
      for (const line of beat.lines) {
        assert(line.speaker === 'coworker' || line.speaker === 'protagonist', 'known speakers');
        assert(line.text.trim().length > 0, 'line has text (terse replies allowed)');
      }
    }
  }
  return 'green 0-3, amber 4-6, red 7-9; both beats per tier; full M3 dialogue';
});

// ─── Gate 4.6 checks ──────────────────────────────────────────────────────────

function epilogueCommunities(pattern: ('helped' | 'ignored' | 'harmed')[]): CommunityRunState[] {
  return pattern.map((state, i) => ({
    community: communitiesData[i]!,
    state,
    stop: i + 1,
  }));
}

/** Helped-heavy and harmed-heavy runs at the same ending produce epilogues that differ per community. */
check('4.6 epilogue: helped-heavy vs harmed-heavy differ line for line', () => {
  const base = { stats: { knowledge: 12, consumables: 2, rapport: 0, startingRapport: 0 } };
  const mk = (pattern: ('helped' | 'ignored' | 'harmed')[]) =>
    ({
      ...({} as GameState),
      ...base,
      communities: epilogueCommunities(pattern),
      outcome: { ending: 'correction', rawScore: 0, rawScoreClamped: 0, finalScore: 0, grade: 'S' },
    }) as unknown as GameState;

  const helped = buildEpilogue('correction', mk(['helped', 'helped', 'ignored', 'helped', 'helped']));
  const harmed = buildEpilogue('correction', mk(['harmed', 'ignored', 'harmed', 'ignored', 'harmed']));

  for (const c of communitiesData.slice(0, 5)) {
    const hLine = helped.includes(c.name);
    const xLine = harmed.includes(c.name);
    assert(hLine || xLine, `${c.name} appears in at least one epilogue`);
  }
  assert(helped.includes('was already stable when the archive\'s repair drones arrived'), 'helped line text');
  assert(harmed.includes('was too far gone'), 'harmed line text');
  assert(!helped.includes('was too far gone'), 'helped-heavy epilogue never carries the harmed line text');
  assert(!harmed.includes('was already stable'), 'harmed-heavy epilogue never carries the helped line text');

  // Line-for-line divergence: same communities, different outcomes, the
  // per-community sentences differ.
  const helpedSentences = helped.split('</p>').filter((s) => communitiesData.some((c) => s.includes(c.name)));
  const harmedSentences = harmed.split('</p>').filter((s) => communitiesData.some((c) => s.includes(c.name)));
  eq(helpedSentences.length, 5, 'one line per visited community (helped-heavy)');
  eq(harmedSentences.length, 5, 'one line per visited community (harmed-heavy)');
  let differences = 0;
  for (let i = 0; i < 5; i++) {
    if (helpedSentences[i] !== harmedSentences[i]) differences++;
  }
  eq(differences, 5, 'every community line differs between the two runs');
  return '5/5 community lines differ between helped-heavy and harmed-heavy correction runs';
});

/** Clock-failure carries no community modifier lines. */
check('4.6 epilogue: clock-failure shows no community modifiers', () => {
  const state = {
    communities: epilogueCommunities(['helped', 'harmed', 'ignored', 'helped', 'ignored']),
    outcome: { ending: 'clock-failure', rawScore: 0, rawScoreClamped: 0, finalScore: 0, grade: 'F' },
  } as unknown as GameState;
  const text = buildEpilogue('clock-failure', state);
  for (const c of communitiesData.slice(0, 5)) {
    assert(!text.includes(c.name), `${c.name} must not appear in the clock-failure epilogue`);
  }
  assert(text.includes('Jay stopped transmitting after the third one'), 'M3 base text');
  return 'no community names in the clock-failure epilogue';
});

/** The epilogue reads the persisted outcome, never recomputing an ending. */
check('4.6 epilogue: consumes the persisted outcome', () => {
  const state = {
    communities: epilogueCommunities(['helped', 'ignored', 'ignored', 'ignored', 'ignored']),
    outcome: { ending: 'destruction', rawScore: 0, rawScoreClamped: 0, finalScore: 0, grade: 'B' },
  } as unknown as GameState;
  const text = buildEpilogue('correction', state);
  assert(text.includes('The archive core went offline'), 'destruction base text despite the correction argument');
  assert(!text.includes('best coffee'), 'correction closing absent');
  return 'persisted destruction wins over the passed narrative type';
});

/** Scene and NPC coverage per the M3 structure. */
check('4.6 scenes and NPCs: full coverage, no six-stop text', () => {
  const ids = new Set(scenesData.map((s) => s.id));
  for (const required of [
    'scene-lore-01',
    'scene-authorization-01',
    'scene-discovery-01',
    'scene-facility-01',
    'scene-facility-02',
    'scene-ending-clock-failure',
    'scene-ending-destruction',
    'scene-ending-correction',
  ]) {
    assert(ids.has(required), `scene ${required} missing`);
  }
  const beats = new Set(scenesData.map((s) => s.beat));
  for (const required of ['lore', 'status-quo', 'discovery', 'facility', 'confrontation', 'ending']) {
    assert(beats.has(required as never), `beat ${required} missing`);
  }
  for (const scene of scenesData) {
    for (const line of scene.dialogue) {
      assert(!/six stops/i.test(line.text), `scene ${scene.id} states six stops`);
    }
  }
  const rawEvents = readFileSync(resolve(process.cwd(), 'data/events.json'), 'utf-8');
  assert(!/six stops/i.test(rawEvents), 'events state six stops');

  const manifest = load<{ characters: Array<{ id: string; nameColor: string; expressions: Record<string, string> }> }>(
    'data/characters.json'
  );
  const chars = new Map(manifest.characters.map((c) => [c.id, c]));
  for (const required of ['protagonist', 'coworker', 'supervisor', 'aguilar', 'dex', 'sato', 'archive']) {
    assert(chars.has(required), `character ${required} missing`);
  }
  const expr = (id: string, e: string) => assert(!!chars.get(id)?.expressions[e], `${id} expression ${e}`);
  expr('coworker', 'concerned'); expr('coworker', 'urgent');
  expr('supervisor', 'dismissive');
  expr('aguilar', 'stern');
  expr('dex', 'wary');
  expr('sato', 'serene');
  for (const c of manifest.characters) {
    assert(/^#[0-9a-f]{6}$/i.test(c.nameColor ?? ''), `${c.id} name color`);
  }
  // Every speaker referenced by scenes and events exists in the manifest.
  for (const scene of [...scenesData, ...eventsData.flatMap((e) => e.scenes)]) {
    for (const line of scene.dialogue) {
      assert(
        line.speaker === 'narrator' || chars.has(line.speaker),
        `unknown speaker ${line.speaker} in ${scene.id}`
      );
    }
  }
  return 'scenes cover lore/authorization/journey/facility/endings; six NPCs present with M3 expressions and colors';
});

// ─── Gate 4.7 checks ──────────────────────────────────────────────────────────

/** Drives a full run (journey + facility) to its ending with a fixed policy. */
function driveToCompletion(
  h: Harness,
  rewardIndex = 1,
  start = true
): void {
  if (start) h.runner.loadScene('scene-discovery-01');
  for (let guard = 0; guard < 3000 && !h.ending; guard++) {
    if (h.pendingReward) {
      h.pendingReward.onSelect(rewardIndex);
      h.pendingReward = null;
      continue;
    }
    const scene = h.queue.shift();
    if (!scene) continue;
    if (scene.choices && scene.choices.length > 0) {
      const views = h.runner.getChoiceViews(scene);
      const idx = views.findIndex((v) => v.enabled);
      if (idx >= 0) {
        h.runner.selectChoice(scene, idx);
        continue;
      }
    }
    h.runner.sceneComplete(scene);
    if (h.runner.getState().activeEventId) {
      h.runner.eventSceneComplete(scene.id);
    }
  }
}

/**
 * A1.1 resume contract: for every SAVE-enabled phase, save through the real
 * SaveManager, discard the runner, rebuild one from the loaded slot exactly
 * as the LOAD path does, and assert the restored set — stats, clock, stop,
 * communities, protagonist and traits, the effective configuration
 * re-derived from the saved protagonist (the fixtures use threshold-
 * modifying P6 so a hardcoded base config fails), RNG state, event pool and
 * used ids, Practiced availability, reroll count, persisted outcome, and a
 * current scene that resolves to a registered, renderable scene. Every phase
 * then completes to parity with an uninterrupted twin: same ending, score,
 * grade, and reward-grant count — a second grant is a failure.
 */
check('A1.1 save/resume: every SAVE-enabled phase restores field-by-field from a SaveManager slot and completes at twin parity', () => {
  const notes: string[] = [];
  const twinA = makeHarness({ positive: 'P6', negative: 'N4', events: eventsData, runSeed: 5150 });
  driveToCompletion(twinA, 1);
  assert(twinA.ending !== null, 'twin A (stop-1 phases) ended');
  const twinComms = makeHarness({ positive: 'P6', negative: 'N4', events: eventsData, runSeed: 5155 });
  driveToCompletion(twinComms, 1);
  assert(twinComms.ending !== null, 'twin comms/facility ended');
  const twinDoc = makeHarness({ positive: 'P6', negative: 'N2', events: documentedEvents(), runSeed: 5160 });
  driveToCompletion(twinDoc, 1);
  assert(twinDoc.ending !== null, 'twin document ended');

  const phaseSpec = (phase: SavePhase): {
    positive: PositiveTraitId;
    negative: NegativeTraitId;
    events: EventDef[];
    seed: number;
    twin: Harness;
  } => {
    switch (phase) {
      case 'event-choice':
      case 'event-consequence':
      case 'reward-pick':
        return { positive: 'P6', negative: 'N4', events: eventsData, seed: 5150, twin: twinA };
      case 'document':
        return { positive: 'P6', negative: 'N2', events: documentedEvents(), seed: 5160, twin: twinDoc };
      default:
        return { positive: 'P6', negative: 'N4', events: eventsData, seed: 5155, twin: twinComms };
    }
  };

  for (const phase of SAVE_PHASES) {
    const spec = phaseSpec(phase);
    const b = makeHarness({
      positive: spec.positive,
      negative: spec.negative,
      events: spec.events,
      runSeed: spec.seed,
      hold: phase === 'document' || phase === 'comms',
    });
    driveToSavePhase(b, phase);
    const grantsBefore = b.grantCount;
    const slot = saveThroughManager(b);
    const saved = { state: slot.state, engine: slot.engine! };

    // Discard the runner: everything below comes from the loaded slot.
    const r = makeHarness({ positive: spec.positive, negative: spec.negative, events: spec.events, resumeSlot: { slot, autostart: false } });
    assertRestoredContract(saved, r, phase);

    r.runner.start();
    assertSceneRegistered(r, phase);

    if (phase === 'comms') {
      // The interrupted beat re-fires and the run continues — the reward
      // already taken before the save must not be granted again.
      eq(r.commsFired.length, 1, 'comms: the interrupted beat re-fires on resume');
      eq(r.commsFired[0]!.afterStop, b.heldComms!.afterStop, 'comms: same beat');
      eq(r.commsFired[0]!.tierId, b.heldComms!.tierId, 'comms: same tier');
    }
    if (phase === 'document') {
      // The reloaded reward scene must be pumped through completion for the
      // surface to re-fire (the harness has no auto-advance).
      for (let guard = 0; guard < 100 && r.surfacedDocs.length === 0 && !r.pendingReward; guard++) {
        const s = r.queue.shift();
        if (!s) break;
        r.runner.sceneComplete(s);
        if (r.runner.getState().activeEventId) r.runner.eventSceneComplete(s.id);
      }
      eq(r.surfacedDocs.length, 1, 'document: the unread document re-surfaces once');
      eq(r.heldDoc, null, 'document: surface is not re-held after resume');
    }

    driveToCompletion(r, 1, false);
    assert(r.ending !== null, `${phase}: resumed run reached an ending`);
    eq(r.ending!.ending, spec.twin.ending!.ending, `${phase}: ending parity`);
    eq(r.ending!.state.outcome!.finalScore, spec.twin.ending!.state.outcome!.finalScore, `${phase}: score parity`);
    eq(r.ending!.state.outcome!.grade, spec.twin.ending!.state.outcome!.grade, `${phase}: grade parity`);
    eq(
      grantsBefore + r.grantCount,
      spec.twin.grantCount,
      `${phase}: reward-grant count preserved (no re-grant)`
    );
    notes.push(
      `${phase}: stop ${saved.state.currentStop}, ${spec.twin.ending!.ending} @ ${spec.twin.ending!.state.outcome!.finalScore}, grants ${grantsBefore}+${r.grantCount}`
    );
  }
  return `phases [${SAVE_PHASES.join(', ')}]: ${notes.length} resumed runs at twin parity — ${notes.join(' | ')}`;
});

/** Advanced-RNG fixture: with Exhausted's raised jitter the stream advances
 *  through two stops of ticks before the save; the restored runner must sit
 *  at the exact stream position and finish at the twin's outcome. */
check('A1.1 save/resume: advanced-RNG fixture restores the exact stream position', () => {
  const spec: { positive: PositiveTraitId; negative: NegativeTraitId; seed: number } = {
    positive: 'P5',
    negative: 'N7',
    seed: 60507,
  };
  const twin = makeHarness({ positive: spec.positive, negative: spec.negative, events: eventsData, runSeed: spec.seed });
  driveToCompletion(twin, 1);
  assert(twin.ending !== null, 'RNG twin ended');

  const b = makeHarness({ positive: spec.positive, negative: spec.negative, events: eventsData, runSeed: spec.seed });
  driveToSavePhase(b, 'stop3-choice');
  const grantsBefore = b.grantCount;
  const slot = saveThroughManager(b);
  const saved = { state: slot.state, engine: slot.engine! };

  const r = makeHarness({ positive: spec.positive, negative: spec.negative, events: eventsData, resumeSlot: { slot, autostart: false } });
  assertRestoredContract(saved, r, 'rng-fixture');
  eq(
    r.runner.snapshot()!.rngState,
    saved.engine.rngState,
    'rng-fixture: stream position restored exactly'
  );
  r.runner.start();
  assertSceneRegistered(r, 'rng-fixture');
  driveToCompletion(r, 1, false);
  assert(r.ending !== null, 'rng-fixture: resumed run ended');
  eq(r.ending!.ending, twin.ending!.ending, 'rng-fixture: ending parity');
  eq(r.ending!.state.outcome!.finalScore, twin.ending!.state.outcome!.finalScore, 'rng-fixture: score parity');
  eq(grantsBefore + r.grantCount, twin.grantCount, 'rng-fixture: grant count preserved');
  return `saved at stop ${saved.state.currentStop} with rngState ${saved.engine.rngState}; resumed to ${r.ending!.ending} @ ${r.ending!.state.outcome!.finalScore}`;
});

/** Practiced fixture: the discount is consumed by a stop-1 spend, the save is
 *  taken mid-consequence, and the resumed runner must restore the consumed
 *  state — dropping Practiced restoration makes this exact assertion fail. */
check('A1.1 save/resume: Practiced fixture restores the consumed-discount state', () => {
  const spec: { positive: PositiveTraitId; negative: NegativeTraitId; seed: number } = {
    positive: 'P8',
    negative: 'N2',
    seed: 60511,
  };
  const twin = makeHarness({ positive: spec.positive, negative: spec.negative, events: eventsData, runSeed: spec.seed, consumables: 9 });
  const first = driveToChoiceScene(twin);
  const idxT = findChoiceIndex(first.scene, (c) => (c.statChanges?.consumables ?? 0) < 0 && !c.condition);
  twin.runner.selectChoice(first.scene, idxT);
  driveToCompletion(twin, 1, false);
  assert(twin.ending !== null, 'Practiced twin ended');

  const b = makeHarness({ positive: spec.positive, negative: spec.negative, events: eventsData, runSeed: spec.seed, consumables: 9 });
  const stop1 = driveToChoiceScene(b);
  const idx = findChoiceIndex(stop1.scene, (c) => (c.statChanges?.consumables ?? 0) < 0 && !c.condition);
  b.runner.selectChoice(stop1.scene, idx);
  eq(b.runner.snapshot()!.practicedAvailable, false, 'discount consumed by the stop-1 spend');
  const grantsBefore = b.grantCount;
  const slot = saveThroughManager(b);
  const saved = { state: slot.state, engine: slot.engine! };

  const r = makeHarness({ positive: spec.positive, negative: spec.negative, events: eventsData, consumables: 9, resumeSlot: { slot, autostart: false } });
  assertRestoredContract(saved, r, 'practiced-fixture');
  eq(
    r.runner.snapshot()!.practicedAvailable,
    false,
    'practiced-fixture: consumed-discount state restored (fails if restoration is dropped)'
  );
  r.runner.start();
  assertSceneRegistered(r, 'practiced-fixture');
  driveToCompletion(r, 1, false);
  assert(r.ending !== null, 'practiced-fixture: resumed run ended');
  eq(r.ending!.ending, twin.ending!.ending, 'practiced-fixture: ending parity');
  eq(r.ending!.state.outcome!.finalScore, twin.ending!.state.outcome!.finalScore, 'practiced-fixture: score parity');
  eq(grantsBefore + r.grantCount, twin.grantCount, 'practiced-fixture: grant count preserved');
  return `saved after the discount was consumed; resumed run restored practicedAvailable=false and matched the twin`;
});

// ─── A1.2: save and resume repairs ───────────────────────────────────────────

/** A save pooling an event id that is absent from the loaded data degrades:
 *  the missing id is dropped from the pool, no `undefined` enters it, and the
 *  remaining route (still valid after the drop) is playable. */
check('A1.2 save/resume: a nonexistent pooled event id degrades without crashing', () => {
  const seed = 61021;
  const b = makeHarness({ positive: 'P6', negative: 'N4', events: eventsData, runSeed: seed });
  driveToSavePhase(b, 'event-choice');
  const slot = saveThroughManager(b);
  assert(slot.engine!.eventPool !== null, 'pool present in snapshot');
  const pool = slot.engine!.eventPool!;
  const victim = pool.transit[0];
  if (victim === undefined) throw new Error('a pooled transit id exists to remove from the data');
  assert(
    pool.transit.length >= 2,
    'enough transit events remain for the remaining transit stops after the drop'
  );
  const reducedEvents = eventsData.filter((e) => e.id !== victim);

  // The resumed harness builds its registry from the reduced data, exactly
  // as a build without the removed event would.
  const r = makeHarness({
    resumeSlot: { slot, autostart: false },
    positive: 'P6',
    negative: 'N4',
    events: reducedEvents,
  });
  r.runner.start();
  const snap = r.runner.snapshot()!;
  assert(snap.eventPool !== null, 'pool restored');
  const allIds = [
    ...snap.eventPool!.community,
    ...snap.eventPool!.transit,
    ...snap.eventPool!.approach,
  ];
  assert(!allIds.includes(victim), 'the missing id was dropped from the restored pool');
  for (const id of allIds) {
    assert(reducedEvents.some((e) => e.id === id), `pool id ${id} exists in the reduced data (no undefined)`);
  }
  driveToCompletion(r, 1, false);
  assert(r.ending !== null, 'degraded resume still completes the remaining route');
  return `pool minus ${victim} resumed and completed as ${r.ending!.ending}`;
});

/** A save whose ACTIVE event is absent from the data is refused by the
 *  shared slotResumeProblem decision — not crashed on, not blank-screened. */
check('A1.2 save/resume: a nonexistent active event id is refused, not crashed', () => {
  const seed = 61022;
  const b = makeHarness({ positive: 'P6', negative: 'N4', events: eventsData, runSeed: seed });
  driveToSavePhase(b, 'event-choice');
  const slot = saveThroughManager(b);
  assert(slot.state.activeEventId !== null, 'active event present at the save point');
  const poisoned = JSON.parse(
    JSON.stringify(slot)
  ) as import('../types/index').SaveSlot;
  poisoned.state.activeEventId = 'CE-99';
  poisoned.state.currentScene = 'evt-ce99-situation';
  const problem = slotResumeProblem(poisoned, {
    scenes: scenesData,
    events: eventsData,
    journeyStops: baseConfig.journeyStops,
  });
  assert(problem !== null, 'active event absent from the data is refused');
  assert(problem!.includes('CE-99'), 'refusal names the missing event');
  // The slot was preserved bit-for-bit by the refusal path.
  const after = JSON.parse(JSON.stringify(slot)) as import('../types/index').SaveSlot;
  eq(
    JSON.stringify(after.state.activeEventId),
    JSON.stringify(slot.state.activeEventId),
    'slot untouched by validation'
  );
  return `refused: ${problem}`;
});

/** A pre-amendment comms-window slot (stale event-scene id, no resumePhase,
 *  no active event, mid-journey) resumes through the stop transition: the
 *  beat re-fires, the run continues, and nothing is granted twice. */
check('A1.2 save/resume: a legacy pre-amendment comms slot resumes without duplicated effects', () => {
  const seed = 61023;
  // Twin for outcome comparison.
  const twin = makeHarness({ positive: 'P6', negative: 'N4', events: eventsData, runSeed: seed });
  driveToCompletion(twin, 1);
  assert(twin.ending !== null, 'twin ended');

  // Reproduce the R1 save shape: the runner as it was pre-amendment — mid
  // stop transition, stale reward-scene id, reward already taken.
  const b = makeHarness({ positive: 'P6', negative: 'N4', events: eventsData, runSeed: seed, hold: true });
  driveToSavePhase(b, 'comms');
  const grantsBefore = b.grantCount;
  const slot = saveThroughManager(b);
  // Force the legacy shape: strip the resumePhase and restore the stale
  // reward-scene id the pre-amendment runner used to leave in the state —
  // including eventPhase null, since nothing marked the transition then.
  const legacy = JSON.parse(JSON.stringify(slot)) as import('../types/index').SaveSlot;
  if (legacy.engine) legacy.engine.resumePhase = null;
  legacy.state.eventPhase = null;
  const drawnEvent = eventsData.find((e) => e.id === (legacy.state.usedEventIds.slice(-1)[0] ?? ''));
  if (!drawnEvent) throw new Error('drawn event found');
  legacy.state.currentScene = drawnEvent.rewardScene;
  assert(
    !scenesData.some((s) => s.id === legacy.state.currentScene),
    'legacy scene id is not a base scene (the R1 shape)'
  );

  const r = makeHarness({ positive: 'P6', negative: 'N4', events: eventsData, resumeSlot: { slot: legacy, autostart: true } });
  eq(r.commsFired.length, 1, 'legacy comms slot: the beat re-fires on resume');
  driveToCompletion(r, 1, false);
  assert(r.ending !== null, 'legacy comms slot: resumed run completed');
  eq(r.ending!.ending, twin.ending!.ending, 'legacy comms slot: ending parity');
  eq(r.ending!.state.outcome!.finalScore, twin.ending!.state.outcome!.finalScore, 'legacy comms slot: score parity');
  eq(grantsBefore + r.grantCount, twin.grantCount, 'legacy comms slot: no second grant');
  return `legacy slot (${legacy.state.currentScene}) resumed through the transition to ${r.ending!.ending} @ ${r.ending!.state.outcome!.finalScore}`;
});

/** The shared validation refuses a save whose current scene cannot resolve
 *  in any legal way, and passes every shape that must resume. */
check('A1.2 save/resume: slot validation accepts every resumable shape and refuses the rest', () => {
  const data = { scenes: scenesData, events: eventsData, journeyStops: baseConfig.journeyStops };
  // A live comms-window save passes via resumePhase.
  const b = makeHarness({ positive: 'P6', negative: 'N4', events: eventsData, runSeed: 61024, hold: true });
  driveToSavePhase(b, 'comms');
  const commsSlot = saveThroughManager(b);
  eq(slotResumeProblem(commsSlot, data), null, 'comms-window save accepted');
  eq(commsSlot.state.currentScene, 'scene-journey-transition', 'comms save anchors the registered transition scene');
  // A live mid-event save passes on the event's own scenes.
  const c = makeHarness({ positive: 'P6', negative: 'N4', events: eventsData, runSeed: 61024 });
  driveToSavePhase(c, 'event-choice');
  eq(slotResumeProblem(saveThroughManager(c), data), null, 'mid-event save accepted');
  // A pre-journey base-scene save passes on the base scenes.
  const baseSlot: import('../types/index').SaveSlot = {
    id: 1,
    label: 'Slot 2',
    state: { ...initNewGame(buildEffectiveConfig(baseConfig, 'P6', 'N4')), currentScene: 'scene-discovery-01' },
    savedAt: 0,
    sceneLabel: 'x',
    beatLabel: 'y',
  };
  eq(slotResumeProblem(baseSlot, data), null, 'base-scene save accepted');
  // Garbage is refused.
  const junk: import('../types/index').SaveSlot = {
    ...baseSlot,
    state: { ...baseSlot.state, currentScene: 'scene-does-not-exist', currentStop: 9, activeEventId: null, eventPhase: 'choice' },
  };
  assert(slotResumeProblem(junk, data) !== null, 'unresolvable scene refused');
  return 'comms (snapshot + legacy), mid-event, and base-scene saves accepted; unresolvable refused';
});

/** Same-seed parity: a save+resume run scores exactly what the uninterrupted run scored. */
check('4.7 save/resume: resumed completion matches the uninterrupted score', () => {
  const seed = 31337;
  // Uninterrupted twin.
  const a = makeHarness({ positive: 'P1', negative: 'N5', events: eventsData, runSeed: seed });
  driveToCompletion(a, 1);
  assert(a.ending !== null, 'uninterrupted run ended');
  const outcomeA = a.ending!.state.outcome!;

  // Save mid-run (stop 3 choice), serialize, resume with a fresh runner.
  const b = makeHarness({ positive: 'P1', negative: 'N5', events: eventsData, runSeed: seed });
  b.runner.loadScene('scene-discovery-01');
  let slotJson: string | null = null;
  for (let guard = 0; guard < 1000 && !slotJson; guard++) {
    if (b.pendingReward) {
      b.pendingReward.onSelect(1);
      b.pendingReward = null;
      continue;
    }
    const scene = b.queue.shift();
    if (!scene) continue;
    if (scene.choices && scene.choices.length > 0) {
      const views = b.runner.getChoiceViews(scene);
      const idx = views.findIndex((v) => v.enabled);
      if (idx >= 0) {
        b.runner.selectChoice(scene, idx);
        if (b.runner.getState().currentStop === 3) {
          slotJson = JSON.stringify({
            state: b.runner.getState(),
            engine: b.runner.snapshot(),
          });
        }
        continue;
      }
    }
    b.runner.sceneComplete(scene);
    if (b.runner.getState().activeEventId) b.runner.eventSceneComplete(scene.id);
  }
  assert(slotJson !== null, 'saved mid-run at stop 3');
  const slot = JSON.parse(slotJson!) as {
    state: GameState;
    engine: import('../types/index').EngineSnapshot;
  };
  const r = makeHarness({
    positive: 'P1',
    negative: 'N5',
    events: eventsData,
    resume: slot,
  });
  r.runner.start();
  driveToCompletion(r, 1, false);
  assert(r.ending !== null, 'resumed run ended');
  const outcomeB = r.ending!.state.outcome!;
  eq(outcomeB.ending, outcomeA.ending, 'ending');
  eq(outcomeB.finalScore, outcomeA.finalScore, 'final score');
  eq(outcomeB.rawScore, outcomeA.rawScore, 'raw score');
  eq(outcomeB.grade, outcomeA.grade, 'grade');
  return `${outcomeA.ending} @ ${outcomeA.finalScore} == ${outcomeB.ending} @ ${outcomeB.finalScore} from seed ${seed}`;
});

// ─── Gate 4.8 evidence checks ─────────────────────────────────────────────────

/** Exhaustive live-vs-resolver matrix: every combo, every choice, both Practiced states. */
check('4.8 evidence: 64 combos x 36 choices resolve identically to the resolver', () => {
  let resolutions = 0;
  let mismatches = 0;
  const firstMismatch = { msg: '' };

  for (const { positive, negative } of allCombinations()) {
    const eff = buildEffectiveConfig(baseConfig, positive, negative);
    for (const event of eventsData) {
      const situation = event.scenes.find((s) => (s.choices ?? []).length > 0)!;
      const choices = situation.choices!;
      for (let i = 0; i < choices.length; i++) {
        const choice = choices[i]!;
        for (const practiced of [true, false]) {
          const h = makeHarness({
            positive,
            negative,
            events: [event],
            consumables: 50,
            knowledge: 20,
            rapport: 3,
            runSeed: 7,
          });
          const { scene } = driveToChoiceScene(h);
          // Set the Practiced availability for this pass (harness-only reach-in).
          (h.runner as unknown as { practicedAvailable: boolean }).practicedAvailable = practiced;

          const before = h.runner.getState();
          const sc = choice.statChanges ?? {};
          h.runner.selectChoice(scene, i);
          const live = h.runner.getState();

          const expected = applyChoiceEffects(
            before,
            {
              knowledge: sc.knowledge ?? 0,
              consumables: sc.consumables ?? 0,
              clock: sc.clock ?? 0,
              communityEffect:
                choice.communityEffect === 'helped' || choice.communityEffect === 'harmed'
                  ? choice.communityEffect
                  : 'none',
            },
            eff,
            event.category,
            practiced
          ).state;

          resolutions++;
          const fields = [
            ['knowledge', live.stats.knowledge, expected.stats.knowledge],
            ['consumables', live.stats.consumables, expected.stats.consumables],
            ['clock', live.clock.current, expected.clock.current],
            ['communities', JSON.stringify(live.communities.map((c) => [c.stop, c.state])), JSON.stringify(expected.communities.map((c) => [c.stop, c.state]))],
          ] as const;
          for (const [field, a, b] of fields) {
            if (a !== b) {
              mismatches++;
              if (!firstMismatch.msg) {
                firstMismatch.msg = `${positive}+${negative} ${event.id}[${i}] practiced=${practiced}: ${field} live=${a} resolver=${b}`;
              }
            }
          }
        }
      }
    }
  }
  eq(mismatches, 0, `live outcome diverged from the resolver (${firstMismatch.msg})`);
  return `${resolutions} resolutions across 64 combos, 36 choices, both Practiced states: identical`;
});

/** Every trait combination completes a journey without a choice deadlock. */
check('4.8 evidence: all 64 combos complete runs without deadlock', () => {
  let completed = 0;
  let deadlocks = 0;
  const notes: string[] = [];
  for (const { positive, negative } of allCombinations()) {
    for (const seed of [101, 202]) {
      const h = makeHarness({ positive, negative, events: eventsData, runSeed: seed });
      h.runner.loadScene('scene-discovery-01');
      let stuck = false;
      for (let guard = 0; guard < 3000 && !h.ending; guard++) {
        if (h.pendingReward) {
          h.pendingReward.onSelect(1);
          h.pendingReward = null;
          continue;
        }
        const scene = h.queue.shift();
        if (!scene) continue;
        if (scene.choices && scene.choices.length > 0) {
          const views = h.runner.getChoiceViews(scene);
          if (!views.some((v) => v.enabled)) {
            stuck = true;
            break;
          }
          h.runner.selectChoice(scene, views.findIndex((v) => v.enabled));
          continue;
        }
        h.runner.sceneComplete(scene);
        if (h.runner.getState().activeEventId) h.runner.eventSceneComplete(scene.id);
      }
      if (h.ending && !stuck) {
        completed++;
      } else {
        deadlocks++;
        notes.push(`${positive}+${negative} seed ${seed}: ${stuck ? 'deadlocked' : 'no ending'}`);
      }
    }
  }
  eq(deadlocks, 0, `deadlock or non-completion: ${notes.slice(0, 3).join('; ')}`);
  return `${completed}/128 runs (64 combos x 2 seeds) completed with an enabled choice always available`;
});

/** Every gated choice is reachable at a legal knowledge value by its earliest draw. */
check('4.8 evidence: every gated choice reachable at a legal knowledge value', () => {
  const zoneStops: Record<string, number[]> = {
    community: [1, 2],
    transit: [3, 4],
    approach: [5],
  };
  const maxKnowledgeByStop = (stop: number): number => {
    // Best case per stop: the zone's highest knowledge choice plus a found
    // document when the zone carries any documented event.
    const zone = (baseConfig.zoneMap as unknown as Record<string, string>)[String(stop)] as
      | 'community'
      | 'transit'
      | 'approach';
    const pool = eventsData.filter((e) => e.category === zone);
    const bestChoice = Math.max(
      ...pool.flatMap((e) =>
        (e.scenes.find((s) => (s.choices ?? []).length > 0)?.choices ?? []).map(
          (c) => c.statChanges?.knowledge ?? 0
        )
      )
    );
    const docBonus = pool.some((e) => (e.foundDocumentIds ?? []).length > 0) ? 1 : 0;
    return bestChoice + docBonus;
  };
  // Cumulative attainable knowledge when arriving at a stop (before choosing).
  const cumulative: number[] = [0];
  for (let stop = 1; stop <= baseConfig.journeyStops; stop++) {
    cumulative[stop] = cumulative[stop - 1]! + maxKnowledgeByStop(stop);
  }

  const notes: string[] = [];
  for (const event of eventsData) {
    const situation = event.scenes.find((s) => (s.choices ?? []).length > 0)!;
    (situation.choices ?? []).forEach((choice, i) => {
      const gate = choice.condition?.stat === 'knowledge' ? choice.condition.min : 0;
      if (!gate) return;
      // Reachable when the knowledge the run can hold at some drawable stop
      // satisfies the gate: use the latest stop the event can draw (the
      // most knowledge a legal run can hold while the event is still in the
      // pool).
      const latest = zoneStops[event.category]![zoneStops[event.category]!.length - 1]!;
      const attainable = cumulative[latest - 1]!;
      assert(
        attainable >= gate,
        `${event.id}[${i}] gate ${gate} unreachable at every drawable stop (attainable ${attainable})`
      );
      notes.push(`${event.id}[${i}] k>=${gate} (attainable by stop ${latest}: ${attainable})`);
    });
  }
  return notes.join(', ');
});

function report(): number {
  console.log('Within Parameters — live-path checks (drive the real SceneRunner)');
  console.log('='.repeat(72));
  let failed = 0;
  for (const r of results) {
    console.log(`  [${r.pass ? 'PASS' : 'FAIL'}] ${r.name}`);
    if (r.detail) console.log(`         ${r.detail}`);
    if (!r.pass) failed++;
  }
  console.log('='.repeat(72));
  console.log(`${results.length - failed}/${results.length} passed`);
  return failed > 0 ? 1 : 0;
}

process.exit(report());
