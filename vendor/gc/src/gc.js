/**
 * Script Name : gc.js
 * Description : Framework ESM entry; injects shared SVG defs so CSS filter references resolve from published source alone.
 * Repository  : html5-game-ui-framework
 * Author      : VintageDon (https://github.com/vintagedon/)
 * Created     : 2026-08-03
 * Link        : https://github.com/vintagedon/html5-game-ui-framework
 *
 * The consumption contract is "include the CSS and ESM and it works." Some
 * surface techniques reference SVG filters by bare fragment, for example
 * --gc-filter-weathered-edge resolves to url("#gc-edge-distress"). A bare
 * fragment resolves only against SVG defs present in the consuming document,
 * so a page that loads just the framework CSS would otherwise point at a
 * reference nothing defines. Per the Filter Effects spec that is an error;
 * Chromium degrades by dropping the effect, but the defect is that the
 * advertised technique does not render from published source.
 *
 * This module injects those defs on import as a hidden SVG block. It is
 * idempotent: if the consuming document already defines the filter (for
 * example, an older copy of the reference markup), it leaves that copy alone.
 * Loading src/gc.css plus an import of src/gc.js is the complete consumption
 * story; no build step, no markup copy.
 */

const SVG_NS = "http://www.w3.org/2000/svg";

// The feDisplacementMap edge distress used by the fantasy weathered-edge
// filter. Kept in sync with --gc-filter-weathered-edge in primitives.css.
const FILTER_DEFS = `
  <defs>
    <filter id="gc-edge-distress" x="-3%" y="-3%" width="106%" height="106%">
      <feTurbulence type="fractalNoise" baseFrequency="0.012 0.055" numOctaves="2" seed="29" result="edge-noise"></feTurbulence>
      <feDisplacementMap in="SourceGraphic" in2="edge-noise" scale="2.5" xChannelSelector="R" yChannelSelector="B"></feDisplacementMap>
    </filter>
  </defs>
`;

/**
 * Inject the framework's shared SVG defs into a document if they are not
 * already present. Safe to call multiple times and from either module graph.
 *
 * @param {Document} [doc=document] Document to inject into.
 * @returns {boolean} true when this call injected, false when defs already existed.
 */
export function ensureFrameworkDefs(doc = document) {
  if (!doc || doc.getElementById("gc-edge-distress")) return false;

  const host = doc.createElementNS(SVG_NS, "svg");
  host.setAttribute("width", "0");
  host.setAttribute("height", "0");
  host.setAttribute("aria-hidden", "true");
  host.setAttribute("focusable", "false");
  host.style.position = "absolute";
  host.innerHTML = FILTER_DEFS;
  doc.body.append(host);
  return true;
}

// Side effect on import: a consumer who loads the CSS and imports the ESM
// gets a working filter with no further markup. Defs are injected after the
// body exists; when this module is imported in document <head> before <body>
// is parsed, wait for DOMContentLoaded.
if (typeof document !== "undefined") {
  if (document.body) {
    ensureFrameworkDefs(document);
  } else {
    document.addEventListener("DOMContentLoaded", () => ensureFrameworkDefs(document), { once: true });
  }
}
