/**
 * GameUI Card Primitive Factory
 * =============================================================================
 * Creates a live card control with frame, title/body/footer/type-tag slots,
 * and selectable/disabled states. The card is the composable backbone for
 * entity panels and dossier entries: body and footer accept any HTMLElement,
 * so a card can hold a stat bar, a button row, another factory's output, or
 * arbitrary markup.
 *
 * Selection and click surface:
 *   - selectable cards are focusable (tabindex=0) and toggle .is-selected
 *     on click / Enter / Space
 *   - onClick fires on click; onSelect fires when selection changes
 *   - disabled cards drop out of interaction entirely
 *
 * The factory never touches game state; the consumer wires the callbacks.
 *
 * Load as an ES module:
 *   import { createCard } from "./ui/components/cards/cards.js";
 *
 *   const card = createCard({
 *     title: "Fireball",
 *     tag: { label: "Spell", accent: "magic" },
 *     body: statBar.el,
 *     footer: [castBtn.el, cancelBtn.el],
 *     selectable: true,
 *     onSelect: (selected) => toggleEquip(selected),
 *   });
 *   grid.appendChild(card.el);
 * =============================================================================
 */

/**
 * Create a card control.
 * @param {object} options
 * @param {string} [options.title]     Heading text.
 * @param {string} [options.subtitle]  Optional muted line under the title.
 * @param {string|{label,string?,accent?}} [options.tag]  Type-tag content.
 * @param {string|Node|Node[]} [options.body]   Body slot (HTML string, node, or array).
 * @param {string|Node|Node[]} [options.footer] Footer slot (HTML string, node, or array).
 * @param {string} [options.accent]    primary ... pink.
 * @param {boolean} [options.selectable] Make the card focusable + toggleable.
 * @param {boolean} [options.selected]  Initial selected state.
 * @param {boolean} [options.disabled]  Initial disabled state.
 * @param {(event, ctx) => void} [options.onClick]
 * @param {(selected: boolean) => void} [options.onSelect]
 * @returns {{el, setSelected, setDisabled, setTitle, setBody, setTag, onClick, onSelect}}
 */
export function createCard(options = {}) {
  const opts = options || {};
  const accent = opts.accent || "primary";

  const root = document.createElement("article");
  root.className = `gui-card gui-card--${accent}`;

  // Header: title + tag.
  const header = document.createElement("header");
  header.className = "gui-card__header";

  const titleWrap = document.createElement("div");
  const title = document.createElement("div");
  title.className = "gui-card__title";
  title.textContent = opts.title || "";
  titleWrap.appendChild(title);

  const subtitle = document.createElement("div");
  subtitle.className = "gui-card__subtitle";
  if (opts.subtitle) subtitle.textContent = opts.subtitle;
  titleWrap.appendChild(subtitle);

  header.appendChild(titleWrap);

  const tagEl = document.createElement("span");
  tagEl.className = `gui-card__tag gui-card__tag--${accent}`;
  header.appendChild(tagEl);
  applyTag(tagEl, opts.tag, accent);

  root.appendChild(header);

  // Body slot.
  const body = document.createElement("div");
  body.className = "gui-card__body";
  fillSlot(body, opts.body);
  root.appendChild(body);

  // Optional footer slot.
  let footer = null;
  if (opts.footer != null) {
    footer = document.createElement("footer");
    footer.className = "gui-card__footer";
    fillSlot(footer, opts.footer);
    root.appendChild(footer);
  }

  // State + interaction.
  let selected = !!opts.selected;
  let disabled = !!opts.disabled;
  const selectable = !!opts.selectable;
  let clickHandler = typeof opts.onClick === "function" ? opts.onClick : null;
  let selectHandler = typeof opts.onSelect === "function" ? opts.onSelect : null;

  function applyState() {
    root.classList.toggle("is-selectable", selectable && !disabled);
    root.classList.toggle("is-selected", selected);
    root.classList.toggle("is-disabled", disabled);
    root.setAttribute("aria-disabled", String(disabled));
    if (selectable) {
      root.tabIndex = disabled ? -1 : 0;
      root.setAttribute("role", "button");
      root.setAttribute("aria-pressed", String(selected));
    } else {
      root.removeAttribute("role");
      root.removeAttribute("aria-pressed");
      root.tabIndex = -1;
    }
  }

  function fireSelect() {
    if (selectHandler) selectHandler(selected);
  }

  root.addEventListener("click", (event) => {
    if (disabled) return;
    if (clickHandler) clickHandler(event, { el: root });
    if (selectable) {
      selected = !selected;
      applyState();
      fireSelect();
    }
  });

  root.addEventListener("keydown", (event) => {
    if (!selectable || disabled) return;
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      selected = !selected;
      applyState();
      fireSelect();
      if (clickHandler) clickHandler(event, { el: root });
    }
  });

  applyState();

  return {
    el: root,
    setSelected(next) {
      if (!selectable) return;
      selected = !!next;
      applyState();
    },
    isSelected: () => selected,
    setDisabled(next) {
      disabled = !!next;
      applyState();
    },
    setTitle(text) {
      title.textContent = text != null ? String(text) : "";
    },
    setSubtitle(text) {
      subtitle.textContent = text != null ? String(text) : "";
    },
    setBody(content) {
      fillSlot(body, content);
    },
    setTag(tag) {
      applyTag(tagEl, tag, accent);
    },
    onClick(fn) {
      clickHandler = typeof fn === "function" ? fn : clickHandler;
    },
    onSelect(fn) {
      selectHandler = typeof fn === "function" ? fn : selectHandler;
    },
  };
}

/** Apply tag config: a plain string or {label, accent}. */
function applyTag(el, tag, defaultAccent) {
  if (tag == null) {
    el.style.display = "none";
    el.textContent = "";
    return;
  }
  el.style.display = "";
  if (typeof tag === "string") {
    el.textContent = tag;
    return;
  }
  el.textContent = tag.label || "";
  const a = tag.accent || defaultAccent;
  el.className = `gui-card__tag gui-card__tag--${a}`;
}

/** Fill a slot element from string / Node / array content. */
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
