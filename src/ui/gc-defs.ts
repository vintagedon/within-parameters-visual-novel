/**
 * Bridge to the vendored gc framework's ESM entry: imports the framework for
 * its side effect (injecting shared SVG filter defs into the document).
 * Vendored at the reviewed pin; see vendor/gc/README.md.
 */

// @ts-expect-error - vendored framework ESM carries no type declarations at the pin
export { ensureFrameworkDefs } from '../../vendor/gc/src/gc.js';
