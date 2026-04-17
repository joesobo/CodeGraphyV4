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

  it('scales connection-based node sizes by edge count', () => {
    const sizes = calculateNodeSizes(
      [
        { id: 'hub.ts', label: 'hub.ts', color: '#93C5FD' },
        { id: 'leaf-a.ts', label: 'leaf-a.ts', color: '#67E8F9' },
        { id: 'leaf-b.ts', label: 'leaf-b.ts', color: '#67E8F9' },
      ],
      [
        { from: 'hub.ts', to: 'leaf-a.ts' },
        { from: 'hub.ts', to: 'leaf-b.ts' },
      ],
      'connections'
    );

    expect(sizes.get('hub.ts')).toBe(40);
    expect(sizes.get('leaf-a.ts')).toBe(25);
    expect(sizes.get('leaf-b.ts')).toBe(25);
  });

  it('scales access-count node sizes from the observed range', () => {
    const sizes = calculateNodeSizes(
      [
        { id: 'small.ts', label: 'small.ts', color: '#93C5FD', accessCount: 1 },
        { id: 'medium.ts', label: 'medium.ts', color: '#67E8F9', accessCount: 2 },
        { id: 'large.ts', label: 'large.ts', color: '#38BDF8', accessCount: 5 },
      ],
      [],
      'access-count'
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
