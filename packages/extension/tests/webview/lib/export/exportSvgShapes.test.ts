import { describe, expect, it } from 'vitest';
import { escapeXml, svgShapePath } from '../../../../src/webview/lib/export/exportSvgShapes';

describe('exportSvgShapes', () => {
  describe('escapeXml', () => {
    it('escapes reserved XML characters in labels', () => {
      expect(escapeXml(`alpha & <beta> "gamma" 'delta'`)).toBe(
        'alpha &amp; &lt;beta&gt; &quot;gamma&quot; &apos;delta&apos;'
      );
    });
  });

  describe('svgShapePath', () => {
    it('returns exact paths for axis-aligned shapes', () => {
      expect(svgShapePath('square', 10, 20, 5)).toBe('M5,15h10v10h-10Z');
      expect(svgShapePath('diamond', 10, 20, 5)).toBe('M10,15L15,20L10,25L5,20Z');
    });

    it.each([
      ['triangle', 2],
      ['hexagon', 5],
      ['star', 9],
    ] as const)('returns a closed %s path with the expected segment count', (shape, segmentCount) => {
      const path = svgShapePath(shape, 0, 0, 10);

      expect(path.startsWith('M')).toBe(true);
      expect(path.endsWith('Z')).toBe(true);
      expect((path.match(/L/g) ?? [])).toHaveLength(segmentCount);
    });

    it('returns an empty path for circle and unknown shapes', () => {
      expect(svgShapePath('circle', 0, 0, 10)).toBe('');
      expect(svgShapePath(undefined, 0, 0, 10)).toBe('');
    });
  });
});
