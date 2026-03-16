import { describe, it, expect } from 'vitest';
import {
  MIN_NODE_SIZE,
  MAX_NODE_SIZE,
  computeUniformSizes,
  computeConnectionSizes,
} from '../../../src/webview/components/graphModel/sizingCalculations';

describe('sizingCalculations constants', () => {
  it('exports MIN_NODE_SIZE as 10', () => {
    expect(MIN_NODE_SIZE).toBe(10);
  });

  it('exports MAX_NODE_SIZE as 40', () => {
    expect(MAX_NODE_SIZE).toBe(40);
  });
});

describe('computeUniformSizes', () => {
  it('assigns default size (16) to every node', () => {
    const sizes = computeUniformSizes([
      { id: 'a.ts', label: 'a.ts', color: '#fff' },
      { id: 'b.ts', label: 'b.ts', color: '#fff' },
    ]);
    expect(sizes.get('a.ts')).toBe(16);
    expect(sizes.get('b.ts')).toBe(16);
  });

  it('returns empty map for empty node list', () => {
    expect(computeUniformSizes([]).size).toBe(0);
  });
});

describe('computeConnectionSizes', () => {
  it('assigns minimum size to nodes with no edges', () => {
    const sizes = computeConnectionSizes(
      [{ id: 'solo.ts', label: 'solo.ts', color: '#fff' }],
      []
    );
    expect(sizes.get('solo.ts')).toBe(MIN_NODE_SIZE);
  });

  it('assigns maximum size to the most connected node', () => {
    const sizes = computeConnectionSizes(
      [
        { id: 'hub.ts', label: 'hub.ts', color: '#fff' },
        { id: 'leaf.ts', label: 'leaf.ts', color: '#fff' },
      ],
      [{ from: 'hub.ts', to: 'leaf.ts' }]
    );
    expect(sizes.get('hub.ts')).toBe(MAX_NODE_SIZE);
  });

  it('handles edge nodes not in the node list', () => {
    const sizes = computeConnectionSizes(
      [{ id: 'a.ts', label: 'a.ts', color: '#fff' }],
      [{ from: 'a.ts', to: 'missing.ts' }]
    );
    // a.ts has 1 connection, but missing.ts is counted too even without a node entry
    expect(sizes.get('a.ts')).toBeDefined();
  });

  it('counts each edge for both from and to nodes', () => {
    const sizes = computeConnectionSizes(
      [
        { id: 'a.ts', label: 'a.ts', color: '#fff' },
        { id: 'b.ts', label: 'b.ts', color: '#fff' },
        { id: 'c.ts', label: 'c.ts', color: '#fff' },
      ],
      [
        { from: 'a.ts', to: 'b.ts' },
        { from: 'a.ts', to: 'c.ts' },
      ]
    );
    // a: 2 connections (from both), b: 1 (to), c: 1 (to)
    expect(sizes.get('a.ts')).toBe(MAX_NODE_SIZE);
    expect(sizes.get('b.ts')).toBe(sizes.get('c.ts'));
    expect(sizes.get('b.ts')).toBeLessThan(MAX_NODE_SIZE);
  });

  it('produces sizes between MIN_NODE_SIZE and MAX_NODE_SIZE', () => {
    const sizes = computeConnectionSizes(
      [
        { id: 'hub.ts', label: 'hub.ts', color: '#fff' },
        { id: 'leaf.ts', label: 'leaf.ts', color: '#fff' },
      ],
      [
        { from: 'hub.ts', to: 'leaf.ts' },
      ]
    );
    for (const size of sizes.values()) {
      expect(size).toBeGreaterThanOrEqual(MIN_NODE_SIZE);
      expect(size).toBeLessThanOrEqual(MAX_NODE_SIZE);
    }
  });
});
