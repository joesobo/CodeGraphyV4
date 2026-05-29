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

  it('parses trimmed hex colors without accepting surrounding text', () => {
    expect(parseLegendColor('  #abcdef  ')).toEqual({ r: 171, g: 205, b: 239, alpha: 1 });
    expect(parseLegendColor('prefix #ABCDEF')).toEqual({ r: 0, g: 0, b: 0, alpha: 1 });
    expect(parseLegendColor('#ABCDEF suffix')).toEqual({ r: 0, g: 0, b: 0, alpha: 1 });
  });

  it('parses rgb and rgba function colors with optional alpha', () => {
    expect(parseLegendColor('rgb(12, 34, 56)')).toEqual({ r: 12, g: 34, b: 56, alpha: 1 });
    expect(parseLegendColor('rgba(12, 34, 56)')).toEqual({ r: 12, g: 34, b: 56, alpha: 1 });
    expect(parseLegendColor('  RGB(12, 34, 56)  ')).toEqual({ r: 12, g: 34, b: 56, alpha: 1 });
    expect(parseLegendColor('rgb(12, 34, 56, .5)')).toEqual({ r: 12, g: 34, b: 56, alpha: 0.5 });
  });

  it('rejects malformed rgb colors instead of partially parsing them', () => {
    expect(parseLegendColor('rgb(12, 34, 56) trailing')).toEqual({ r: 0, g: 0, b: 0, alpha: 1 });
    expect(parseLegendColor('rgb(12, 34, 56')).toEqual({ r: 0, g: 0, b: 0, alpha: 1 });
    expect(parseLegendColor('rgb (12, 34, 56)')).toEqual({ r: 0, g: 0, b: 0, alpha: 1 });
    expect(parseLegendColor('hsl(12, 34, 56)')).toEqual({ r: 0, g: 0, b: 0, alpha: 1 });
    expect(parseLegendColor('rgb(12, 34)')).toEqual({ r: 0, g: 0, b: 0, alpha: 1 });
    expect(parseLegendColor('rgb(12, 34, 56, 0.5, 1)')).toEqual({ r: 0, g: 0, b: 0, alpha: 1 });
    expect(parseLegendColor('rgb(12, 34, 56, bad)')).toEqual({ r: 0, g: 0, b: 0, alpha: 1 });
    expect(parseLegendColor('rgb(12px, 34, 56)')).toEqual({ r: 0, g: 0, b: 0, alpha: 1 });
    expect(parseLegendColor('rgb(12, 34px, 56)')).toEqual({ r: 0, g: 0, b: 0, alpha: 1 });
  });

  it('clamps parsed rgb channels and alpha values', () => {
    expect(parseLegendColor('rgba(256, 999, 7, 1.5)')).toEqual({
      r: 255,
      g: 255,
      b: 7,
      alpha: 1,
    });
  });

  it('formats rgba values only when transparency is present', () => {
    expect(formatLegendColor({ r: 18, g: 52, b: 86, alpha: 1 })).toBe('#123456');
    expect(formatLegendColor({ r: 18, g: 52, b: 86, alpha: 0.4 })).toBe('rgba(18, 52, 86, 0.4)');
  });

  it('clamps and rounds formatted color channels', () => {
    expect(toLegendColorHex({ r: 0, g: 15, b: 16, alpha: 0.5 })).toBe('#000F10');
    expect(formatLegendColor({ r: -3, g: 15.4, b: 300, alpha: 0.456 })).toBe(
      'rgba(0, 15, 255, 0.46)',
    );
  });

  it('updates hex and alpha independently', () => {
    const parsed = parseLegendColor('#112233');

    expect(toLegendColorHex(parsed)).toBe('#112233'.toUpperCase());
    expect(withLegendHexColor(parsed, '#AABBCC')).toEqual({ r: 170, g: 187, b: 204, alpha: 1 });
    expect(withLegendAlpha(parsed, 0.25)).toEqual({ r: 17, g: 34, b: 51, alpha: 0.25 });
  });

  it('preserves alpha when replacing a valid hex color', () => {
    expect(withLegendHexColor({ r: 17, g: 34, b: 51, alpha: 0.25 }, '#AABBCC')).toEqual({
      r: 170,
      g: 187,
      b: 204,
      alpha: 0.25,
    });
  });

  it('keeps the current color when the replacement hex is invalid', () => {
    const currentColor = { r: 17, g: 34, b: 51, alpha: 0.25 };

    expect(withLegendHexColor(currentColor, 'not-a-color')).toBe(currentColor);
  });

  it('clamps alpha updates into the visible opacity range', () => {
    expect(withLegendAlpha({ r: 17, g: 34, b: 51, alpha: 0.25 }, -1)).toEqual({
      r: 17,
      g: 34,
      b: 51,
      alpha: 0,
    });
    expect(withLegendAlpha({ r: 17, g: 34, b: 51, alpha: 0.25 }, 2)).toEqual({
      r: 17,
      g: 34,
      b: 51,
      alpha: 1,
    });
  });
});
