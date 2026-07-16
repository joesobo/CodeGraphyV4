import { describe, expect, it } from 'vitest';
import { calculateNodeSizes } from '../../../../../src/webview/components/graph/model/node/sizing';

describe('graph/model/node/sizing', () => {
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

  it('returns default sizes when file-size mode has no positive file sizes', () => {
    const sizes = calculateNodeSizes(
      [
        { id: 'empty.ts', label: 'empty.ts', color: '#93C5FD' },
        { id: 'zero.ts', label: 'zero.ts', color: '#67E8F9', fileSize: 0 },
      ],
      [],
      'file-size'
    );

    expect(sizes.get('empty.ts')).toBe(8);
    expect(sizes.get('zero.ts')).toBe(8);
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

    expect(sizes.get('zero.ts')).toBe(8);
    expect(sizes.get('small.ts')).toBe(8);
    expect(sizes.get('large.ts')).toBe(30);
  });
});
