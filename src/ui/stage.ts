/**
 * Stage host — WP-owned implementation of the display contract in the
 * framework charter section 4.1.1 (gate 5.4).
 *
 * One logical stage of fixed size (1920x1080 by default), uniformly scaled
 * by s = min(W / logicalWidth, H / logicalHeight) of the host area, centered,
 * with letterbox or pillarbox bars. Scale is continuous, never snapped; the
 * axes are never stretched independently and the stage is never cropped. The
 * logical stage stays its authored size at any displayed size.
 *
 * The host is self-contained and carries no game concepts: it knows nothing
 * about Within Parameters. The outer host may measure the window; nothing
 * inside the stage uses viewport units or width, height, or orientation
 * breakpoints. DOM input stays aligned with displayed controls at every
 * scale because the stage is a real transformed element that the browser
 * hit-tests directly.
 *
 * Intended to be offered back to the framework as the shared stage-host
 * candidate in a separate backport review after WP's presentation is
 * accepted.
 *
 * @module ui/stage
 */

export interface StageHostOptions {
  /** The outer element that measures the available area. */
  host: HTMLElement;
  /** The logical stage element, sized to logicalWidth x logicalHeight in CSS. */
  stage: HTMLElement;
  logicalWidth?: number;
  logicalHeight?: number;
}

export interface StageHost {
  /** Recomputes the fit from the host's current box. */
  resize(): void;
  /** The currently applied scale (min-fit, continuous). */
  getScale(): number;
  /** Stops observing resizes. */
  disconnect(): void;
}

export const LOGICAL_WIDTH = 1920;
export const LOGICAL_HEIGHT = 1080;

export function createStageHost(options: StageHostOptions): StageHost {
  const { host, stage } = options;
  const logicalWidth = options.logicalWidth ?? LOGICAL_WIDTH;
  const logicalHeight = options.logicalHeight ?? LOGICAL_HEIGHT;

  let scale = 1;

  function resize(): void {
    const w = host.clientWidth;
    const h = host.clientHeight;
    // The fit operation: continuous, axis-uniform, never cropped, never
    // stretched. Replacing min with max, or fitting by one axis alone, are
    // the named mutations the gate 5.4 scale checks must reject.
    const s = Math.min(w / logicalWidth, h / logicalHeight);
    scale = s;
    // Centering: the stage sits at 50%/50% with transform-origin center, so
    // the translate centers the untransformed border box and the scale keeps
    // that center fixed. Removing either the offset or the translate is the
    // named mutation the centering assertion must reject.
    stage.style.transform = `translate(-50%, -50%) scale(${s})`;
  }

  const observer = new ResizeObserver(() => resize());
  observer.observe(host);
  window.addEventListener('resize', resize);
  resize();

  return {
    resize,
    getScale: () => scale,
    disconnect: () => {
      observer.disconnect();
      window.removeEventListener('resize', resize);
    },
  };
}
