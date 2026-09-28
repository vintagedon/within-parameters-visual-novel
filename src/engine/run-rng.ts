/**
 * Stateful run RNG — a mulberry32 RNG (same algorithm as rng.ts) whose
 * 32-bit state can be read and restored, so a saved run resumes the exact
 * random stream an uninterrupted run would have consumed (event pool
 * shuffles, community assignment, clock jitter).
 *
 * Kept in its own module rather than editing the validated rng.ts: the
 * replay harness's evidence depends on that file's behavior, and a parallel
 * implementation with identical [0, 1) semantics adds state access without
 * touching it.
 *
 * @module engine/run-rng
 */

import type { Rng } from './rng';

export interface RunRng extends Rng {
  /** The current 32-bit state (serializable). */
  getState(): number;
  /** Restores a previously captured state. */
  setState(state: number): void;
}

export function createRunRng(seed: number): RunRng {
  let state = seed >>> 0;

  const next = (): number => {
    state |= 0;
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  const intBelow = (n: number): number => {
    if (n <= 0) throw new RangeError(`intBelow requires n > 0, got ${n}`);
    return Math.floor(next() * n);
  };

  const shuffle = <T>(arr: readonly T[]): T[] => {
    const out = [...arr];
    for (let i = out.length - 1; i > 0; i--) {
      const j = Math.floor(next() * (i + 1));
      const tmp = out[i]!;
      out[i] = out[j]!;
      out[j] = tmp;
    }
    return out;
  };

  const sample = <T>(arr: readonly T[], k: number): T[] => {
    const pool = [...arr];
    const out: T[] = [];
    for (let i = 0; i < k; i++) {
      const j = i + Math.floor(next() * (pool.length - i));
      out.push(pool[j]!);
      pool[j] = pool[i]!;
    }
    return out;
  };

  return {
    next,
    intBelow,
    shuffle,
    sample,
    getState: () => state >>> 0,
    setState: (s: number) => {
      state = s >>> 0;
    },
  };
}
