/**
 * GameUI Layout Factory
 * =============================================================================
 * Two structural primitives:
 *
 *   createShell — a two-pane session container (side + main viewport). The
 *                 shell is structural: it accepts header, side, and main nodes
 *                 and lays them out with ARIA landmarks. Side is configurable
 *                 left/right with a CSS-controlled width.
 *
 *   createDrawer — an overlay flyout for settings, inventory, etc. Exposes
 *                  show(), hide(), toggle(), focus restore to the opener, and
 *                  Escape-to-close. Non-modal (aria-modal=false) by design;
 *                  pair with createModal for blocking dialogs.
 *
 * Load as an ES module:
 *   import { createShell, createDrawer } from
 *     "./ui/components/layout/layout.js";
 * =============================================================================
 */

/**
 * Create a two-pane shell.
 * @param {object} options
 * @param {string} [options.side]      "left" (default) or "right".
 * @param {string} [options.sideWidth] CSS width for the side column.
 * @param {string|Node} [options.header] Header slot content.
 * @param {string|Node} [options.sideContent] Side column content.
 * @param {string|Node} [options.mainContent] Main viewport content.
 * @returns {{el, header, side, main, setSideWidth}}
 */
export function createShell(options = {}) {
  const opts = options || {};
  const side = opts.side === "right" ? "right" : "left";

  const root = document.createElement("div");
  root.className = `gui-shell gui-shell--${side}`;
  if (opts.sideWidth) root.style.setProperty("--gui-shell-side-width", opts.sideWidth);

  const header = document.createElement("header");
  header.className = "gui-shell__header";
  header.setAttribute("role", "banner");
  fillSlot(header, opts.header);

  const sideEl = document.createElement("aside");
  sideEl.className = "gui-shell__side";
  sideEl.setAttribute("role", "complementary");
  sideEl.setAttribute("aria-label", opts.sideLabel || "Side panel");
  fillSlot(sideEl, opts.sideContent);

  const main = document.createElement("main");
  main.className = "gui-shell__main";
  main.setAttribute("role", "main");
  fillSlot(main, opts.mainContent);

  root.append(header, sideEl, main);

  return {
    el: root,
    header,
    side: sideEl,
    main,
    setSideWidth(width) {
      root.style.setProperty("--gui-shell-side-width", width);
    },
  };
}

let drawerIdSeq = 0;

/**
 * Create a flyout drawer.
 * @param {object} options
 * @param {string} [options.side]    "left" (default) or "right".
 * @param {string} [options.title]   Drawer heading.
 * @param {string} [options.accent]  primary ... pink.
 * @param {string|Node} [options.content] Body slot.
 * @param {boolean} [options.closable] Default true.
 * @param {() => void} [options.onShow]
 * @param {() => void} [options.onHide]
 * @returns {{el, show, hide, toggle, isOpen, setContent, onShow, onHide}}
 */
export function createDrawer(options = {}) {
  const opts = options || {};
  const side = opts.side === "right" ? "right" : "left";
  const accent = opts.accent || "primary";
  const closable = opts.closable !== false;

  const id = `gui-drawer-${++drawerIdSeq}`;
  const root = document.createElement("aside");
  root.className = `gui-drawer gui-drawer--${side} gui-drawer--${accent}`;
  root.setAttribute("aria-hidden", "true");
  root.setAttribute("role", "dialog");
  root.setAttribute("aria-modal", "false");
  root.setAttribute("aria-labelledby", `${id}-title`);

  const backdrop = document.createElement("div");
  backdrop.className = "gui-drawer__backdrop";
  root.appendChild(backdrop);

  const panel = document.createElement("div");
  panel.className = "gui-drawer__panel";
  root.appendChild(panel);

  const header = document.createElement("header");
  header.className = "gui-drawer__header";
  const title = document.createElement("h2");
  title.className = "gui-drawer__title";
  title.id = `${id}-title`;
  title.textContent = opts.title || "";
  header.appendChild(title);

  const closeBtn = document.createElement("button");
  closeBtn.type = "button";
  closeBtn.className = "gui-drawer__close";
  closeBtn.setAttribute("aria-label", "Close drawer");
  closeBtn.textContent = "✕";
  if (closable) header.appendChild(closeBtn);
  panel.appendChild(header);

  const body = document.createElement("div");
  body.className = "gui-drawer__body";
  fillSlot(body, opts.content);
  panel.appendChild(body);

  let open = false;
  let showHandler = typeof opts.onShow === "function" ? opts.onShow : null;
  let hideHandler = typeof opts.onHide === "function" ? opts.onHide : null;
  let openerEl = null;

  function onKeydown(event) {
    if (!open) return;
    if (event.key === "Escape" && closable) {
      event.preventDefault();
      hide();
    }
  }

  function show(opener) {
    if (open) return;
    openerEl = opener instanceof Node ? opener : document.activeElement;
    root.classList.add("is-open");
    root.setAttribute("aria-hidden", "false");
    open = true;
    document.addEventListener("keydown", onKeydown);
    // Move focus into the panel for keyboard users.
    requestAnimationFrame(() => {
      const target = panel.querySelector("[data-drawer-focus]") || closeBtn || panel;
      if (target && typeof target.focus === "function") target.focus();
    });
    if (showHandler) showHandler();
  }

  function hide() {
    if (!open) return;
    root.classList.remove("is-open");
    root.setAttribute("aria-hidden", "true");
    open = false;
    document.removeEventListener("keydown", onKeydown);
    if (openerEl && typeof openerEl.focus === "function") {
      openerEl.focus();
    }
    if (hideHandler) hideHandler();
  }

  function toggle(opener) {
    if (open) hide();
    else show(opener);
  }

  function setContent(content) {
    fillSlot(body, content);
  }

  backdrop.addEventListener("click", () => {
    if (closable) hide();
  });
  closeBtn.addEventListener("click", () => hide());

  return {
    el: root,
    show,
    hide,
    toggle,
    isOpen: () => open,
    setContent,
    onShow(fn) {
      showHandler = typeof fn === "function" ? fn : showHandler;
    },
    onHide(fn) {
      hideHandler = typeof fn === "function" ? fn : hideHandler;
    },
  };
}

/** Fill a slot element from string / Node content. */
function fillSlot(slot, content) {
  slot.textContent = "";
  if (content == null) return;
  if (typeof content === "string") {
    slot.innerHTML = content;
    return;
  }
  const items = Array.isArray(content) ? content : [content];
  items.forEach((item) => {
    if (item == null) return;
    if (item instanceof Node) slot.appendChild(item);
    else slot.appendChild(document.createTextNode(String(item)));
    });
}
