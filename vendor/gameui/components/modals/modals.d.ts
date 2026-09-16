/**
 * Type declarations for the vendored modal factory.
 * Source of truth: modals.js (vanilla ES module, untyped).
 */

export interface ModalButtonConfig {
  label?: string;
  accent?: string;
  variant?: "solid" | "outline" | "ghost" | "pill";
  closes?: boolean;
  onClick?: (close: (reason?: string) => void, event: MouseEvent) => void;
}

export interface ModalOptions {
  title?: string;
  body?: string | Node;
  variant?: "modal" | "dialog";
  accent?: "primary" | "success" | "warning" | "danger" | "magic";
  closable?: boolean;
  buttons?: ModalButtonConfig[];
  onOpen?: () => void;
  onClose?: (reason: string) => void;
}

export interface ModalControl {
  el: HTMLElement;
  open: () => void;
  close: (reason?: string) => void;
  isOpen: () => boolean;
  setContent: (next: string | Node) => void;
  setTitle: (next: string) => void;
  setButtons: (buttons: ModalButtonConfig[]) => void;
  onOpen: (fn: () => void) => void;
  onClose: (fn: (reason: string) => void) => void;
}

export function createModal(options?: ModalOptions): ModalControl;
