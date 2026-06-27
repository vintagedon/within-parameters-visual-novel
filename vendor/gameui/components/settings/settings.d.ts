/**
 * Type declarations for the vendored settings factories.
 * Source of truth: settings.js (vanilla ES module, untyped).
 */

export interface SettingOptions {
  label?: string;
  checked?: boolean;
  accent?: string;
  ariaLabel?: string;
  onChange?: (checked: boolean) => void;
}

export interface SwitchControl {
  el: HTMLElement;
  isChecked: () => boolean;
  setChecked: (next: boolean) => void;
  toggle: () => void;
  setDisabled?: (disabled: boolean) => void;
  onChange: (fn: (checked: boolean) => void) => void;
}

export interface SliderOptions {
  label?: string;
  min?: number;
  max?: number;
  step?: number;
  value?: number;
  suffix?: string;
  accent?: string;
  ariaLabel?: string;
  onChange?: (value: number) => void;
}

export interface SliderControl {
  el: HTMLElement;
  input: HTMLInputElement;
  getValue: () => number;
  setValue: (next: number) => void;
  setDisabled: (disabled: boolean) => void;
  onChange: (fn: (value: number) => void) => void;
}

export interface SelectEntry {
  value: string;
  label: string;
}

export interface SelectOptions {
  label?: string;
  accent?: string;
  ariaLabel?: string;
  options?: Array<string | SelectEntry>;
  value?: string;
  onChange?: (value: string) => void;
}

export interface SelectControl {
  el: HTMLElement;
  select: HTMLSelectElement;
  getValue: () => string;
  setValue: (next: string) => void;
  setDisabled: (disabled: boolean) => void;
  onChange: (fn: (value: string) => void) => void;
}

export function createToggle(options?: SettingOptions): SwitchControl;
export function createSwitch(options?: SettingOptions): SwitchControl;
export function createSlider(options?: SliderOptions): SliderControl;
export function createSelect(options?: SelectOptions): SelectControl;
