/**
 * Framework bridge — WP compositions over the vendored gc framework.
 *
 * The gc framework publishes CSS primitives (panel, button, input, the meter
 * family) with no JS factories and no modal, card, settings, dialogue, or
 * stage host. This module is the single boundary between WP's TypeScript and
 * those primitives: every WP module that needs a control imports from here.
 * The factories keep the shapes WP's screens already consume; the DOM they
 * emit is gc classes plus WP `wp-*` composition, styled in wp.css inside the
 * overrides cascade layer. The framework is never edited.
 *
 * Accents collapse to the WP role palette (composition contract section 6):
 * cyan for systems (primary, info), amber for inhabited and human (success,
 * warning), red for danger (danger); magic reads as cyan. The mapping lands
 * as a data-wp-accent attribute; wp.css scopes --gc-accent per value.
 *
 * @module ui/gameui
 */

export type WpAccent = 'cyan' | 'amber' | 'red';

const ACCENT_MAP: Record<string, WpAccent> = {
  primary: 'cyan',
  info: 'cyan',
  magic: 'cyan',
  success: 'amber',
  warning: 'amber',
  danger: 'red',
};

export interface ButtonOptions {
  label?: string | undefined;
  accent?: string | undefined;
  variant?: 'solid' | 'outline' | 'ghost' | undefined;
  ariaLabel?: string;
  disabled?: boolean;
  onClick?: (event: MouseEvent, ctx: { el: HTMLButtonElement }) => void;
}

export interface ButtonControl {
  el: HTMLButtonElement;
  setLabel: (label: string) => void;
  setDisabled: (disabled: boolean) => void;
}

export function createButton(options: ButtonOptions = {}): ButtonControl {
  const el = document.createElement('button');
  el.type = 'button';
  el.className = 'gc-button';
  if (options.variant) el.dataset.variant = options.variant;
  const accent = ACCENT_MAP[options.accent ?? 'primary'] ?? 'cyan';
  el.dataset.wpAccent = accent;
  if (options.ariaLabel) el.setAttribute('aria-label', options.ariaLabel);
  if (options.disabled) el.disabled = true;
  if (options.label !== undefined) el.textContent = options.label;
  if (options.onClick) el.addEventListener('click', (event) => options.onClick!(event, { el }));
  return {
    el,
    setLabel: (label: string) => {
      el.textContent = label;
    },
    setDisabled: (disabled: boolean) => {
      el.disabled = disabled;
    },
  };
}

export interface ModalButtonConfig {
  label?: string | undefined;
  accent?: string | undefined;
  variant?: 'solid' | 'outline' | 'ghost' | undefined;
  closes?: boolean;
  onClick?: (close: (reason?: string) => void, event: MouseEvent) => void;
}

export interface ModalOptions {
  title?: string;
  body?: string | Node;
  variant?: 'modal' | 'dialog';
  accent?: string | undefined;
  buttons?: ModalButtonConfig[];
}

export interface ModalControl {
  el: HTMLElement;
  open: () => void;
  close: (reason?: string) => void;
  isOpen: () => boolean;
  onOpen: (fn: () => void) => void;
  onClose: (fn: (reason: string) => void) => void;
}

/**
 * WP modal composition: a full-stage wp-overlay scrim carrying one gc-panel.
 * The caller mounts el inside the stage; open/close toggle `is-open` (the
 * element renders only when open). Danger confirms set data-wp-modal-danger.
 */
export function createModal(options: ModalOptions = {}): ModalControl {
  const el = document.createElement('div');
  el.className = 'wp-overlay wp-modal';
  if ((options.accent && ACCENT_MAP[options.accent] === 'red') || options.variant === 'dialog') {
    el.classList.add('wp-modal--danger');
  }

  const panel = document.createElement('div');
  panel.className = 'gc-panel wp-modal__panel';
  panel.setAttribute('role', 'dialog');
  panel.setAttribute('aria-modal', 'true');

  if (options.title) {
    const header = document.createElement('div');
    header.className = 'wp-modal__title';
    header.textContent = options.title;
    panel.appendChild(header);
  }
  if (options.body !== undefined) {
    const body = document.createElement('div');
    body.className = 'wp-modal__body';
    if (typeof options.body === 'string') body.innerHTML = options.body;
    else body.appendChild(options.body);
    panel.appendChild(body);
  }
  if (options.buttons && options.buttons.length > 0) {
    const footer = document.createElement('div');
    footer.className = 'wp-modal__footer';
    for (const cfg of options.buttons) {
      const btn = createButton({
        label: cfg.label,
        accent: cfg.accent ?? 'primary',
        variant: cfg.variant ?? 'outline',
      });
      btn.el.addEventListener('click', (event) => {
        cfg.onClick?.((reason?: string) => close(reason ?? 'button'), event);
        if (cfg.closes) close('button');
      });
      footer.appendChild(btn.el);
    }
    panel.appendChild(footer);
  }
  el.appendChild(panel);

  const openFns: Array<() => void> = [];
  const closeFns: Array<(reason: string) => void> = [];
  let open = false;

  function close(reason: string = 'closed'): void {
    if (!open) return;
    open = false;
    el.classList.remove('is-open');
    closeFns.forEach((fn) => fn(reason));
  }

  return {
    el,
    open: () => {
      if (open) return;
      open = true;
      el.classList.add('is-open');
      openFns.forEach((fn) => fn());
    },
    close,
    isOpen: () => open,
    onOpen: (fn) => openFns.push(fn),
    onClose: (fn) => closeFns.push(fn),
  };
}

export interface SettingOptions {
  label?: string | undefined;
  checked?: boolean;
  accent?: string | undefined;
  onChange?: (checked: boolean) => void;
}

export interface SwitchControl {
  el: HTMLElement;
  setChecked: (next: boolean) => void;
  isChecked: () => boolean;
}

function createActivatable(
  className: string,
  role: string,
  options: SettingOptions
): { el: HTMLElement; setChecked: (next: boolean) => void; isChecked: () => boolean; fire: () => void } {
  const el = document.createElement('button');
  el.type = 'button';
  el.className = `gc-button ${className}`;
  el.dataset.wpAccent = ACCENT_MAP[options.accent ?? 'primary'] ?? 'cyan';
  el.setAttribute('role', role);
  const label = document.createElement('span');
  label.className = 'wp-activatable-label';
  label.textContent = options.label ?? '';
  const state = document.createElement('span');
  state.className = 'wp-activatable-state';
  el.appendChild(label);
  el.appendChild(state);

  let checked = options.checked ?? false;
  const render = () => {
    el.setAttribute('aria-checked', String(checked));
    state.textContent = checked ? 'ON' : 'OFF';
  };
  render();
  const fire = () => {
    checked = !checked;
    render();
    options.onChange?.(checked);
  };
  el.addEventListener('click', fire);
  return { el, setChecked: (n) => { checked = n; render(); }, isChecked: () => checked, fire };
}

export function createSwitch(options: SettingOptions = {}): SwitchControl {
  return createActivatable('wp-switch', 'switch', options);
}

export function createToggle(options: SettingOptions = {}): SwitchControl {
  return createActivatable('wp-toggle', 'checkbox', options);
}

export interface CardTag {
  label?: string | undefined;
  accent?: string | undefined;
}

export interface CardOptions {
  title?: string;
  tag?: string | CardTag;
  body?: string | Node;
  accent?: string | undefined;
  selectable?: boolean;
  onClick?: (event: MouseEvent, ctx: { el: HTMLElement }) => void;
}

export interface CardControl {
  el: HTMLElement;
}

/** WP card composition on a gc-panel: optional tag chip, title, body. */
export function createCard(options: CardOptions = {}): CardControl {
  const el = document.createElement('div');
  el.className = 'gc-panel wp-card';
  const accent = ACCENT_MAP[options.accent ?? 'primary'] ?? 'cyan';
  el.dataset.wpAccent = accent;
  if (options.selectable) {
    el.classList.add('is-selectable');
    el.setAttribute('role', 'button');
    el.tabIndex = 0;
  }

  if (options.tag !== undefined) {
    const tag = document.createElement('div');
    tag.className = 'wp-card__tag';
    const tagAccent = typeof options.tag === 'string' ? 'cyan' : ACCENT_MAP[options.tag.accent ?? 'cyan'] ?? 'cyan';
    tag.dataset.wpAccent = tagAccent;
    tag.textContent = typeof options.tag === 'string' ? options.tag : options.tag.label ?? '';
    el.appendChild(tag);
  }
  if (options.title !== undefined) {
    const title = document.createElement('div');
    title.className = 'wp-card__title';
    title.textContent = options.title;
    el.appendChild(title);
  }
  if (options.body !== undefined) {
    const body = document.createElement('div');
    body.className = 'wp-card__body';
    if (typeof options.body === 'string') body.innerHTML = options.body;
    else body.appendChild(options.body);
    el.appendChild(body);
  }
  if (options.onClick) {
    el.addEventListener('click', (event) => options.onClick!(event, { el }));
  }
  return { el };
}
