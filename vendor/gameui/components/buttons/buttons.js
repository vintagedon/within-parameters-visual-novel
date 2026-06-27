/**
 * GameUI Button Factory
 * =============================================================================
 * Wraps the static-structure button CSS (buttons.css) into a live control. The
 * factory owns DOM creation and state hooks; it never touches game state. The
 * consumer wires `onClick` to whatever downstream action they need.
 *
 * The factory emits the same `.gui-btn` classes the CSS already styles, so
 * every visual variant (solid, outline, ghost, pill, icon, square, tab, plus
 * the seven accent roles) is available by name. No skin value lives here; the
 * accent role is a class that resolves to tokens via the preset.
 *
 * Load as an ES module:
 *   import { createButton } from "./ui/components/buttons/buttons.js";
 *
 *   const btn = createButton({
 *     label: "Play",
 *     accent: "primary",
 *     variant: "solid",
 *     onClick: () => startGame(),
 *   });
 *   document.body.appendChild(btn.el);
 * =============================================================================
 */

// -----------------------------------------------------------------------------
// Public factory
// -----------------------------------------------------------------------------

/**
 * Create a live button control.
 *
 * @param {object} options
 * @param {string} [options.label]      Visible label text. Omit for icon-only.
 * @param {string} [options.icon]       Inline glyph/HTML for the icon span.
 * @param {string} [options.accent]     Accent role: primary (default), success,
 *                                      warning, danger, info, magic, pink.
 * @param {string} [options.variant]    solid (default), outline, ghost, pill,
 *                                      icon, square, tab.
 * @param {string} [options.ariaLabel]  Accessible name (required for icon-only).
 * @param {boolean} [options.disabled]  Initial disabled state.
 * @param {boolean} [options.active]    Initial pressed/selected (tab variant).
 * @param {() => void} [options.onClick] Click handler.
 * @returns {{el: HTMLButtonElement, setLabel, setAccent, setVariant,
 *           setDisabled, setActive, onClick}}
 */
export function createButton(options = {}) {
  const opts = options || {};
  const accent = opts.accent || "primary";
  const variant = opts.variant || "solid";

  const el = document.createElement("button");
  el.type = "button";
  el.className = `gui-btn gui-btn--${accent}`;
  if (variant && variant !== "solid") {
    el.classList.add(`gui-btn--${variant}`);
  }

  renderContent(el, opts);

  if (opts.ariaLabel) el.setAttribute("aria-label", opts.ariaLabel);
  if (opts.disabled) el.disabled = true;
  if (opts.active) {
    el.classList.add("is-active");
    el.setAttribute("aria-selected", "true");
  }

  let clickHandler = typeof opts.onClick === "function" ? opts.onClick : null;
  el.addEventListener("click", (event) => {
    if (el.disabled) return;
    if (clickHandler) clickHandler(event, { el });
  });

  /** Replace the inner label/icon content for the current config. */
  function renderContent(node, cfg) {
    node.textContent = "";
    if (cfg.icon) {
      const iconSpan = document.createElement("span");
      iconSpan.className = "gui-btn__icon";
      iconSpan.setAttribute("aria-hidden", "true");
      iconSpan.innerHTML = cfg.icon;
      node.appendChild(iconSpan);
    }
    if (cfg.label) {
      const labelSpan = document.createElement("span");
      labelSpan.textContent = cfg.label;
      node.appendChild(labelSpan);
    }
    if (!cfg.icon && !cfg.label && cfg.text) {
      node.textContent = cfg.text;
    }
  }

  return {
    el,
    setLabel(label) {
      opts.label = label;
      renderContent(el, opts);
    },
    setIcon(icon) {
      opts.icon = icon;
      renderContent(el, opts);
    },
    setAccent(next) {
      el.classList.remove(`gui-btn--${accent}`);
      el.classList.add(`gui-btn--${next || "primary"}`);
    },
    setVariant(next) {
      if (variant && variant !== "solid") el.classList.remove(`gui-btn--${variant}`);
      if (next && next !== "solid") el.classList.add(`gui-btn--${next}`);
    },
    setDisabled(disabled) {
      el.disabled = !!disabled;
    },
    setActive(active) {
      el.classList.toggle("is-active", !!active);
      el.setAttribute("aria-selected", String(!!active));
    },
    onClick(fn) {
      clickHandler = typeof fn === "function" ? fn : clickHandler;
    },
  };
}
