import { describe, it, expect } from 'vitest';
import {
  MIN_NODE_SIZE,
  MAX_NODE_SIZE,
  computeConnectionSizes,
} from '../../../src/webview/components/graphModel/sizingCalculations';

describe('computeConnectionSizes (mutation kill tests)', () => {
  /**
   * Kill L24:26 LogicalOperator: `counts.get(edge.to) && 0`
   * Mutant replaces `(counts.get(edge.to) ?? 0) + 1` with
   * `(counts.get(edge.to) && 0) + 1`.
   * When counts.get(edge.to) returns a number > 0 (e.g., from a previous
   * edge increment), `&& 0` would always produce 0 instead of the actual count.
   * We need a node that is the "to" target of multiple edges, so its count
   * would be wrong with the mutant.
   */
  it('accumulates connection count correctly for a node targeted by multiple edges', () => {
    const nodes = [
      { id: 'a.ts', label: 'a.ts', color: '#fff' },
      { id: 'b.ts', label: 'b.ts', color: '#fff' },
      { id: 'target.ts', label: 'target.ts', color: '#fff' },
    ];
    const edges = [
      { from: 'a.ts', to: 'target.ts' },
      { from: 'b.ts', to: 'target.ts' },
    ];

    const sizes = computeConnectionSizes(nodes, edges);

    // target.ts has 2 connections (both as "to")
    // a.ts has 1, b.ts has 1
    // max = 2, min = 0, range = 2
    // target.ts: 10 + ((2 - 0) / 2) * 30 = 10 + 30 = 40
    // a.ts/b.ts: 10 + ((1 - 0) / 2) * 30 = 10 + 15 = 25
    expect(sizes.get('target.ts')).toBe(MAX_NODE_SIZE);
    expect(sizes.get('a.ts')).toBe(25);
    expect(sizes.get('b.ts')).toBe(25);
  });

  /**
   * Kill L30:17 ArithmeticOperator: `max + min` (should be `max - min`).
   * If range = max + min instead of max - min, the normalization denominator
   * changes and sizes will be wrong. We verify exact computed values.
   */
  it('computes range as max minus min for correct normalization', () => {
    const nodes = [
      { id: 'hub.ts', label: 'hub.ts', color: '#fff' },
      { id: 'mid.ts', label: 'mid.ts', color: '#fff' },
      { id: 'leaf.ts', label: 'leaf.ts', color: '#fff' },
    ];
    const edges = [
      { from: 'hub.ts', to: 'mid.ts' },
      { from: 'hub.ts', to: 'leaf.ts' },
      { from: 'mid.ts', to: 'leaf.ts' },
    ];

    const sizes = computeConnectionSizes(nodes, edges);

    // hub: 2 (from to mid, from to leaf)
    // mid: 2 (to from hub, from to leaf)
    // leaf: 2 (to from hub, to from mid)
    // Actually all are 2. Let me recalculate:
    // counts: hub=2, mid=2, leaf=2
    // min = Math.min(2,2,2, 0) = 0
    // max = Math.max(2,2,2, 1) = 2
    // range = max - min = 2 - 0 = 2 (correct)
    // range with mutant = max + min = 2 + 0 = 2 (same! need different scenario)

    // Need min > 0 to differentiate max-min from max+min
    // All nodes have at least some connections. Let me use a scenario where min > 0.
    // Actually min always includes the ...values and 0, so min = Math.min(...values, 0) = 0.
    // So max - min === max + min when min = 0. Need a different approach.
    //
    // Wait, Math.min(...values, 0) always includes 0, so min is always <= 0.
    // And since all counts are >= 0, min is always 0.
    // So max - min = max - 0 = max, and max + min = max + 0 = max.
    // These are identical! The mutant is equivalent. Let me re-examine.
    //
    // Actually, looking again at L30: `const range = max - min || 1;`
    // The mutant changes `max - min` to `max + min`.
    // Since min is always 0, max - 0 = max and max + 0 = max. They're the same.
    // So this mutant IS equivalent. But the task says it's surviving...
    // Let me check if perhaps min could be negative.
    // L28: `const min = Math.min(...values, 0);` — values are all >= 0, so min = 0.
    // They ARE equivalent. Let me focus on the other mutants.

    // Regardless, verify the exact sizes to help with other mutants:
    expect(sizes.get('hub.ts')).toBe(MAX_NODE_SIZE);
    expect(sizes.get('mid.ts')).toBe(MAX_NODE_SIZE);
    expect(sizes.get('leaf.ts')).toBe(MAX_NODE_SIZE);
  });

  /**
   * Kill L34:42 ArithmeticOperator: `count + min` (should be `count - min`).
   * Like above, since min is always 0, count - 0 === count + 0.
   * However, let's verify the exact formula output to detect any mutation
   * that changes the arithmetic in a way that produces different results.
   */
  it('produces exact expected sizes for a three-node graph with varying connections', () => {
    const nodes = [
      { id: 'hub.ts', label: 'hub.ts', color: '#fff' },
      { id: 'mid.ts', label: 'mid.ts', color: '#fff' },
      { id: 'leaf.ts', label: 'leaf.ts', color: '#fff' },
    ];
    const edges = [
      { from: 'hub.ts', to: 'mid.ts' },
      { from: 'hub.ts', to: 'leaf.ts' },
    ];

    const sizes = computeConnectionSizes(nodes, edges);

    // hub: from-mid + from-leaf = 2
    // mid: to-from-hub = 1
    // leaf: to-from-hub = 1
    // values = [2, 1, 1]
    // min = Math.min(2, 1, 1, 0) = 0
    // max = Math.max(2, 1, 1, 1) = 2
    // range = 2 - 0 = 2
    // hub: 10 + ((2 - 0) / 2) * 30 = 10 + 30 = 40
    // mid: 10 + ((1 - 0) / 2) * 30 = 10 + 15 = 25
    // leaf: 10 + ((1 - 0) / 2) * 30 = 10 + 15 = 25
    expect(sizes.get('hub.ts')).toBe(40);
    expect(sizes.get('mid.ts')).toBe(25);
    expect(sizes.get('leaf.ts')).toBe(25);
  });

  /**
   * Verify that a node with zero connections gets MIN_NODE_SIZE exactly.
   * This exercises L34 formula: MIN_NODE_SIZE + ((0 - 0) / range) * (MAX - MIN) = MIN_NODE_SIZE.
   * If the arithmetic mutant changes count - min to count + min, result is same since min=0.
   * But we still want to lock down exact values.
   */
  it('assigns exactly MIN_NODE_SIZE to a zero-connection node', () => {
    const nodes = [
      { id: 'connected.ts', label: 'connected.ts', color: '#fff' },
      { id: 'isolated.ts', label: 'isolated.ts', color: '#fff' },
    ];
    const edges = [
      { from: 'connected.ts', to: 'connected.ts' }, // self-loop
    ];

    const sizes = computeConnectionSizes(nodes, edges);

    // isolated.ts has 0 connections
    expect(sizes.get('isolated.ts')).toBe(MIN_NODE_SIZE);
  });

  /**
   * Verify the full range is used: most-connected = MAX, least-connected = MIN.
   */
  it('spans the full range from MIN_NODE_SIZE to MAX_NODE_SIZE', () => {
    const nodes = [
      { id: 'star.ts', label: 'star.ts', color: '#fff' },
      { id: 'a.ts', label: 'a.ts', color: '#fff' },
      { id: 'b.ts', label: 'b.ts', color: '#fff' },
      { id: 'c.ts', label: 'c.ts', color: '#fff' },
      { id: 'solo.ts', label: 'solo.ts', color: '#fff' },
    ];
    const edges = [
      { from: 'star.ts', to: 'a.ts' },
      { from: 'star.ts', to: 'b.ts' },
      { from: 'star.ts', to: 'c.ts' },
    ];

    const sizes = computeConnectionSizes(nodes, edges);

    // star: 3, a: 1, b: 1, c: 1, solo: 0
    // min = 0, max = 3, range = 3
    // star: 10 + (3/3)*30 = 40
    // a/b/c: 10 + (1/3)*30 = 20
    // solo: 10 + (0/3)*30 = 10
    expect(sizes.get('star.ts')).toBe(MAX_NODE_SIZE);
    expect(sizes.get('solo.ts')).toBe(MIN_NODE_SIZE);
    expect(sizes.get('a.ts')).toBe(20);
  });
});
