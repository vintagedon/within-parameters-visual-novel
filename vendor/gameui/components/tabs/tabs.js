/**
 * GameUI Tabs Factory
 * =============================================================================
 * Creates a live tablist control with three orientations (top, left, right),
 * full ARIA tablist semantics, and keyboard navigation per the WAI-ARIA
 * authoring guide:
 *
 *   - ArrowLeft / ArrowRight move between tabs (top orientation)
 *   - ArrowUp / ArrowDown move between tabs (side orientations)
 *   - Home / End jump to the first / last tab
 *   - The panel is keyboard-focusable (tabindex=0) so Tab reaches it
 *
 * The factory owns DOM, ARIA wiring, and panel switching. It never touches
 * game state; the consumer wires `onChange(id)` to load panel content or
 * trigger logic.
 *
 * Load as an ES module:
 *   import { createTabs } from "./ui/components/tabs/tabs.js";
 *
 *   const tabs = createTabs({
 *     orientation: "top",
 *     accent: "magic",
 *     tabs: [
 *       { id: "status", label: "Status", content: statusPanel },
 *       { id: "map",    label: "Map",    content: "<p>Map view</p>" },
 *     ],
 *     onChange: (id) => loadTab(id),
 *   });
 *   container.appendChild(tabs.el);
 * =============================================================================
 */

let tabIdSeq = 0;

/**
 * Create a tablist control.
 * @param {object} options
 * @param {string} [options.orientation] "top" (default), "left", "right".
 * @param {string} [options.accent]      primary (default) ... pink.
 * @param {Array}  options.tabs          [{id, label, icon?, content, disabled?}]
 *   - content may be an HTMLElement, an HTML string, or plain text.
 * @param {string} [options.initial]     id of the tab to show first.
 * @param {(id: string) => void} [options.onChange] Fires on tab selection.
 * @returns {{el, select, selected, getPanel, onChange}}
 */
export function createTabs(options = {}) {
  const opts = options || {};
  const orientation = opts.orientation || "top";
  const accent = opts.accent || "primary";
  const tabsCfg = Array.isArray(opts.tabs) ? opts.tabs : [];

  const root = document.createElement("div");
  root.className = `gui-tabs gui-tabs--${orientation}`;

  const list = document.createElement("div");
  list.className = "gui-tabs__list";
  list.setAttribute("role", "tablist");
  list.setAttribute(
    "aria-orientation",
    orientation === "top" ? "horizontal" : "vertical"
  );
  root.appendChild(list);

  const tabRefs = []; // { id, tabBtn, panelEl }
  const baseId = `gui-tab-${++tabIdSeq}`;

  tabsCfg.forEach((cfg, index) => {
    const id = String(cfg.id != null ? cfg.id : index);
    const tabBtn = document.createElement("button");
    tabBtn.type = "button";
    tabBtn.className = `gui-tabs__tab gui-tabs__tab--${accent}`;
    tabBtn.setAttribute("role", "tab");
    tabBtn.id = `${baseId}-tab-${id}`;
    tabBtn.setAttribute("data-tab-id", id);
    tabBtn.setAttribute("aria-selected", "false");
    tabBtn.tabIndex = -1;

    if (cfg.icon) {
      const icon = document.createElement("span");
      icon.className = "gui-tabs__tab-icon";
      icon.setAttribute("aria-hidden", "true");
      icon.innerHTML = cfg.icon;
      tabBtn.appendChild(icon);
    }
    if (cfg.label) {
      const label = document.createElement("span");
      label.textContent = cfg.label;
      tabBtn.appendChild(label);
    }
    if (cfg.ariaLabel) tabBtn.setAttribute("aria-label", cfg.ariaLabel);
    if (cfg.disabled) tabBtn.disabled = true;

    const panelEl = document.createElement("div");
    panelEl.className = "gui-tabs__panel";
    panelEl.setAttribute("role", "tabpanel");
    panelEl.id = `${baseId}-panel-${id}`;
    panelEl.setAttribute("aria-labelledby", tabBtn.id);
    panelEl.tabIndex = 0;
    panelEl.setAttribute("data-panel-id", id);
    panelEl.appendChild(toNode(cfg.content));

    tabBtn.setAttribute("aria-controls", panelEl.id);

    list.appendChild(tabBtn);
    root.appendChild(panelEl);

    tabRefs.push({ id, tabBtn, panelEl });
  });

  let currentId = null;
  let changeHandler = typeof opts.onChange === "function" ? opts.onChange : null;

  function select(id, { focus = true } = {}) {
    let found = false;
    tabRefs.forEach((ref) => {
      const isActive = ref.id === id;
      ref.tabBtn.classList.toggle("is-active", isActive);
      ref.tabBtn.setAttribute("aria-selected", String(isActive));
      ref.tabBtn.tabIndex = isActive ? 0 : -1;
      ref.panelEl.classList.toggle("is-active", isActive);
      if (isActive) {
        found = true;
      }
    });
    if (!found) return;
    const changed = currentId !== id;
    currentId = id;
    if (focus) {
      const active = tabRefs.find((r) => r.id === id);
      if (active) active.tabBtn.focus();
    }
    if (changed && changeHandler) changeHandler(id);
  }

  function focusTab(index) {
    const ref = tabRefs[index];
    if (!ref || ref.tabBtn.disabled) return;
    select(ref.id, { focus: true });
  }

  function nextEnabled(from, step) {
    const n = tabRefs.length;
    for (let i = 1; i <= n; i += 1) {
      const idx = (from + step * i + n) % n;
      if (!tabRefs[idx].tabBtn.disabled) return idx;
    }
    return from;
  }

  function firstEnabled() {
    for (let i = 0; i < tabRefs.length; i += 1) {
      if (!tabRefs[i].tabBtn.disabled) return i;
    }
    return 0;
  }

  function lastEnabled() {
    for (let i = tabRefs.length - 1; i >= 0; i -= 1) {
      if (!tabRefs[i].tabBtn.disabled) return i;
    }
    return tabRefs.length - 1;
  }

  list.addEventListener("keydown", (event) => {
    const currentIndex = tabRefs.findIndex((r) => r.id === currentId);
    const horizontal = orientation === "top";
    const prevKey = horizontal ? "ArrowLeft" : "ArrowUp";
    const nextKey = horizontal ? "ArrowRight" : "ArrowDown";

    if (event.key === prevKey) {
      event.preventDefault();
      focusTab(nextEnabled(currentIndex, -1));
    } else if (event.key === nextKey) {
      event.preventDefault();
      focusTab(nextEnabled(currentIndex, 1));
    } else if (event.key === "Home") {
      event.preventDefault();
      focusTab(firstEnabled());
    } else if (event.key === "End") {
      event.preventDefault();
      focusTab(lastEnabled());
    }
  });

  list.addEventListener("click", (event) => {
    const btn = event.target.closest("[data-tab-id]");
    if (!btn || btn.disabled) return;
    select(btn.getAttribute("data-tab-id"), { focus: false });
  });

  // Initial selection.
  const initialId =
    opts.initial != null
      ? String(opts.initial)
      : tabRefs[firstEnabled()] && tabRefs[firstEnabled()].id;
  if (initialId != null) select(initialId, { focus: false });

  return {
    el: root,
    select(id) {
      select(String(id), { focus: false });
    },
    selected: () => currentId,
    getPanel(id) {
      const ref = tabRefs.find((r) => r.id === String(id));
      return ref ? ref.panelEl : null;
    },
    onChange(fn) {
      changeHandler = typeof fn === "function" ? fn : changeHandler;
    },
  };
}

/** Coerce content into a DOM node. */
function toNode(content) {
  if (content == null) return document.createTextNode("");
  if (typeof content === "string") {
    const wrap = document.createElement("div");
    // Treat as HTML; consumers passing plain text is fine too.
    wrap.innerHTML = content;
    const frag = document.createDocumentFragment();
    while (wrap.firstChild) frag.appendChild(wrap.firstChild);
    return frag;
  }
  if (content instanceof Node) return content;
  return document.createTextNode(String(content));
}
