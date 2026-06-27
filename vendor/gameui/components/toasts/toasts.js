/**
 * GameUI Toast Manager Factory
 * =============================================================================
 * Wraps the display-only toast chrome (toasts.css) into a live notification
 * manager. The factory owns the toast region, enqueue/dismiss/dedupe, the
 * auto-dismiss timer, and the aria-live region semantics. It never touches
 * game state; consumers call `enqueue({...})` to surface an event.
 *
 * Surface:
 *   - enqueue(toast) -> id   Schedule a toast; returns its id.
 *   - dismiss(id)              Remove a toast early (plays exit animation).
 *   - clear()                  Dismiss all toasts.
 *   - onEnqueue(fn)            Observe new toasts (for SFX hookups, etc.).
 *
 * Dedupe: when `dedupe` is true, enqueuing a toast whose title+type matches a
 * toast already on screen bumps a counter badge instead of stacking a duplicate.
 *
 * Load as an ES module:
 *   import { createToaster } from "./ui/components/toasts/toasts.js";
 *
 *   const toast = createToaster({ position: "bottom-right", duration: 4000 });
 *   document.body.appendChild(toast.el);
 *   toast.enqueue({ type: "success", title: "Saved", message: "Game saved." });
 * =============================================================================
 */

let toastIdSeq = 0;

const VALID_TYPES = [
  "achievement", "primary", "success", "reward", "save", "item",
  "info", "quest", "tip", "warning", "error", "danger",
  "magic", "level", "secret", "system",
];

/**
 * Create a toast manager bound to a fixed-position region.
 * @param {object} options
 * @param {string} [options.position] top-right (default), top-left, top-center,
 *                 bottom-right, bottom-left, bottom-center.
 * @param {number} [options.duration] Auto-dismiss ms. 0 = sticky. Default 4000.
 * @param {number} [options.maxVisible] Hard cap before oldest is dropped. Default 5.
 * @param {boolean} [options.dedupe] Collapse identical title+type into a count. Default true.
 * @param {(toast: object) => void} [options.onEnqueue]
 * @returns {{el, enqueue, dismiss, clear, onEnqueue}}
 */
export function createToaster(options = {}) {
  const opts = options || {};
  const position = opts.position || "bottom-right";
  const defaultDuration = opts.duration != null ? opts.duration : 4000;
  const maxVisible = opts.maxVisible || 5;
  const dedupe = opts.dedupe !== false;

  const region = document.createElement("section");
  region.className = `gui-toast-region gui-toast-region--${position}`;
  region.setAttribute("aria-live", "polite");
  region.setAttribute("aria-atomic", "false");

  /** @type {Map<string, {el, timer, count}>} keyed by id */
  const active = new Map();
  /** dedupe key -> id */
  const dedupeIndex = new Map();
  let enqueueObserver = typeof opts.onEnqueue === "function" ? opts.onEnqueue : null;

  function resolveType(type) {
    const t = String(type || "info");
    return VALID_TYPES.includes(t) ? t : "info";
  }

  function dedupeKey(toast) {
    return `${resolveType(toast.type)}::${toast.title || ""}`;
  }

  function buildToastEl(toast) {
    const type = resolveType(toast.type);
    const compact = toast.compact === true;

    const article = document.createElement("article");
    article.className = `gui-toast gui-toast--${type}`;
    if (compact) article.classList.add("gui-toast--compact");
    article.setAttribute("role", toast.role || "status");

    if (toast.icon != null) {
      const icon = document.createElement("span");
      icon.className = "gui-toast__icon";
      icon.setAttribute("aria-hidden", "true");
      icon.innerHTML = toast.icon;
      article.appendChild(icon);
    }

    const body = document.createElement("div");
    body.className = "gui-toast__body";
    if (toast.kicker) {
      const k = document.createElement("span");
      k.className = "gui-toast__kicker";
      k.textContent = toast.kicker;
      body.appendChild(k);
    }
    if (toast.title) {
      const t = document.createElement("h3");
      t.className = "gui-toast__title";
      t.textContent = toast.title;
      body.appendChild(t);
    }
    if (toast.message) {
      const m = document.createElement("p");
      m.className = "gui-toast__message";
      m.textContent = toast.message;
      body.appendChild(m);
    }
    if (Array.isArray(toast.chips) && toast.chips.length) {
      const meta = document.createElement("div");
      meta.className = "gui-toast__meta";
      toast.chips.forEach((chip) => {
        const c = document.createElement("span");
        c.className = "gui-toast__chip";
        c.textContent = String(chip);
        meta.appendChild(c);
      });
      body.appendChild(meta);
    }
    article.appendChild(body);

    // Progress bar (indeterminate visual unless a fraction is given).
    if (toast.progress != null) {
      const track = document.createElement("div");
      track.className = "gui-toast__progress";
      const bar = document.createElement("div");
      bar.className = "gui-toast__progress-bar";
      const pct = Math.max(0, Math.min(1, Number(toast.progress) || 0)) * 100;
      bar.style.width = `${pct}%`;
      track.appendChild(bar);
      article.appendChild(track);
    }

    // Side cell: count badge (added later by dedupe) + dismiss button.
    const side = document.createElement("div");
    side.className = "gui-toast__side";
    article.appendChild(side);

    return { article, side };
  }

  function scheduleDismiss(id, ms) {
    if (!ms) return null;
    return setTimeout(() => dismiss(id), ms);
  }

  function dismiss(id) {
    const entry = active.get(id);
    if (!entry) return;
    if (entry.timer) {
      clearTimeout(entry.timer);
      entry.timer = null;
    }
    active.delete(id);
    for (const [k, v] of dedupeIndex.entries()) {
      if (v === id) dedupeIndex.delete(k);
    }
    const { el } = entry;
    el.classList.add("is-exit");
    const remove = () => {
      if (el.parentNode) el.parentNode.removeChild(el);
    };
    // Honor the CSS exit animation; fall back to immediate removal.
    const reduced = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      remove();
    } else {
      el.addEventListener("animationend", remove, { once: true });
      setTimeout(remove, 400);
    }
  }

  function clear() {
    Array.from(active.keys()).forEach(dismiss);
  }

  function enforceCap() {
    while (active.size > maxVisible) {
      const oldest = active.keys().next().value;
      if (oldest === undefined) break;
      dismiss(oldest);
    }
  }

  function enqueue(toast) {
    const t = toast || {};
    const type = resolveType(t.type);
    const key = dedupeKey(t);

    if (dedupe && dedupeIndex.has(key)) {
      const existingId = dedupeIndex.get(key);
      const entry = active.get(existingId);
      if (entry) {
        entry.count += 1;
        renderCount(entry);
        if (entry.timer) {
          clearTimeout(entry.timer);
          entry.timer = scheduleDismiss(existingId, t.duration != null ? t.duration : defaultDuration);
        }
        return existingId;
      }
    }

    const id = `gui-toast-${++toastIdSeq}`;
    const { article, side } = buildToastEl(t);
    const dismissBtn = document.createElement("button");
    dismissBtn.type = "button";
    dismissBtn.className = "gui-toast__close";
    dismissBtn.setAttribute("aria-label", "Dismiss");
    dismissBtn.textContent = "✕";
    dismissBtn.addEventListener("click", () => dismiss(id));
    side.appendChild(dismissBtn);

    region.appendChild(article);
    const duration = t.duration != null ? t.duration : defaultDuration;
    const timer = scheduleDismiss(id, duration);
    const entry = { el: article, side, timer, count: 1 };
    active.set(id, entry);
    if (dedupe) dedupeIndex.set(key, id);
    renderCount(entry);
    enforceCap();
    if (enqueueObserver) enqueueObserver({ id, ...t, type });
    return id;
  }

  function renderCount(entry) {
    if (entry.count <= 1) {
      const badge = entry.side.querySelector(".gui-toast__count");
      if (badge) badge.remove();
      return;
    }
    let badge = entry.side.querySelector(".gui-toast__count");
    if (!badge) {
      badge = document.createElement("span");
      badge.className = "gui-toast__count";
      entry.side.insertBefore(badge, entry.side.firstChild);
    }
    badge.textContent = `x${entry.count}`;
  }

  return {
    el: region,
    enqueue,
    dismiss,
    clear,
    onEnqueue(fn) {
      enqueueObserver = typeof fn === "function" ? fn : enqueueObserver;
    },
  };
}
