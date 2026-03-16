import { describe, expect, it } from 'vitest';
import { svgRegularPolygonPath } from '../../../src/webview/export/svgRegularPolygonPath';

describe('exportSvgRegularPolygonPath', () => {
  it.each([
    [
      'triangle',
      3,
      'M6.123233995736766e-16,-10L8.660254037844387,4.999999999999998L-8.660254037844386,5.0000000000000036Z',
    ],
    [
      'hexagon',
      6,
      'M6.123233995736766e-16,-10L8.660254037844386,-5L8.660254037844387,4.999999999999998L6.123233995736766e-16,10L-8.660254037844386,5.0000000000000036L-8.66025403784439,-4.999999999999994Z',
    ],
  ] as const)('returns the exact %s path for the current geometry', (_label, sides, expectedPath) => {
    expect(svgRegularPolygonPath(0, 0, 10, sides)).toBe(expectedPath);
  });
});
