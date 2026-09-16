/**
 * GameUI Metrics Factory
 * =============================================================================
 * Three telemetry readouts that never touch navigator.gpu or assume a WebGPU
 * context. Each metric samples `requestAnimationFrame` timestamps in its own
 * loop; none integrate with the consumer's render loop.
 *
 *   createFpsSparkline — canvas sparkline of frames-per-second over time
 *   createFrameTime    — current / min / max frame time in milliseconds
 *   createStatRows     — consumer-fed numeric rows with optional sparkline
 *
 * Start/stop is the consumer's job so metrics only run when a panel is visible
 * (avoids needless rAF work in background tabs).
 *
 * Load as an ES module:
 *   import { createFpsSparkline, createFrameTime, createStatRows } from
 *     "./ui/components/metrics/metrics.js";
 *
 *   const fps = createFpsSparkline({ accent: "info" });
 *   panel.appendChild(fps.el);
 *   fps.start();
 * =============================================================================
 */

// -----------------------------------------------------------------------------
// Shared helpers
// -----------------------------------------------------------------------------

/**
 * Resolve an accent token pair into {hex, "r, g, b"} for canvas drawing. Canvas
 * cannot consume var() directly, so the value is read from the computed token
 * at draw time. The fallbacks mirror the contract defaults declared in
 * tokens/tokens.css (--gui-accent-primary / its -rgb) and only apply when a
 * preset fails to populate the contract, so no factory hardcodes a skin value.
 */
function readAccent(doc, accent) {
  const hex = getComputedStyle(doc.documentElement)
    .getPropertyValue(`--gui-accent-${accent}`)
    .trim();
  const rgb = getComputedStyle(doc.documentElement)
    .getPropertyValue(`--gui-accent-${accent}-rgb`)
    .trim();
  // Contract defaults from tokens/tokens.css §2 (primary role).
  return { hex: hex || "#38bdf8", rgb: rgb || "56, 189, 248" };
}

// -----------------------------------------------------------------------------
// createFpsSparkline
// -----------------------------------------------------------------------------

/**
 * Create an FPS sparkline that samples its own requestAnimationFrame loop.
 *
 * Two data sources:
 *   - source: "raf" (default) — start() kicks an internal rAF loop that
 *     samples frame timestamps and pushes FPS values. This proves the
 *     self-contained sampling loop the charter requires.
 *   - source: "manual" — the consumer (or the gallery, for deterministic
 *     screenshots) calls push(fps) and draw() themselves. No rAF is used.
 *
 * @param {object} options
 * @param {string} [options.accent] primary ... pink. Default info.
 * @param {number} [options.window] Sample history length. Default 120 frames.
 * @param {number} [options.width]  Canvas CSS width. Default 200.
 * @param {number} [options.height] Canvas CSS height. Default 48.
 * @param {string} [options.source] "raf" (default) or "manual".
 * @returns {{el, canvas, start, stop, push, draw, getFps, source}}
 */
export function createFpsSparkline(options = {}) {
  const opts = options || {};
  const accent = opts.accent || "info";
  const windowSize = opts.window || 120;
  const source = opts.source === "manual" ? "manual" : "raf";

  const root = document.createElement("div");
  root.className = `gui-metric gui-fps gui-metric--${accent}`;

  const canvas = document.createElement("canvas");
  canvas.className = "gui-fps__canvas";
  const cssWidth = opts.width || 200;
  const cssHeight = opts.height || 48;
  canvas.style.width = `${cssWidth}px`;
  canvas.style.height = `${cssHeight}px`;
  // Device-pixel ratio for crisp rendering; capped to avoid huge buffers.
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = cssWidth * dpr;
  canvas.height = cssHeight * dpr;
  root.appendChild(canvas);

  const readout = document.createElement("div");
  readout.className = "gui-fps__readout";
  const value = document.createElement("span");
  value.className = "gui-fps__value";
  value.textContent = "0";
  const suffix = document.createElement("span");
  suffix.textContent = "fps";
  readout.appendChild(value);
  readout.appendChild(suffix);
  root.appendChild(readout);

  const history = []; // fps samples
  let rafId = null;
  let lastTs = null;
  let frames = 0;
  let bucketStart = null;

  function ctx() {
    return canvas.getContext("2d");
  }

  function draw() {
    const c = ctx();
    const w = canvas.width;
    const h = canvas.height;
    c.clearRect(0, 0, w, h);
    if (history.length < 2) return;
    const { rgb } = readAccent(document, accent);
    const maxFps = 120; // graph ceiling
    const stepX = w / (windowSize - 1);

    // Filled area under the line.
    c.beginPath();
    c.moveTo(0, h);
    history.forEach((fps, i) => {
      const x = i * stepX;
      const y = h - (Math.min(fps, maxFps) / maxFps) * h;
      c.lineTo(x, y);
    });
    c.lineTo((history.length - 1) * stepX, h);
    c.closePath();
    c.fillStyle = `rgba(${rgb}, 0.18)`;
    c.fill();

    // Line on top.
    c.beginPath();
    history.forEach((fps, i) => {
      const x = i * stepX;
      const y = h - (Math.min(fps, maxFps) / maxFps) * h;
      if (i === 0) c.moveTo(x, y);
      else c.lineTo(x, y);
    });
    c.strokeStyle = `rgba(${rgb}, 0.95)`;
    c.lineWidth = 2 * dpr;
    c.lineJoin = "round";
    c.stroke();
  }

  function loop(ts) {
    if (lastTs == null) {
      lastTs = ts;
      bucketStart = ts;
      rafId = requestAnimationFrame(loop);
      return;
    }
    frames += 1;
    const elapsed = ts - bucketStart;
    // Sample roughly once per 250ms so the readout is stable.
    if (elapsed >= 250) {
      const fps = (frames * 1000) / elapsed;
      history.push(fps);
      if (history.length > windowSize) history.shift();
      value.textContent = String(Math.round(fps));
      draw();
      frames = 0;
      bucketStart = ts;
    }
    lastTs = ts;
    rafId = requestAnimationFrame(loop);
  }

  function push(fps) {
    const f = Number(fps);
    if (!Number.isFinite(f)) return;
    history.push(f);
    if (history.length > windowSize) history.shift();
    value.textContent = String(Math.round(f));
    draw();
  }

  function start() {
    if (source !== "raf") return;
    if (rafId != null) return;
    lastTs = null;
    bucketStart = null;
    frames = 0;
    rafId = requestAnimationFrame(loop);
  }

  function stop() {
    if (rafId != null) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
  }

  function getFps() {
    return history.length ? history[history.length - 1] : 0;
  }

  return { el: root, canvas, start, stop, push, draw, getFps, source };
}

// -----------------------------------------------------------------------------
// createFrameTime
// -----------------------------------------------------------------------------

/**
 * Create a frame-time readout showing current, min, and max ms.
 *
 * Two data sources (same shape as the sparkline):
 *   - source: "raf" (default) — start() runs an rAF loop sampling frame dt.
 *   - source: "manual" — the consumer/gallery calls push(ms) with their own
 *     timings.
 *
 * @param {object} options
 * @param {string} [options.accent] primary ... pink. Default info.
 * @param {number} [options.window] Rolling sample count for min/max. Default 180.
 * @param {string} [options.source] "raf" (default) or "manual".
 * @returns {{el, start, stop, push, getStats, source}}
 */
export function createFrameTime(options = {}) {
  const opts = options || {};
  const accent = opts.accent || "info";
  const windowSize = opts.window || 180;
  const source = opts.source === "manual" ? "manual" : "raf";

  const root = document.createElement("div");
  root.className = `gui-metric gui-frame-time gui-metric--${accent}`;

  const label = document.createElement("span");
  label.className = "gui-frame-time__label";
  label.textContent = "Frame";
  const cur = document.createElement("span");
  cur.className = "gui-frame-time__cur";
  cur.textContent = "0.0";
  const unit = document.createElement("span");
  unit.className = "gui-frame-time__unit";
  unit.textContent = "ms";
  const stat = document.createElement("span");
  stat.className = "gui-frame-time__stat";
  const minSpan = document.createElement("span");
  minSpan.className = "gui-frame-time__min";
  const maxSpan = document.createElement("span");
  maxSpan.className = "gui-frame-time__max";
  stat.append("min ", minSpan, " ms / max ", maxSpan, " ms");

  root.append(label, cur, unit, stat);

  const samples = [];
  let rafId = null;
  let lastTs = null;

  function apply() {
    if (!samples.length) {
      cur.textContent = "0.0";
      minSpan.textContent = "0.0";
      maxSpan.textContent = "0.0";
      return;
    }
    const last = samples[samples.length - 1];
    const min = Math.min(...samples);
    const max = Math.max(...samples);
    cur.textContent = last.toFixed(1);
    minSpan.textContent = min.toFixed(1);
    maxSpan.textContent = max.toFixed(1);
  }

  function loop(ts) {
    if (lastTs != null) {
      const dt = ts - lastTs;
      samples.push(dt);
      if (samples.length > windowSize) samples.shift();
      apply();
    }
    lastTs = ts;
    rafId = requestAnimationFrame(loop);
  }

  function push(ms) {
    const dt = Number(ms);
    if (!Number.isFinite(dt)) return;
    samples.push(dt);
    if (samples.length > windowSize) samples.shift();
    apply();
  }

  function start() {
    if (source !== "raf") return;
    if (rafId != null) return;
    lastTs = null;
    rafId = requestAnimationFrame(loop);
  }

  function stop() {
    if (rafId != null) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
  }

  function getStats() {
    if (!samples.length) return { current: 0, min: 0, max: 0 };
    return {
      current: samples[samples.length - 1],
      min: Math.min(...samples),
      max: Math.max(...samples),
    };
  }

  return { el: root, start, stop, push, getStats, source };
}

// -----------------------------------------------------------------------------
// createStatRows
// -----------------------------------------------------------------------------

/**
 * Create a panel of consumer-fed numeric stat rows. Each row keeps a rolling
 * series the consumer pushes via set(label, value); a row with `spark: true`
 * renders a mini sparkline of that series.
 * @param {object} options
 * @param {string} [options.title]    Optional panel heading.
 * @param {Array}  options.rows       [{label, unit?, spark?, sparkWindow?}]
 * @returns {{el, set, setRow, getRow}}
 */
export function createStatRows(options = {}) {
  const opts = options || {};

  const root = document.createElement("div");
  root.className = "gui-stat-panel";
  if (opts.title) {
    const t = document.createElement("h3");
    t.className = "gui-stat-panel__title";
    t.textContent = opts.title;
    root.appendChild(t);
  }

  const rows = {};
  const rowOrder = [];
  const rowConfigs = Array.isArray(opts.rows) ? opts.rows : [];

  rowConfigs.forEach((cfg) => {
    const row = document.createElement("div");
    row.className = "gui-metric gui-stat-row";

    const label = document.createElement("span");
    label.className = "gui-stat-row__label";
    label.textContent = cfg.label || "";
    row.appendChild(label);

    const main = document.createElement("div");
    main.className = "gui-stat-row__main";

    let sparkCanvas = null;
    let sparkCtx = null;
    const series = [];
    const sparkWindow = cfg.sparkWindow || 32;

    if (cfg.spark) {
      sparkCanvas = document.createElement("canvas");
      sparkCanvas.className = "gui-stat-row__spark";
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      sparkCanvas.width = 64 * dpr;
      sparkCanvas.height = 18 * dpr;
      sparkCtx = sparkCanvas.getContext("2d");
      main.appendChild(sparkCanvas);
    }

    const value = document.createElement("span");
    value.className = "gui-stat-row__value";
    value.textContent = cfg.initial != null ? formatNumber(cfg.initial) : "0";
    main.appendChild(value);

    if (cfg.unit) {
      const unit = document.createElement("span");
      unit.className = "gui-stat-row__unit";
      unit.textContent = cfg.unit;
      main.appendChild(unit);
    }

    row.appendChild(main);
    root.appendChild(row);

    rows[cfg.label] = {
      row,
      value,
      series,
      sparkCanvas,
      sparkCtx,
      sparkWindow,
      drawSpark() {
        if (!sparkCtx) return;
        const c = sparkCtx;
        const w = sparkCanvas.width;
        const h = sparkCanvas.height;
        c.clearRect(0, 0, w, h);
        if (series.length < 2) return;
        const accent = cfg.accent || "primary";
        const { rgb } = readAccent(document, accent);
        const min = Math.min(...series);
        const max = Math.max(...series);
        const span = max - min || 1;
        const stepX = w / (series.length - 1);
        c.beginPath();
        series.forEach((v, i) => {
          const x = i * stepX;
          const y = h - ((v - min) / span) * (h - 2) - 1;
          if (i === 0) c.moveTo(x, y);
          else c.lineTo(x, y);
        });
        c.strokeStyle = `rgba(${rgb}, 0.95)`;
        c.lineWidth = 1.5;
        c.lineJoin = "round";
        c.stroke();
      },
    };
    rowOrder.push(cfg.label);
  });

  function set(label, valueIn) {
    const entry = rows[label];
    if (!entry) return;
    const n = Number(valueIn);
    entry.value.textContent = formatNumber(n);
    if (entry.sparkCtx) {
      entry.series.push(n);
      if (entry.series.length > entry.sparkWindow) entry.series.shift();
      entry.drawSpark();
    }
  }

  return {
    el: root,
    set,
    setRow: set,
    getRow(label) {
      return rows[label] ? rows[label].value.textContent : null;
    },
  };
}

/** Format a number for compact metric display. */
function formatNumber(n) {
  if (!Number.isFinite(n)) return "0";
  if (Math.abs(n) >= 1000) {
    return n.toLocaleString("en-US");
  }
  if (Number.isInteger(n)) return String(n);
  return n.toFixed(1);
}
