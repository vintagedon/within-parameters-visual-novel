/**
 * Type declarations for the vendored card factory.
 * Source of truth: cards.js (vanilla ES module, untyped).
 */

export type CardAccent = "primary" | "success" | "warning" | "danger" | "info" | "magic" | "pink";

export interface CardTag {
  label?: string;
  accent?: string;
}

export interface CardOptions {
  title?: string;
  subtitle?: string;
  tag?: string | CardTag;
  body?: string | Node | Node[];
  footer?: string | Node | Node[];
  accent?: CardAccent;
  selectable?: boolean;
  selected?: boolean;
  disabled?: boolean;
  onClick?: (event: MouseEvent, ctx: { el: HTMLElement }) => void;
  onSelect?: (selected: boolean) => void;
}

export interface CardControl {
  el: HTMLElement;
  setSelected: (next: boolean) => void;
  isSelected: () => boolean;
  setDisabled: (next: boolean) => void;
  setTitle: (text: string) => void;
  setSubtitle: (text: string) => void;
  setBody: (content: string | Node | Node[]) => void;
  setTag: (tag: string | CardTag) => void;
  onClick: (fn: (event: MouseEvent, ctx: { el: HTMLElement }) => void) => void;
  onSelect: (fn: (selected: boolean) => void) => void;
}

export function createCard(options?: CardOptions): CardControl;
