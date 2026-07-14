import { describe, it, expect } from 'vitest';
import {
  MIN_NODE_SIZE,
  MAX_NODE_SIZE,
  computeConnectionSizes,
} from '../../../../../src/webview/components/graph/model/sizing/calculations';

describe('semantic node size range', () => {
  it('matches Obsidian’s bounded radius domain', () => {
    expect(MIN_NODE_SIZE).toBe(8);
    expect(MAX_NODE_SIZE).toBe(30);
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
