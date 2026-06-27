/**
 * Layout manager — builds and controls the three-pane DOM structure.
 * Viewport (65%) contains the background; sidebar (35%) holds the HUD;
 * bottom bar (33vh) holds dialogue and choices.
 * Background transitions use a two-layer crossfade (layer A/B swap).
 *
 * @module ui/layout
 */

import type { BackgroundAsset } from '../types/index';

export interface LayoutElements {
  gameContainer: HTMLElement;
  mainArea: HTMLElement;
  viewport: HTMLElement;
  sidebar: HTMLElement;
  bottomBar: HTMLElement;
  bgLayerA: HTMLElement;
  bgLayerB: HTMLElement;
}

let elements: LayoutElements | null = null;
let activeBgLayer: 'a' | 'b' = 'a';
let backgroundAssets: BackgroundAsset[] = [];

export function initLayout(root: HTMLElement): LayoutElements {
  root.innerHTML = `
    <div id="game-container" class="fullscreen">
      <div id="main-area">
        <div id="viewport">
          <div id="bg-layer-a" class="bg-layer active"></div>
          <div id="bg-layer-b" class="bg-layer inactive"></div>
        </div>
        <div id="sidebar"></div>
      </div>
      <div id="bottom-bar"></div>
    </div>
  `;

  const gameContainer = document.getElementById('game-container')!;
  const mainArea = document.getElementById('main-area')!;
  const viewport = document.getElementById('viewport')!;
  const sidebar = document.getElementById('sidebar')!;
  const bottomBar = document.getElementById('bottom-bar')!;
  const bgLayerA = document.getElementById('bg-layer-a')!;
  const bgLayerB = document.getElementById('bg-layer-b')!;

  elements = { gameContainer, mainArea, viewport, sidebar, bottomBar, bgLayerA, bgLayerB };
  return elements;
}

/**
 * AI NOTE: Must be called before any setBackground() call — backgrounds are looked up from this cached array.
 */
export function registerBackgrounds(assets: BackgroundAsset[]): void {
  backgroundAssets = assets;
}

export function setFullScreen(): void {
  elements?.gameContainer.classList.add('fullscreen');
}

export function setGameUI(): void {
  elements?.gameContainer.classList.remove('fullscreen');
}

/** Crossfades to a new background using the A/B layer swap pattern. Falls back to the asset's placeholder style if the image fails to load, or to a generic dark gradient if the asset key is unknown. */
export function setBackground(assetKey: string): void {
  if (!elements) return;

  const asset = backgroundAssets.find((a) => a.key === assetKey);
  const incoming = activeBgLayer === 'a' ? elements.bgLayerB : elements.bgLayerA;
  const outgoing = activeBgLayer === 'a' ? elements.bgLayerA : elements.bgLayerB;

  if (asset) {
    const img = new Image();
    img.onload = () => {
      incoming.style.background = '';
      incoming.style.backgroundImage = `url(${img.src})`;
      swap(incoming, outgoing);
    };
    img.onerror = () => {
      // Fallback to placeholder
      applyPlaceholder(incoming, asset.placeholderStyle);
      swap(incoming, outgoing);
    };
    img.src = `/assets/${asset.path}`;
  } else {
    // No asset found — use a generic dark background expressed through tokens.
    applyPlaceholder(incoming, 'linear-gradient(180deg, var(--gui-bg) 0%, var(--gui-surface) 100%)');
    swap(incoming, outgoing);
  }
}

function applyPlaceholder(layer: HTMLElement, style: string): void {
  layer.style.backgroundImage = '';
  layer.style.background = style;
}

function swap(incoming: HTMLElement, outgoing: HTMLElement): void {
  incoming.classList.remove('inactive');
  incoming.classList.add('active');
  outgoing.classList.remove('active');
  outgoing.classList.add('inactive');
  activeBgLayer = activeBgLayer === 'a' ? 'b' : 'a';
}

export function getElements(): LayoutElements {
  if (!elements) throw new Error('[layout] initLayout() has not been called');
  return elements;
}
