import { describe, expect, it } from 'vitest';
import { escapeXml, svgShapePath } from '../../../src/webview/export/svgShapes';

describe('exportSvgShapes', () => {
  describe('escapeXml', () => {
    it('escapes reserved XML characters in labels', () => {
      expect(escapeXml(`alpha & <beta> "gamma" 'delta'`)).toBe(
        'alpha &amp; &lt;beta&gt; &quot;gamma&quot; &apos;delta&apos;'
      );
    });
  });

  describe('svgShapePath', () => {
    it.each([
      ['square', 'M5,15h10v10h-10Z'],
      ['diamond', 'M10,15L15,20L10,25L5,20Z'],
      [
        'triangle',
        'M10,15L14.330127018922195,22.5L5.669872981077807,22.5Z',
      ],
      [
        'hexagon',
        'M10,15L14.330127018922193,17.5L14.330127018922195,22.5L10,25L5.669872981077807,22.5L5.669872981077805,17.500000000000004Z',
      ],
      [
        'star',
        'M10,15L11.175570504584947,18.381966011250107L14.755282581475768,18.454915028125264L11.902113032590307,20.618033988749893L12.938926261462367,24.045084971874736L10,22L7.061073738537635,24.045084971874736L8.097886967409693,20.618033988749897L5.244717418524232,18.454915028125264L8.824429495415053,18.381966011250107Z',
      ],
    ] as const)('returns the exact %s path', (shape, expectedPath) => {
      expect(svgShapePath(shape, 10, 20, 5)).toBe(expectedPath);
    });

    it('returns an empty path for circle and unknown shapes', () => {
      expect(svgShapePath('circle', 0, 0, 10)).toBe('');
      expect(svgShapePath(undefined, 0, 0, 10)).toBe('');
    });
  });
});
