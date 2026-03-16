import { describe, it, expect } from 'vitest';
import {
  computeUniformSizes,
  computeConnectionSizes,
  computeAccessCountSizes,
  computeFileSizeSizes,
} from '../../../src/webview/components/graphModel/sizingModes';

const DEFAULT_NODE_SIZE = 16;

describe('graphModel/sizingModes', () => {
  describe('computeUniformSizes', () => {
    it('assigns the default size to every node', () => {
      const sizes = computeUniformSizes([
        { id: 'a.ts', label: 'a.ts', color: '#93C5FD' },
        { id: 'b.ts', label: 'b.ts', color: '#67E8F9' },
      ]);

      expect(sizes.get('a.ts')).toBe(DEFAULT_NODE_SIZE);
      expect(sizes.get('b.ts')).toBe(DEFAULT_NODE_SIZE);
    });

    it('returns an empty map for an empty node list', () => {
      expect(computeUniformSizes([]).size).toBe(0);
    });
  });

  describe('computeConnectionSizes', () => {
    it('scales sizes by edge count, giving the hub node the maximum size', () => {
      const sizes = computeConnectionSizes(
        [
          { id: 'hub.ts', label: 'hub.ts', color: '#93C5FD' },
          { id: 'leaf-a.ts', label: 'leaf-a.ts', color: '#67E8F9' },
          { id: 'leaf-b.ts', label: 'leaf-b.ts', color: '#67E8F9' },
        ],
        [
          { from: 'hub.ts', to: 'leaf-a.ts' },
          { from: 'hub.ts', to: 'leaf-b.ts' },
        ]
      );

      expect(sizes.get('hub.ts')).toBe(40);
      expect(sizes.get('leaf-a.ts')).toBe(25);
      expect(sizes.get('leaf-b.ts')).toBe(25);
    });

    it('assigns the minimum size to all nodes when there are no edges', () => {
      const sizes = computeConnectionSizes(
        [{ id: 'solo.ts', label: 'solo.ts', color: '#93C5FD' }],
        []
      );

      expect(sizes.get('solo.ts')).toBe(10);
    });
  });

  describe('computeAccessCountSizes', () => {
    it('scales sizes from the observed access count range', () => {
      const sizes = computeAccessCountSizes([
        { id: 'small.ts', label: 'small.ts', color: '#93C5FD', accessCount: 1 },
        { id: 'medium.ts', label: 'medium.ts', color: '#67E8F9', accessCount: 2 },
        { id: 'large.ts', label: 'large.ts', color: '#38BDF8', accessCount: 5 },
      ]);

      expect(sizes.get('small.ts')).toBe(16);
      expect(sizes.get('medium.ts')).toBe(22);
      expect(sizes.get('large.ts')).toBe(40);
    });

    it('treats missing access count as zero', () => {
      const sizes = computeAccessCountSizes([
        { id: 'a.ts', label: 'a.ts', color: '#93C5FD' },
        { id: 'b.ts', label: 'b.ts', color: '#67E8F9', accessCount: 10 },
      ]);

      expect(sizes.get('a.ts')).toBe(10);
      expect(sizes.get('b.ts')).toBe(40);
    });
  });

  describe('computeFileSizeSizes', () => {
    it('returns the default size for all nodes when no node has a positive file size', () => {
      const sizes = computeFileSizeSizes([
        { id: 'empty.ts', label: 'empty.ts', color: '#93C5FD' },
        { id: 'zero.ts', label: 'zero.ts', color: '#67E8F9', fileSize: 0 },
      ]);

      expect(sizes.get('empty.ts')).toBe(DEFAULT_NODE_SIZE);
      expect(sizes.get('zero.ts')).toBe(DEFAULT_NODE_SIZE);
    });

    it('uses log scaling for positive file sizes and keeps zero-byte files at the minimum', () => {
      const sizes = computeFileSizeSizes([
        { id: 'zero.ts', label: 'zero.ts', color: '#93C5FD', fileSize: 0 },
        { id: 'small.ts', label: 'small.ts', color: '#67E8F9', fileSize: 99 },
        { id: 'large.ts', label: 'large.ts', color: '#38BDF8', fileSize: 9999 },
      ]);

      expect(sizes.get('zero.ts')).toBe(10);
      expect(sizes.get('small.ts')).toBe(10);
      expect(sizes.get('large.ts')).toBe(40);
    });
  });
});
