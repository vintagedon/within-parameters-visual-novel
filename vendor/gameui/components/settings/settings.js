/**
 * GameUI Settings Controls Factory
 * =============================================================================
 * Four live controls for settings panels, each returning a control object the
 * consumer wires to game state. Every control wraps a real form control (or a
 * role=switch element), so ARIA and keyboard behavior come from the platform.
 * The factory never reads or writes game state.
 *
 *   createToggle  — compact press-to-flip button (role=switch)
 *   createSwitch  — sliding track + knob (role=switch)
 *   createSlider  — native input[type=range] with a value readout
 *   createSelect  — native select dropdown
 *
 * Load as an ES module:
 *   import {
 *     createToggle, createSwitch, createSlider, createSelect,
 *   } from "./ui/components/settings/settings.js";
 *
 *   const music = createToggle({ label: "Music", checked: true,
 *     accent: "success", onChange: (on) => audio.setMusicEnabled(on) });
 *   panel.appendChild(music.el);
 * =============================================================================
 */

// -----------------------------------------------------------------------------
// Shared: setting row wrapper
// -----------------------------------------------------------------------------

/** Build a `.gui-setting` row that pairs a label with a control element. */
function settingRow(labelText, controlEl, { column = false } = {}) {
  const row = document.createElement("label");
  row.className = "gui-setting";
  if (column) row.classList.add("gui-setting--column");

  const label = document.createElement("span");
  label.className = "gui-setting__label";
  label.textContent = labelText;
  row.appendChild(label);
  row.appendChild(controlEl);
  return row;
}

// -----------------------------------------------------------------------------
// createToggle
// -----------------------------------------------------------------------------

/**
 * Create a compact toggle button with role=switch semantics.
 * @returns {{el: HTMLElement, isChecked, setChecked, toggle, onChange}}
 */
export function createToggle(options = {}) {
  const opts = options || {};
  const accent = opts.accent || "primary";

  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = `gui-toggle gui-toggle--${accent}`;
  btn.setAttribute("role", "switch");
  btn.setAttribute("aria-checked", "false");

  let checked = !!opts.checked;
  let changeHandler = typeof opts.onChange === "function" ? opts.onChange : null;

  function apply() {
    btn.classList.toggle("is-on", checked);
    btn.setAttribute("aria-checked", String(checked));
    btn.textContent = checked ? "ON" : "OFF";
  }

  btn.addEventListener("click", () => {
    if (btn.disabled) return;
    checked = !checked;
    apply();
    if (changeHandler) changeHandler(checked);
  });

  // Space/Enter are handled natively by <button>; no extra key wiring needed.

  apply();

  if (opts.ariaLabel) btn.setAttribute("aria-label", opts.ariaLabel);

  const control = {
    el: opts.label != null ? settingRow(opts.label, btn) : btn,
    isChecked: () => checked,
    setChecked(next) {
      checked = !!next;
      apply();
    },
    toggle() {
      checked = !checked;
      apply();
      if (changeHandler) changeHandler(checked);
    },
    onChange(fn) {
      changeHandler = typeof fn === "function" ? fn : changeHandler;
    },
  };
  return control;
}

// -----------------------------------------------------------------------------
// createSwitch
// -----------------------------------------------------------------------------

/**
 * Create a sliding switch with role=switch semantics. Keyboard-operable via
 * Space and Enter (treated like a button by assistive tech with role=switch).
 * @returns {{el: HTMLElement, isChecked, setChecked, toggle, onChange}}
 */
export function createSwitch(options = {}) {
  const opts = options || {};
  const accent = opts.accent || "primary";

  const wrap = document.createElement("span");
  wrap.className = `gui-switch gui-switch--${accent}`;
  wrap.setAttribute("role", "switch");
  wrap.setAttribute("tabindex", "0");
  wrap.setAttribute("aria-checked", "false");

  const track = document.createElement("span");
  track.className = "gui-switch__track";
  const knob = document.createElement("span");
  knob.className = "gui-switch__knob";
  track.appendChild(knob);
  wrap.appendChild(track);

  let checked = !!opts.checked;
  let changeHandler = typeof opts.onChange === "function" ? opts.onChange : null;

  function apply() {
    wrap.classList.toggle("is-on", checked);
    wrap.setAttribute("aria-checked", String(checked));
  }

  function toggle() {
    checked = !checked;
    apply();
    if (changeHandler) changeHandler(checked);
  }

  wrap.addEventListener("click", () => {
    if (wrap.classList.contains("is-disabled")) return;
    toggle();
  });
  wrap.addEventListener("keydown", (event) => {
    if (wrap.classList.contains("is-disabled")) return;
    // role=switch activates on Space or Enter per WAI-ARIA authoring guide.
    if (event.key === " " || event.key === "Enter") {
      event.preventDefault();
      toggle();
    }
  });

  apply();

  if (opts.ariaLabel) wrap.setAttribute("aria-label", opts.ariaLabel);

  return {
    el: opts.label != null ? settingRow(opts.label, wrap) : wrap,
    isChecked: () => checked,
    setChecked(next) {
      checked = !!next;
      apply();
    },
    toggle,
    setDisabled(disabled) {
      wrap.classList.toggle("is-disabled", !!disabled);
      if (disabled) wrap.removeAttribute("tabindex");
      else wrap.setAttribute("tabindex", "0");
    },
    onChange(fn) {
      changeHandler = typeof fn === "function" ? fn : changeHandler;
    },
  };
}

// -----------------------------------------------------------------------------
// createSlider
// -----------------------------------------------------------------------------

/**
 * Create a range slider with a live numeric readout. Wraps input[type=range].
 * @returns {{el: HTMLElement, getValue, setValue, onChange}}
 */
export function createSlider(options = {}) {
  const opts = options || {};
  const accent = opts.accent || "primary";
  const min = opts.min != null ? Number(opts.min) : 0;
  const max = opts.max != null ? Number(opts.max) : 100;
  const step = opts.step != null ? Number(opts.step) : 1;
  const suffix = opts.suffix || "";

  const input = document.createElement("input");
  input.type = "range";
  input.className = `gui-slider gui-slider--${accent}`;
  input.min = String(min);
  input.max = String(max);
  input.step = String(step);
  input.value = String(opts.value != null ? opts.value : min);
  if (opts.ariaLabel) input.setAttribute("aria-label", opts.ariaLabel);

  const valueBox = document.createElement("span");
  valueBox.className = "gui-setting__value";

  let changeHandler = typeof opts.onChange === "function" ? opts.onChange : null;

  function fillFraction() {
    const v = Number(input.value);
    if (max === min) return 0;
    return (v - min) / (max - min);
  }

  function applyReadout() {
    const v = Number(input.value);
    valueBox.textContent = `${v}${suffix}`;
    input.style.setProperty("--slider-fill", String(fillFraction()));
  }

  input.addEventListener("input", () => {
    applyReadout();
    if (changeHandler) changeHandler(Number(input.value));
  });

  applyReadout();

  // Compose the row: label/value header on top, slider below.
  const row = document.createElement("label");
  row.className = "gui-setting gui-setting--column";

  if (opts.label != null) {
    const header = document.createElement("span");
    header.className = "gui-setting__header";
    const label = document.createElement("span");
    label.className = "gui-setting__label";
    label.textContent = opts.label;
    header.appendChild(label);
    header.appendChild(valueBox);
    row.appendChild(header);
  } else {
    row.appendChild(valueBox);
  }
  row.appendChild(input);

  return {
    el: row,
    input,
    getValue: () => Number(input.value),
    setValue(next) {
      input.value = String(next);
      applyReadout();
    },
    setDisabled(disabled) {
      input.disabled = !!disabled;
    },
    onChange(fn) {
      changeHandler = typeof fn === "function" ? fn : changeHandler;
    },
  };
}

// -----------------------------------------------------------------------------
// createSelect
// -----------------------------------------------------------------------------

/**
 * Create a styled select dropdown. Wraps native <select>.
 * @returns {{el: HTMLElement, getValue, setValue, onChange}}
 */
export function createSelect(options = {}) {
  const opts = options || {};
  const accent = opts.accent || "primary";

  const select = document.createElement("select");
  select.className = `gui-select gui-select--${accent}`;
  if (opts.ariaLabel) select.setAttribute("aria-label", opts.ariaLabel);

  const entries = Array.isArray(opts.options) ? opts.options : [];
  for (const entry of entries) {
    const opt = document.createElement("option");
    if (typeof entry === "string") {
      opt.value = entry;
      opt.textContent = entry;
    } else {
      opt.value = entry.value;
      opt.textContent = entry.label;
    }
    select.appendChild(opt);
  }
  if (opts.value != null) select.value = String(opts.value);

  let changeHandler = typeof opts.onChange === "function" ? opts.onChange : null;
  select.addEventListener("change", () => {
    if (changeHandler) changeHandler(select.value);
  });

  return {
    el: opts.label != null ? settingRow(opts.label, select) : select,
    select,
    getValue: () => select.value,
    setValue(next) {
      select.value = String(next);
    },
    setDisabled(disabled) {
      select.disabled = !!disabled;
    },
    onChange(fn) {
      changeHandler = typeof fn === "function" ? fn : changeHandler;
    },
  };
}
