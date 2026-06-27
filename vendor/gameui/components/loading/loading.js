/**
 * GameUI Loading States Factory
 * =============================================================================
 * Two factories for the loading family:
 *
 *   createSpinner  — a pure-CSS spinner element (ring, dot, or pulse).
 *   createLoadingOverlay — a full-screen overlay with message + optional
 *                    progress bar. show()/hide()/setProgress()/setMessage().
 *
 * Animations respect prefers-reduced-motion via the CSS layer. The overlay
 * uses role=dialog and aria-modal so screen readers announce it while open.
 *
 * Load as an ES module:
 *   import { createSpinner, createLoadingOverlay } from
 *     "./ui/components/loading/loading.js";
 *
 *   const overlay = createLoadingOverlay({ message: "Loading realm…",
 *     accent: "magic" });
 *   document.body.appendChild(overlay.el);
 *   overlay.show();
 *   overlay.setProgress(0.42);
 *   // …later…
 *   overlay.hide();
 * =============================================================================
 */

/**
 * Create a spinner element.
 * @param {object} options
 * @param {string} [options.variant] "ring" (default), "dot", "pulse".
 * @param {string} [options.accent]  primary ... pink.
 * @param {string} [options.size]    "sm", "md" (default), "lg".
 * @param {string} [options.label]   Accessible label (role=status + aria-label).
 * @returns {{el: HTMLElement}}
 */
export function createSpinner(options = {}) {
  const opts = options || {};
  const variant = opts.variant || "ring";
  const accent = opts.accent || "primary";
  const size = opts.size || "md";

  const el = document.createElement("span");
  el.className = `gui-spinner gui-spinner--${variant} gui-spinner--${accent}`;
  if (size !== "md") el.classList.add(`gui-spinner--${size}`);
  el.setAttribute("role", "status");
  el.setAttribute("aria-label", opts.label || "Loading");

  if (variant === "dot") {
    for (let i = 0; i < 3; i += 1) {
      const dot = document.createElement("span");
      dot.className = "gui-spinner__dot";
      el.appendChild(dot);
    }
  }
  return { el };
}

let overlayIdSeq = 0;

/**
 * Create a full-screen loading overlay.
 * @param {object} options
 * @param {string} [options.title]    Heading shown above the spinner.
 * @param {string} [options.message]  Subtitle line under the heading.
 * @param {string} [options.spinner]  Spinner variant: ring (default), dot, pulse.
 * @param {string} [options.accent]   primary ... pink.
 * @param {number} [options.progress] Initial 0..1 fraction, or null/undefined
 *                for indeterminate (spinner-only).
 * @param {boolean} [options.showPercent] Render a numeric percent label.
 * @returns {{el, show, hide, isOpen, setProgress, setMessage, setTitle}}
 */
export function createLoadingOverlay(options = {}) {
  const opts = options || {};
  const accent = opts.accent || "primary";
  const spinnerVariant = opts.spinner || "ring";

  const id = `gui-loading-${++overlayIdSeq}`;
  const root = document.createElement("div");
  root.className = `gui-loading-overlay gui-loading-overlay--${accent}`;
  root.setAttribute("role", "dialog");
  root.setAttribute("aria-modal", "true");
  root.setAttribute("aria-labelledby", `${id}-title`);

  const card = document.createElement("div");
  card.className = "gui-loading-overlay__card";
  root.appendChild(card);

  const spinner = createSpinner({
    variant: spinnerVariant,
    accent,
    size: "lg",
    label: opts.title || "Loading",
  });
  card.appendChild(spinner.el);

  if (opts.title) {
    const title = document.createElement("h2");
    title.className = "gui-loading-overlay__title";
    title.id = `${id}-title`;
    title.textContent = opts.title;
    card.appendChild(title);
  }

  const message = document.createElement("p");
  message.className = "gui-loading-overlay__message";
  if (opts.message) message.textContent = opts.message;
  card.appendChild(message);

  const hasProgress = opts.progress != null && !Number.isNaN(Number(opts.progress));
  let progressBar = null;
  let percentLabel = null;

  if (hasProgress || opts.showPercent) {
    const track = document.createElement("div");
    track.className = "gui-loading-overlay__progress";
    progressBar = document.createElement("div");
    progressBar.className = "gui-loading-overlay__bar";
    track.appendChild(progressBar);
    card.appendChild(track);

    if (opts.showPercent) {
      percentLabel = document.createElement("div");
      percentLabel.className = "gui-loading-overlay__percent";
      card.appendChild(percentLabel);
    }
  }

  let isOpen = false;

  function applyProgress(fraction) {
    const pct = Math.max(0, Math.min(1, Number(fraction) || 0));
    if (progressBar) progressBar.style.width = `${(pct * 100).toFixed(1)}%`;
    if (percentLabel) percentLabel.textContent = `${Math.round(pct * 100)}%`;
  }

  if (hasProgress) applyProgress(opts.progress);

  function show() {
    if (isOpen) return;
    root.classList.add("is-open");
    isOpen = true;
  }

  function hide() {
    root.classList.remove("is-open");
    isOpen = false;
  }

  return {
    el: root,
    show,
    hide,
    isOpen: () => isOpen,
    setProgress(fraction) {
      applyProgress(fraction);
    },
    setMessage(text) {
      message.textContent = text != null ? String(text) : "";
    },
    setTitle(text) {
      let title = root.querySelector(`#${id}-title`);
      if (!title) {
        title = document.createElement("h2");
        title.className = "gui-loading-overlay__title";
        title.id = `${id}-title`;
        card.insertBefore(title, message);
      }
      title.textContent = text != null ? String(text) : "";
    },
  };
}
