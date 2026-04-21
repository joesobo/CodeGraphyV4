import { describe, expect, it } from 'vitest';
import {
  formatLegendColor,
  parseLegendColor,
  toLegendColorHex,
  withLegendAlpha,
  withLegendHexColor,
} from '../../../../src/webview/components/legends/panel/section/colorModel';

describe('webview/components/legends/panel/colorModel', () => {
  it('parses opaque and transparent legend colors', () => {
    expect(parseLegendColor('#123456')).toEqual({ r: 18, g: 52, b: 86, alpha: 1 });
    expect(parseLegendColor('rgba(0, 0, 0, 0)')).toEqual({ r: 0, g: 0, b: 0, alpha: 0 });
  });

  it('formats rgba values only when transparency is present', () => {
    expect(formatLegendColor({ r: 18, g: 52, b: 86, alpha: 1 })).toBe('#123456');
    expect(formatLegendColor({ r: 18, g: 52, b: 86, alpha: 0.4 })).toBe('rgba(18, 52, 86, 0.4)');
  });

  it('updates hex and alpha independently', () => {
    const parsed = parseLegendColor('#112233');

    expect(toLegendColorHex(parsed)).toBe('#112233'.toUpperCase());
    expect(withLegendHexColor(parsed, '#AABBCC')).toEqual({ r: 170, g: 187, b: 204, alpha: 1 });
    expect(withLegendAlpha(parsed, 0.25)).toEqual({ r: 17, g: 34, b: 51, alpha: 0.25 });
  });
});
