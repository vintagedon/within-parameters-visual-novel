/**
 * Dialogue system — typewriter rendering, portrait crossfades, and choice UI.
 * All state is module-level (single dialogue area per page).
 * Click anywhere on the bottom bar to skip typewriter or advance to the next line.
 *
 * @module ui/dialogue
 */

import type {
  DialogueLine,
  Character,
  GameConfig,
} from '../types/index';
import type { ChoiceView } from '../engine/scene-runner';
import { createButton } from './gameui';

// ─── DOM References ───────────────────────────────────────────────────────────

let portraitArea: HTMLElement;
let portraitLayerA: HTMLElement;
let portraitLayerB: HTMLElement;
let speakerEl: HTMLElement;
let dialogueTextEl: HTMLElement;
let advanceIndicatorEl: HTMLElement;
let choicesAreaEl: HTMLElement;

let activePortraitLayer: 'a' | 'b' = 'a';

// ─── State ────────────────────────────────────────────────────────────────────

let typewriterTimer: ReturnType<typeof setTimeout> | null = null;
let isTyping = false;
let fullText = '';
let displayedChars = 0;
let typewriterSpeed = 30;

let onAdvance: (() => void) | null = null;

// ─── Init ─────────────────────────────────────────────────────────────────────

export function initDialogue(bottomBar: HTMLElement, config: GameConfig): void {
  typewriterSpeed = config.typewriterSpeed;

  bottomBar.innerHTML = `
    <div id="portrait-area">
      <div class="portrait-frame">
        <div id="portrait-layer-a" class="portrait-layer active"></div>
        <div id="portrait-layer-b" class="portrait-layer inactive"></div>
      </div>
    </div>
    <div id="dialogue-area">
      <div id="speaker-name"></div>
      <div id="dialogue-text"></div>
      <div id="advance-indicator">▼</div>
      <div id="choices-area"></div>
    </div>
  `;

  portraitArea = document.getElementById('portrait-area')!;
  portraitLayerA = document.getElementById('portrait-layer-a')!;
  portraitLayerB = document.getElementById('portrait-layer-b')!;
  speakerEl = document.getElementById('speaker-name')!;
  dialogueTextEl = document.getElementById('dialogue-text')!;
  advanceIndicatorEl = document.getElementById('advance-indicator')!;
  choicesAreaEl = document.getElementById('choices-area')!;

  advanceIndicatorEl.style.display = 'none';

  // Single click handler on bottom bar: skip typewriter or advance
  bottomBar.addEventListener('click', () => {
    if (isTyping) {
      skipTypewriter();
    } else if (choicesAreaEl.children.length === 0) {
      onAdvance?.();
    }
  });
}

// ─── Line Rendering ───────────────────────────────────────────────────────────

/** Renders a single dialogue line: updates speaker name, crossfades portrait, starts typewriter. Calls onComplete when the line is ready to advance. */
export function renderLine(
  line: DialogueLine,
  character: Character | null,
  portraits: Map<string, string>, // expressionKey → placeholder color
  onComplete: () => void
): void {
  clearChoices();
  advanceIndicatorEl.style.display = 'none';

  // Speaker name
  if (character && character.id !== 'narrator') {
    speakerEl.textContent = character.name;
    speakerEl.style.color = character.nameColor;
  } else {
    speakerEl.textContent = '';
  }

  // Portrait
  updatePortrait(line, character, portraits);

  // Typewriter
  startTypewriter(line.text, () => {
    advanceIndicatorEl.style.display = 'block';
    onComplete();
  });
}

function updatePortrait(
  line: DialogueLine,
  character: Character | null,
  portraitColors: Map<string, string>
): void {
  // The protagonist never renders a portrait in the dialogue bar (engine
  // contract), the narrator has none, and the archive is a voice on a
  // terminal rather than a face.
  if (
    !character ||
    character.id === 'narrator' ||
    character.id === 'protagonist' ||
    character.id === 'archive'
  ) {
    portraitArea.classList.add('hidden');
    return;
  }

  portraitArea.classList.remove('hidden');

  const expressionKey = line.expression ?? character.defaultExpression;
  const assetKey = character.expressions[expressionKey] ?? character.expressions[character.defaultExpression] ?? '';
  const placeholderColor = portraitColors.get(assetKey) ?? 'var(--gui-surface-strong)';
  const initials = character.name
    .split(' ')
    .map((w) => w[0] ?? '')
    .join('')
    .slice(0, 2)
    .toUpperCase();

  const incoming = activePortraitLayer === 'a' ? portraitLayerB : portraitLayerA;
  const outgoing = activePortraitLayer === 'a' ? portraitLayerA : portraitLayerB;

  incoming.innerHTML = '';

  const img = new Image();
  img.onload = () => {
    incoming.innerHTML = `<img src="${img.src}" alt="${character.name}" />`;
    swapPortrait(incoming, outgoing);
  };
  img.onerror = () => {
    incoming.innerHTML = `
      <div class="portrait-placeholder" style="background:${placeholderColor}">
        ${initials}
      </div>
    `;
    swapPortrait(incoming, outgoing);
  };
  img.src = `/assets/portraits/${assetKey}.png`;
}

function swapPortrait(incoming: HTMLElement, outgoing: HTMLElement): void {
  incoming.classList.remove('inactive');
  incoming.classList.add('active');
  outgoing.classList.remove('active');
  outgoing.classList.add('inactive');
  activePortraitLayer = activePortraitLayer === 'a' ? 'b' : 'a';
}

// ─── Typewriter ───────────────────────────────────────────────────────────────

function startTypewriter(text: string, onComplete: () => void): void {
  stopTypewriter();
  fullText = text;
  displayedChars = 0;
  isTyping = true;
  dialogueTextEl.textContent = '';
  dialogueTextEl.classList.add('typing');

  onAdvance = onComplete;

  function tick(): void {
    if (displayedChars >= fullText.length) {
      finishTypewriter(onComplete);
      return;
    }
    displayedChars++;
    dialogueTextEl.textContent = fullText.slice(0, displayedChars);
    typewriterTimer = setTimeout(tick, typewriterSpeed);
  }

  tick();
}

function finishTypewriter(onComplete: () => void): void {
  stopTypewriter();
  dialogueTextEl.textContent = fullText;
  dialogueTextEl.classList.remove('typing');
  isTyping = false;
  onAdvance = onComplete;
}

export function skipTypewriter(): void {
  if (!isTyping) return;
  stopTypewriter();
  dialogueTextEl.textContent = fullText;
  dialogueTextEl.classList.remove('typing');
  isTyping = false;
  advanceIndicatorEl.style.display = 'block';
}

function stopTypewriter(): void {
  if (typewriterTimer !== null) {
    clearTimeout(typewriterTimer);
    typewriterTimer = null;
  }
}

export function isTypewriterActive(): boolean {
  return isTyping;
}

// ─── Choices ──────────────────────────────────────────────────────────────────

/**
 * Renders choice buttons from the runner-resolved views. The view's label
 * already carries the effective (trait-adjusted) cost and its enabled flag is
 * the affordability/gate decision computed from the same effective values the
 * resolution will charge — display, gating, and deduction cannot disagree.
 * Unavailable choices render disabled (with the reason as a tooltip) rather
 * than hidden, so the player sees the gate exists.
 */
export function renderChoices(
  views: ChoiceView[],
  onSelect: (index: number) => void
): void {
  advanceIndicatorEl.style.display = 'none';
  clearChoices();

  views.forEach((view) => {
    const btn = createButton({
      label: view.label,
      accent: 'info',
      variant: 'outline',
      disabled: !view.enabled,
      onClick: (event) => {
        event.stopPropagation(); // prevent bottom-bar advance handler
        onSelect(view.index);
      },
    });
    btn.el.classList.add('wp-choice-btn');
    if (!view.enabled && view.reason) {
      btn.el.title = view.reason;
    }

    choicesAreaEl.appendChild(btn.el);
  });
}

export function clearChoices(): void {
  choicesAreaEl.innerHTML = '';
}

/** Resets all dialogue state — stops typewriter, clears text, clears choices. Call before starting a new game or loading a save. */
export function clearDialogue(): void {
  stopTypewriter();
  speakerEl.textContent = '';
  dialogueTextEl.textContent = '';
  dialogueTextEl.classList.remove('typing');
  clearChoices();
  advanceIndicatorEl.style.display = 'none';
  isTyping = false;
  onAdvance = null;
}
