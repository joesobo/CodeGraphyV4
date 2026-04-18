import { describe, it, expect } from 'vitest';
import {
  resolveDirectionColor,
  getDepthOpacity,
  getDepthSizeMultiplier,
} from '../../../../../src/webview/components/graph/model/node/display';
import { DEFAULT_DIRECTION_COLOR } from '../../../../../src/shared/fileColors';

describe('nodeDisplay (mutation kill tests)', () => {
  /**
   * Kill L7:10 Regex boundary mutations.
   * The regex is `/^#[0-9A-F]{6}$/i`. Stryker may:
   *   - Remove the `^` anchor: would accept strings like "abc#123456"
   *   - Remove the `$` anchor: would accept strings like "#123456xyz"
   *
   * Test inputs that would match without anchors but should fail with them.
   */
  describe('resolveDirectionColor regex boundary mutations', () => {
    it('rejects a string with valid hex color preceded by extra characters', () => {
      // Without ^ anchor, "xx#AABBCC" would match
      expect(resolveDirectionColor('xx#AABBCC')).toBe(DEFAULT_DIRECTION_COLOR);
    });

    it('rejects a string with valid hex color followed by extra characters', () => {
      // Without $ anchor, "#AABBCCxx" would match
      expect(resolveDirectionColor('#AABBCCxx')).toBe(DEFAULT_DIRECTION_COLOR);
    });

    it('rejects a hex color with 7 digits (too long)', () => {
      expect(resolveDirectionColor('#AABBCC1')).toBe(DEFAULT_DIRECTION_COLOR);
    });

    it('rejects a hex color with 5 digits (too short)', () => {
      expect(resolveDirectionColor('#AABBC')).toBe(DEFAULT_DIRECTION_COLOR);
    });

    it('accepts exactly a 6-digit hex color with mixed case', () => {
      expect(resolveDirectionColor('#aAbBcC')).toBe('#aAbBcC');
    });
  });

  /**
   * Kill L12:7 ConditionalExpression: false — mutant replaces
   *   `if (depthLevel === 0) return 1.0;` with `if (false) return 1.0;`
   * in getDepthOpacity. So depth 0 would fall through to the Math.max formula.
   * Math.max(0.4, 1.0 - 0 * 0.15) = Math.max(0.4, 1.0) = 1.0
   * This is equivalent! The formula gives 1.0 for depth 0 anyway.
   * But let's verify that depth 0 returns exactly 1.0.
   */
  describe('getDepthOpacity conditional mutations', () => {
    it('returns exactly 1.0 for depth 0', () => {
      expect(getDepthOpacity(0)).toBe(1.0);
    });

    it('returns less than 1.0 for depth 1', () => {
      expect(getDepthOpacity(1)).toBeLessThan(1.0);
      expect(getDepthOpacity(1)).toBeCloseTo(0.85);
    });

    it('returns different values for depth 0 vs depth 3', () => {
      expect(getDepthOpacity(0)).not.toBe(getDepthOpacity(3));
    });

    it('returns 1.0 for undefined (distinguished from depth 0 path)', () => {
      expect(getDepthOpacity(undefined)).toBe(1.0);
    });
  });

  /**
   * Kill L17:7 ConditionalExpression: false — mutant replaces
   *   `if (depthLevel === 0) return 1.3;` with `if (false) return 1.3;`
   * in getDepthSizeMultiplier. Depth 0 would then return 1.0 instead of 1.3.
   */
  describe('getDepthSizeMultiplier conditional mutations', () => {
    it('returns 1.3 for depth 0, not 1.0', () => {
      const result = getDepthSizeMultiplier(0);
      expect(result).toBe(1.3);
      expect(result).not.toBe(1.0);
    });

    it('returns 1.0 for depth 1', () => {
      expect(getDepthSizeMultiplier(1)).toBe(1.0);
    });

    it('returns different values for depth 0 vs undefined', () => {
      // undefined -> 1.0, depth 0 -> 1.3
      expect(getDepthSizeMultiplier(0)).not.toBe(getDepthSizeMultiplier(undefined));
    });

    it('depth 0 multiplier is strictly greater than depth 1 multiplier', () => {
      expect(getDepthSizeMultiplier(0)).toBeGreaterThan(getDepthSizeMultiplier(1));
    });
  });
});
