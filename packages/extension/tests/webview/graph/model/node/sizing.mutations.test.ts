import { describe, it, expect } from 'vitest';
import { calculateNodeSizes, toD3Repel } from '../../../../../src/webview/components/graph/model/node/sizing';

describe('nodeSizing (mutation targets)', () => {
  describe('toD3Repel', () => {
    it('returns exactly -0 for force 0', () => {
      const result = toD3Repel(0);
      expect(Object.is(result, -0)).toBe(true);
    });

    it('returns -250 for force 10', () => {
      expect(toD3Repel(10)).toBe(-250);
    });

    it('returns -500 for force 20', () => {
      expect(toD3Repel(20)).toBe(-500);
    });

    it('returns -125 for force 5', () => {
      expect(toD3Repel(5)).toBe(-125);
    });
  });

  describe('calculateNodeSizes', () => {
    it('delegates to computeUniformSizes for uniform mode', () => {
      const sizes = calculateNodeSizes(
        [{ id: 'a.ts', label: 'a.ts', color: '#fff' }],
        [],
        'uniform'
      );
      expect(sizes.get('a.ts')).toBe(16);
    });

    it('delegates to computeConnectionSizes for connections mode', () => {
      const leaves = Array.from({ length: 15 }, (_, index) => ({
        id: `leaf-${index}.ts`, label: `leaf-${index}.ts`, color: '#fff',
      }));
      const sizes = calculateNodeSizes(
        [{ id: 'hub.ts', label: 'hub.ts', color: '#fff' }, ...leaves],
        leaves.map(leaf => ({ from: 'hub.ts', to: leaf.id })),
        'connections',
      );
      expect(sizes.get('hub.ts')).toBe(12);
    });

    it('delegates to computeChurnSizes for churn mode', () => {
      const sizes = calculateNodeSizes(
        [
          { id: 'a.ts', label: 'a.ts', color: '#fff', churn: 5 },
          { id: 'b.ts', label: 'b.ts', color: '#fff', churn: 1 },
        ],
        [],
        'churn'
      );
      expect(sizes.get('a.ts')).toBe(40);
    });

    it('delegates to computeFileSizeSizes for file-size mode', () => {
      const sizes = calculateNodeSizes(
        [{ id: 'a.ts', label: 'a.ts', color: '#fff', fileSize: 9999 }],
        [],
        'file-size'
      );
      expect(sizes.get('a.ts')).toBeDefined();
    });

    it('returns default sizes for unknown mode', () => {
      const sizes = calculateNodeSizes(
        [{ id: 'a.ts', label: 'a.ts', color: '#fff' }],
        [],
        'unknown-mode' as never
      );
      expect(sizes.get('a.ts')).toBe(16);
    });
  });
});
