import { describe, expect, it } from 'vitest';
import { calculateNodeSizes, toD3Repel } from '../../../../../src/webview/components/graph/model/node/sizing';

describe('graph/model/node/sizing', () => {
  it('maps normalized repel force to the d3 force range', () => {
    expect(Object.is(toD3Repel(0), -0)).toBe(true);
    expect(toD3Repel(10)).toBe(-250);
    expect(toD3Repel(20)).toBe(-500);
  });

  it('uses the default size for uniform node sizing', () => {
    const sizes = calculateNodeSizes(
      [
        { id: 'a.ts', label: 'a.ts', color: '#93C5FD' },
        { id: 'b.ts', label: 'b.ts', color: '#67E8F9' },
      ],
      [],
      'uniform'
    );

    expect(sizes.get('a.ts')).toBe(16);
    expect(sizes.get('b.ts')).toBe(16);
  });

  it('scales connection-based node sizes like Obsidian', () => {
    const leaves = Array.from({ length: 15 }, (_, index) => ({
      id: `leaf-${index}.ts`,
      label: `leaf-${index}.ts`,
      color: '#67E8F9',
    }));
    const sizes = calculateNodeSizes(
      [{ id: 'hub.ts', label: 'hub.ts', color: '#93C5FD' }, ...leaves],
      leaves.map(leaf => ({ from: 'hub.ts', to: leaf.id })),
      'connections',
    );

    expect(sizes.get('hub.ts')).toBe(12);
    expect(sizes.get('leaf-0.ts')).toBe(8);
  });

  it('scales churn node sizes from the observed range', () => {
    const sizes = calculateNodeSizes(
      [
        { id: 'small.ts', label: 'small.ts', color: '#93C5FD', churn: 1 },
        { id: 'medium.ts', label: 'medium.ts', color: '#67E8F9', churn: 2 },
        { id: 'large.ts', label: 'large.ts', color: '#38BDF8', churn: 5 },
      ],
      [],
      'churn'
    );

    expect(sizes.get('small.ts')).toBe(16);
    expect(sizes.get('medium.ts')).toBe(22);
    expect(sizes.get('large.ts')).toBe(40);
  });

  it('returns default sizes when file-size mode has no positive file sizes', () => {
    const sizes = calculateNodeSizes(
      [
        { id: 'empty.ts', label: 'empty.ts', color: '#93C5FD' },
        { id: 'zero.ts', label: 'zero.ts', color: '#67E8F9', fileSize: 0 },
      ],
      [],
      'file-size'
    );

    expect(sizes.get('empty.ts')).toBe(16);
    expect(sizes.get('zero.ts')).toBe(16);
  });

  it('uses log scaling for positive file sizes and keeps zero-byte files at the minimum', () => {
    const sizes = calculateNodeSizes(
      [
        { id: 'zero.ts', label: 'zero.ts', color: '#93C5FD', fileSize: 0 },
        { id: 'small.ts', label: 'small.ts', color: '#67E8F9', fileSize: 99 },
        { id: 'large.ts', label: 'large.ts', color: '#38BDF8', fileSize: 9999 },
      ],
      [],
      'file-size'
    );

    expect(sizes.get('zero.ts')).toBe(10);
    expect(sizes.get('small.ts')).toBe(10);
    expect(sizes.get('large.ts')).toBe(40);
  });
});
