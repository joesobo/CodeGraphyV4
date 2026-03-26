import { describe, it, expect } from 'vitest';
import {
  resolveDirectionColor,
  getDepthOpacity,
  getDepthSizeMultiplier,
  getNodeType,
} from '../../../src/webview/components/graphModel/nodeDisplay';
import { DEFAULT_DIRECTION_COLOR } from '../../../src/shared/contracts';

describe('nodeDisplay (mutation targets)', () => {
  describe('resolveDirectionColor', () => {
    it('accepts valid 6-digit hex color with uppercase', () => {
      expect(resolveDirectionColor('#AABBCC')).toBe('#AABBCC');
    });

    it('accepts valid 6-digit hex color with lowercase', () => {
      expect(resolveDirectionColor('#aabbcc')).toBe('#aabbcc');
    });

    it('rejects 3-digit hex shorthand', () => {
      expect(resolveDirectionColor('#abc')).toBe(DEFAULT_DIRECTION_COLOR);
    });

    it('rejects empty string', () => {
      expect(resolveDirectionColor('')).toBe(DEFAULT_DIRECTION_COLOR);
    });

    it('rejects color name', () => {
      expect(resolveDirectionColor('red')).toBe(DEFAULT_DIRECTION_COLOR);
    });

    it('rejects hex without hash', () => {
      expect(resolveDirectionColor('AABBCC')).toBe(DEFAULT_DIRECTION_COLOR);
    });
  });

  describe('getDepthOpacity', () => {
    it('returns 1.0 for undefined depth', () => {
      expect(getDepthOpacity(undefined)).toBe(1.0);
    });

    it('returns 1.0 for depth 0 (focused)', () => {
      expect(getDepthOpacity(0)).toBe(1.0);
    });

    it('returns 0.85 for depth 1', () => {
      expect(getDepthOpacity(1)).toBeCloseTo(0.85);
    });

    it('returns 0.7 for depth 2', () => {
      expect(getDepthOpacity(2)).toBeCloseTo(0.7);
    });

    it('clamps to 0.4 for very deep nodes', () => {
      expect(getDepthOpacity(100)).toBe(0.4);
    });

    it('returns exactly 0.4 at depth 4', () => {
      expect(getDepthOpacity(4)).toBeCloseTo(0.4);
    });
  });

  describe('getDepthSizeMultiplier', () => {
    it('returns 1.0 for undefined depth', () => {
      expect(getDepthSizeMultiplier(undefined)).toBe(1.0);
    });

    it('returns 1.3 for focused node (depth 0)', () => {
      expect(getDepthSizeMultiplier(0)).toBe(1.3);
    });

    it('returns 1.0 for depth 1', () => {
      expect(getDepthSizeMultiplier(1)).toBe(1.0);
    });

    it('returns 1.0 for depth 5', () => {
      expect(getDepthSizeMultiplier(5)).toBe(1.0);
    });
  });

  describe('getNodeType', () => {
    it('returns lower-case extension for normal file', () => {
      expect(getNodeType('src/App.tsx')).toBe('.tsx');
    });

    it('returns wildcard for file without extension', () => {
      expect(getNodeType('Makefile')).toBe('*');
    });

    it('returns wildcard for file ending with dot', () => {
      expect(getNodeType('file.')).toBe('*');
    });

    it('returns the last extension for multi-dot filenames', () => {
      expect(getNodeType('module.test.ts')).toBe('.ts');
    });

    it('handles deeply nested paths', () => {
      expect(getNodeType('a/b/c/d/file.go')).toBe('.go');
    });
  });
});
