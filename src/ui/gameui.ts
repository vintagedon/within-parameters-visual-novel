/**
 * GameUI factory bridge — typed re-export of the vendored framework factories.
 *
 * This module is the single boundary between WP's TypeScript code and the
 * vendored vanilla-JS framework under vendor/gameui/. Every WP module that
 * needs a live framework control imports from here, not from the vendor path
 * directly, so the JS dependency surface stays in one auditable place.
 *
 * Imports are extensionless: TypeScript resolves them to the co-located
 * .d.ts declarations, and Vite resolves them to the .js source at runtime.
 *
 * @module ui/gameui
 */

export { createButton } from "../../vendor/gameui/components/buttons/buttons";
export type { ButtonOptions, ButtonControl } from "../../vendor/gameui/components/buttons/buttons";
export { createModal } from "../../vendor/gameui/components/modals/modals";
export type { ModalOptions, ModalControl, ModalButtonConfig } from "../../vendor/gameui/components/modals/modals";
export {
  createToggle,
  createSwitch,
  createSlider,
  createSelect,
} from "../../vendor/gameui/components/settings/settings";
export type {
  SettingOptions,
  SwitchControl,
  SliderOptions,
  SliderControl,
  SelectOptions,
  SelectControl,
} from "../../vendor/gameui/components/settings/settings";
export { createCard } from "../../vendor/gameui/components/cards/cards";
export type { CardOptions, CardControl } from "../../vendor/gameui/components/cards/cards";
