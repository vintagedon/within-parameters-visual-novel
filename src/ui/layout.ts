/**
 * Layout manager — mounts the WP stage host and builds the journey DOM
 * inside the 1920x1080 logical stage (gates 5.4/5.5).
 *
 * Structure: #root > .wp-stage-host > .wp-stage > #game-container. The host
 * measures the window; the stage is uniformly scaled by src/ui/stage.ts per
 * charter 4.1.1. Nothing inside the stage uses viewport units.
 *
 * Regions (composition contract): #main-area holds the scene #viewport and
 * the #sidebar rail; #bottom-bar is the full-width dialogue band. Title,
 * lore, and ending scenes run fullscreen (scene only, chrome hidden).
 * Background transitions use a two-layer crossfade (layer A/B swap).
 *
 * @module ui/layout
 */

import type { BackgroundAsset } from '../types/index';
import { createStageHost, type StageHost } from './stage';

export interface LayoutElements {
  stageHost: HTMLElement;
  stage: HTMLElement;
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
let stageHostRef: StageHost | null = null;

export function initLayout(root: HTMLElement): LayoutElements {
  root.innerHTML = `
    <div class="wp-stage-host" id="stage-host">
      <div class="wp-stage" id="stage">
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
      </div>
    </div>
  `;

  const stageHost = document.getElementById('stage-host')!;
  const stage = document.getElementById('stage')!;
  const gameContainer = document.getElementById('game-container')!;
  const mainArea = document.getElementById('main-area')!;
  const viewport = document.getElementById('viewport')!;
  const sidebar = document.getElementById('sidebar')!;
  const bottomBar = document.getElementById('bottom-bar')!;
  const bgLayerA = document.getElementById('bg-layer-a')!;
  const bgLayerB = document.getElementById('bg-layer-b')!;

  stageHostRef = createStageHost({ host: stageHost, stage });

  elements = { stageHost, stage, gameContainer, mainArea, viewport, sidebar, bottomBar, bgLayerA, bgLayerB };
  return elements;
}

/** The stage element — overlays and modals mount inside it so they scale
 *  with the stage (the transformed stage is their containing block). */
export function getStage(): HTMLElement {
  if (!elements) throw new Error('[layout] initLayout() has not been called');
  return elements.stage;
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
    applyPlaceholder(incoming, 'linear-gradient(180deg, var(--gc-surface-canvas) 0%, var(--gc-surface-base) 100%)');
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
