/**
 * GameUI SFX Manager Factory
 * =============================================================================
 * Wraps the sanitized UI sound effects (copied from tiny-ui-sfx-pack into
 * ./audio/) into a small playback manager with mute persistence. The factory
 * preloads each sound as an HTMLAudioElement, exposes a play(name) surface
 * keyed to UI event names, and persists the mute flag in LocalStorage so the
 * player's preference survives reloads.
 *
 * No audio is fetched over the network at runtime. Every src resolves to a
 * local file under ./audio/ relative to this module's location (passed in via
 * audioBasePath, which the gallery and consumers set to match their file copy).
 *
 * The default event-to-sound mapping mirrors the pack's
 * templates/ui-sound-map.json. Consumers can override per-event or add new
 * events via the `mapping` option or setMapping().
 *
 * Load as an ES module:
 *   import { createSfxManager } from "./ui/components/sfx/sfx.js";
 *
 *   const sfx = createSfxManager({
 *     audioBasePath: "./ui/components/sfx/audio",
 *   });
 *   sfx.play("confirm");        // play a confirm variant
 *   sfx.setMuted(true);         // mute + persist
 *
 * UI wiring (optional, the gallery does this):
 *   button.addEventListener("click", () => sfx.play("button_press"));
 * =============================================================================
 */

// -----------------------------------------------------------------------------
// Default event mapping (mirrors tiny-ui-sfx-pack/templates/ui-sound-map.json)
// -----------------------------------------------------------------------------
// Each event maps to one or more variant files in ./audio/. play(name) picks a
// random variant so repeated clicks do not sound mechanical. File basenames use
// the pack's hyphen convention (the source's underscore names were normalized
// during the copy into ./audio/).
const DEFAULT_MAPPING = {
  button_hover: ["hover-01.wav", "hover-02.wav", "hover-03.wav"],
  button_press: ["click-01.wav", "click-02.wav", "click-03.wav"],
  confirm: ["confirm-01.wav", "confirm-02.wav", "confirm-03.wav"],
  cancel: ["cancel-01.wav", "cancel-02.wav"],
  error: ["error-01.wav", "error-02.wav"],
  warning: ["alert-01.wav", "alert-02.wav"],
  toggle_on: ["toggle-02.wav", "toggle-04.wav"],
  toggle_off: ["toggle-01.wav", "toggle-03.wav"],
  panel_open: ["transition-02.wav", "transition-04.wav"],
  panel_close: ["transition-01.wav", "transition-03.wav"],
};

const DEFAULT_STORAGE_KEY = "gui-sfx-muted";

/**
 * Create an SFX manager.
 * @param {object} options
 * @param {string} [options.audioBasePath] Path to the audio directory. Defaults
 *                to "./audio" relative to the document base URL; the gallery and
 *                consumers pass the absolute-from-root path to their file copy.
 * @param {object} [options.mapping] Overrides / additions merged onto the default map.
 * @param {boolean} [options.muted] Initial mute state. Defaults to persisted value.
 * @param {number} [options.volume] Master volume 0..1. Default 0.6.
 * @param {string} [options.storageKey] LocalStorage key for mute persistence.
 * @returns {{play, setMuted, isMuted, setVolume, setMapping, preload}}
 */
export function createSfxManager(options = {}) {
  const opts = options || {};
  const audioBasePath = (opts.audioBasePath || "./audio").replace(/\/$/, "");
  const storageKey = opts.storageKey || DEFAULT_STORAGE_KEY;
  const volume = clamp01(opts.volume != null ? opts.volume : 0.6);

  let mapping = mergeMapping(DEFAULT_MAPPING, opts.mapping);
  let muted = resolveInitialMute(opts.muted, storageKey);

  // Cache: filename -> HTMLAudioElement (cloned for overlap-friendly playback).
  const cache = new Map();

  function resolveInitialMute(initial, key) {
    if (typeof initial === "boolean") return initial;
    try {
      return localStorage.getItem(key) === "1";
    } catch (err) {
      // LocalStorage may be unavailable (private mode, sandbox); degrade silently.
      return false;
    }
  }

  function persistMute() {
    try {
      localStorage.setItem(storageKey, muted ? "1" : "0");
    } catch (err) {
      /* ignore persistence failures */
    }
  }

  function urlFor(file) {
    if (/^https?:|^data:|^blob:/i.test(file)) return file;
    return `${audioBasePath}/${file}`;
  }

  function load(file) {
    if (cache.has(file)) return cache.get(file);
    const audio = new Audio();
    audio.preload = "auto";
    audio.src = urlFor(file);
    audio.volume = volume;
    cache.set(file, audio);
    return audio;
  }

  /**
   * Play one variant of the named event. No-op when muted or when the event
   * is unknown. Resolves after playback starts (or immediately when muted).
   */
  function play(name) {
    if (muted) return Promise.resolve(false);
    const variants = mapping[name];
    if (!variants || !variants.length) return Promise.resolve(false);
    const file = variants[Math.floor(Math.random() * variants.length)];
    const base = load(file);
    // Clone the cached element so rapid repeats can overlap.
    const clip = base.cloneNode(true);
    clip.volume = volume;
    clip.currentTime = 0;
    const promise = clip.play();
    if (promise && typeof promise.catch === "function") {
      promise.catch(() => {
        // Autoplay can be blocked until a user gesture; surface nothing.
      });
    }
    return Promise.resolve(true);
  }

  function setMuted(next) {
    muted = !!next;
    persistMute();
    return muted;
  }

  function isMuted() {
    return muted;
  }

  function setVolume(next) {
    const v = clamp01(next);
    cache.forEach((a) => {
      a.volume = v;
    });
    return v;
  }

  function setMapping(next) {
    mapping = mergeMapping(DEFAULT_MAPPING, next);
  }

  function preload() {
    Object.values(mapping).forEach((variants) => {
      variants.forEach((file) => load(file));
    });
  }

  return { play, setMuted, isMuted, setVolume, setMapping, preload, getMapping: () => mapping };
}

// -----------------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------------

function clamp01(v) {
  const n = Number(v);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(1, n));
}

function mergeMapping(base, extra) {
  const out = {};
  Object.keys(base).forEach((k) => {
    out[k] = base[k].slice();
  });
  if (extra && typeof extra === "object") {
    Object.keys(extra).forEach((k) => {
      const v = extra[k];
      out[k] = Array.isArray(v) ? v.slice() : [v];
    });
  }
  return out;
}
