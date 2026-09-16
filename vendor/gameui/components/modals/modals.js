/**
 * GameUI Modal and Dialog Factory
 * =============================================================================
 * Wraps the static-structure modal chrome (modals.css) into a live dialog
 * control with focus management. Implements:
 *
 *   - Open/close via class toggle (.is-open) and aria-hidden sync
 *   - Focus trap: Tab cycles within the dialog while open
 *   - Focus restore: the element focused before opening gets focus back on close
 *   - Escape closes; backdrop click closes (unless closable=false)
 *   - Confirm/cancel and alert/warning variants via options.variant
 *
 * The factory never touches game state; consumers wire onClose / onConfirm.
 *
 * Load as an ES module:
 *   import { createModal } from "./ui/components/modals/modals.js";
 *
 *   const dialog = createModal({
 *     title: "Discard item?",
 *     body: "<p>This action cannot be undone.</p>",
 *     variant: "dialog",
 *     accent: "danger",
 *     buttons: [
 *       { label: "Cancel", variant: "ghost", onClick: (close) => close() },
 *       { label: "Discard", accent: "danger", onClick: (close) => { discard(); close(); } },
 *     ],
 *     onClose: (reason) => console.log("closed", reason),
 *   });
 *   document.body.appendChild(dialog.el);
 *   dialog.open();
 * =============================================================================
 */

let modalIdSeq = 0;

/**
 * Create a modal/dialog control.
 * @param {object} options
 * @param {string} [options.title]       Heading text.
 * @param {string|Node} [options.body]   Body content (HTML string or node).
 * @param {string} [options.variant]     "modal" (default) or "dialog".
 * @param {string} [options.accent]      primary | success | warning | danger | magic.
 * @param {boolean} [options.closable]   Default true. False hides close + blocks backdrop/Esc.
 * @param {Array}  [options.buttons]     [{label, accent?, variant?, onClick?(close, event), closes?}]
 * @param {() => void} [options.onOpen]
 * @param {(reason: string) => void} [options.onClose] reason: "button","esc","backdrop","api".
 * @returns {{el, open, close, isOpen, setContent, setTitle, onClose}}
 */
export function createModal(options = {}) {
  const opts = options || {};
  const variant = opts.variant || "modal";
  const accent = opts.accent || "primary";
  const closable = opts.closable !== false;
  const role = variant === "dialog" || accent === "danger" || accent === "warning"
    ? "alertdialog"
    : "dialog";

  const id = `gui-modal-${++modalIdSeq}`;
  const titleId = `${id}-title`;
  const bodyId = `${id}-body`;

  const root = document.createElement("div");
  root.className = `gui-modal gui-modal--${variant}`;
  if (accent !== "primary") root.classList.add(`gui-modal--${accent}`);
  root.setAttribute("role", role);
  root.setAttribute("aria-modal", "true");
  root.setAttribute("aria-hidden", "true");
  root.setAttribute("aria-labelledby", titleId);
  root.setAttribute("aria-describedby", bodyId);

  const backdrop = document.createElement("div");
  backdrop.className = "gui-modal__backdrop";
  root.appendChild(backdrop);

  const dialog = document.createElement("div");
  dialog.className = "gui-modal__dialog";
  root.appendChild(dialog);

  const header = document.createElement("div");
  header.className = "gui-modal__header";
  const title = document.createElement("h2");
  title.className = "gui-modal__title";
  title.id = titleId;
  title.textContent = opts.title || "";
  header.appendChild(title);

  const closeBtn = document.createElement("button");
  closeBtn.type = "button";
  closeBtn.className = "gui-modal__close";
  closeBtn.setAttribute("aria-label", "Close dialog");
  closeBtn.textContent = "✕";
  if (closable) header.appendChild(closeBtn);
  dialog.appendChild(header);

  const body = document.createElement("div");
  body.className = "gui-modal__body";
  body.id = bodyId;
  dialog.appendChild(body);

  const footer = document.createElement("div");
  footer.className = "gui-modal__footer";
  dialog.appendChild(footer);

  setContent(opts.body);
  renderButtons(opts.buttons);

  let openHandler = typeof opts.onOpen === "function" ? opts.onOpen : null;
  let closeHandler = typeof opts.onClose === "function" ? opts.onClose : null;
  let isOpen = false;
  let previouslyFocused = null;

  function setContent(next) {
    body.textContent = "";
    if (next == null) return;
    if (typeof next === "string") {
      body.innerHTML = next;
    } else if (next instanceof Node) {
      body.appendChild(next);
    }
  }

  function setTitle(next) {
    title.textContent = next != null ? String(next) : "";
  }

  function renderButtons(buttonsCfg) {
    footer.textContent = "";
    const list = Array.isArray(buttonsCfg) ? buttonsCfg : [];
    if (list.length === 0) {
      footer.style.display = "none";
      return;
    }
    footer.style.display = "";
    list.forEach((cfg) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "gui-btn";
      const btnAccent = cfg.accent || "ghost";
      btn.classList.add(`gui-btn--${btnAccent}`);
      if (cfg.variant === "ghost" || cfg.variant === "outline" || cfg.variant === "pill") {
        btn.classList.add(`gui-btn--${cfg.variant}`);
      }
      btn.textContent = cfg.label || "";
      const shouldClose = cfg.closes !== false;
      btn.addEventListener("click", (event) => {
        if (typeof cfg.onClick === "function") {
          cfg.onClick(close, event);
        }
        if (shouldClose) close("button");
      });
      footer.appendChild(btn);
    });
  }

  function getFocusable() {
    const selector = 'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';
    return Array.from(root.querySelectorAll(selector)).filter(
      (elx) => elx.offsetParent !== null || elx === document.activeElement
    );
  }

  function trapFocus(event) {
    if (event.key !== "Tab") return;
    const focusable = getFocusable();
    if (focusable.length === 0) {
      event.preventDefault();
      dialog.focus();
      return;
    }
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  function onKeydown(event) {
    if (!isOpen) return;
    if (event.key === "Escape" && closable) {
      event.preventDefault();
      close("esc");
      return;
    }
    trapFocus(event);
  }

  function open() {
    if (isOpen) return;
    previouslyFocused = document.activeElement;
    root.classList.add("is-open");
    root.setAttribute("aria-hidden", "false");
    isOpen = true;
    document.addEventListener("keydown", onKeydown);
    // Move focus into the dialog on the next frame.
    requestAnimationFrame(() => {
      const focusable = getFocusable();
      (focusable[0] || dialog).focus();
      if (!focusable.length) dialog.setAttribute("tabindex", "-1");
    });
    if (openHandler) openHandler();
  }

  function close(reason = "api") {
    if (!isOpen) return;
    root.classList.remove("is-open");
    root.setAttribute("aria-hidden", "true");
    isOpen = false;
    document.removeEventListener("keydown", onKeydown);
    if (previouslyFocused && typeof previouslyFocused.focus === "function") {
      previouslyFocused.focus();
    }
    if (closeHandler) closeHandler(reason);
  }

  // Backdrop and explicit close button.
  backdrop.addEventListener("click", () => {
    if (closable) close("backdrop");
  });
  closeBtn.addEventListener("click", () => close("button"));

  return {
    el: root,
    open,
    close,
    isOpen: () => isOpen,
    setContent,
    setTitle,
    setButtons: renderButtons,
    onOpen(fn) {
      openHandler = typeof fn === "function" ? fn : openHandler;
    },
    onClose(fn) {
      closeHandler = typeof fn === "function" ? fn : closeHandler;
    },
  };
}
