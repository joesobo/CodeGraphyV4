import { describe, it, expect } from 'vitest';
import {
  MIN_NODE_SIZE,
  MAX_NODE_SIZE,
  computeUniformSizes,
  computeConnectionSizes,
} from '../../../../../src/webview/components/graph/model/sizing/calculations';

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
  it('uses Obsidian bounded square-root sizing from unique related nodes', () => {
    const leaves = Array.from({ length: 15 }, (_, index) => ({
      color: '#fff',
      id: `leaf-${index}.ts`,
      label: `leaf-${index}.ts`,
    }));
    const sizes = computeConnectionSizes(
      [{ id: 'hub.ts', label: 'hub.ts', color: '#fff' }, ...leaves],
      leaves.map(leaf => ({ from: 'hub.ts', to: leaf.id })),
    );

    expect(sizes.get('hub.ts')).toBe(12);
    expect(sizes.get('leaf-0.ts')).toBe(8);
  });

  it('clamps isolated and highly related nodes to Obsidian bounds', () => {
    const leaves = Array.from({ length: 100 }, (_, index) => ({
      color: '#fff',
      id: `leaf-${index}.ts`,
      label: `leaf-${index}.ts`,
    }));
    const sizes = computeConnectionSizes(
      [
        { id: 'hub.ts', label: 'hub.ts', color: '#fff' },
        { id: 'solo.ts', label: 'solo.ts', color: '#fff' },
        ...leaves,
      ],
      leaves.map(leaf => ({ from: 'hub.ts', to: leaf.id })),
    );

    expect(sizes.get('solo.ts')).toBe(8);
    expect(sizes.get('hub.ts')).toBe(30);
  });

  it('counts parallel and reverse relationships to one neighbor only once', () => {
    const sizes = computeConnectionSizes(
      [
        { id: 'a.ts', label: 'a.ts', color: '#fff' },
        { id: 'b.ts', label: 'b.ts', color: '#fff' },
      ],
      [
        { from: 'a.ts', to: 'b.ts' },
        { from: 'a.ts', to: 'b.ts' },
        { from: 'b.ts', to: 'a.ts' },
      ],
    );

    expect(sizes.get('a.ts')).toBe(8);
    expect(sizes.get('b.ts')).toBe(8);
  });

  it('keeps a node size stable when an unrelated high-degree hub is added', () => {
    const baseNodes = [
      { id: 'a.ts', label: 'a.ts', color: '#fff' },
      { id: 'b.ts', label: 'b.ts', color: '#fff' },
    ];
    const baseSize = computeConnectionSizes(
      baseNodes,
      [{ from: 'a.ts', to: 'b.ts' }],
    ).get('a.ts');
    const unrelatedLeaves = Array.from({ length: 40 }, (_, index) => ({
      color: '#fff',
      id: `unrelated-${index}.ts`,
      label: `unrelated-${index}.ts`,
    }));
    const expandedSize = computeConnectionSizes(
      [...baseNodes, { id: 'hub.ts', label: 'hub.ts', color: '#fff' }, ...unrelatedLeaves],
      [
        { from: 'a.ts', to: 'b.ts' },
        ...unrelatedLeaves.map(leaf => ({ from: 'hub.ts', to: leaf.id })),
      ],
    ).get('a.ts');

    expect(expandedSize).toBe(baseSize);
  });
});
