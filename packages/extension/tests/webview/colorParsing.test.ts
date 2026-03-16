import { describe, it, expect } from 'vitest';
import { parseColor, adjustColorForLightTheme } from '../../src/webview/colorParsing';

describe('parseColor', () => {
  it('parses a six-digit hex color', () => {
    expect(parseColor('#ff8000')).toEqual({ r: 255, g: 128, b: 0 });
  });

  it('parses a hex color case-insensitively', () => {
    expect(parseColor('#FF8000')).toEqual({ r: 255, g: 128, b: 0 });
  });

  it('parses an rgb() color', () => {
    expect(parseColor('rgb(10, 20, 30)')).toEqual({ r: 10, g: 20, b: 30 });
  });

  it('parses an rgba() color', () => {
    expect(parseColor('rgba(10, 20, 30, 0.5)')).toEqual({ r: 10, g: 20, b: 30 });
  });

  it('returns null for an unrecognized format', () => {
    expect(parseColor('hsl(120, 50%, 50%)')).toBeNull();
  });

  it('returns null for an empty string', () => {
    expect(parseColor('')).toBeNull();
  });

  it('returns null for a three-digit hex color (not supported)', () => {
    expect(parseColor('#f80')).toBeNull();
  });
});

describe('adjustColorForLightTheme', () => {
  it('darkens a hex color by 30%', () => {
    // #ffffff (255,255,255) * 0.7 = round(178.5) = 179 = 0xb3
    expect(adjustColorForLightTheme('#ffffff')).toBe('#b3b3b3');
  });

  it('returns the original color when parsing fails', () => {
    expect(adjustColorForLightTheme('invalid')).toBe('invalid');
  });

  it('handles black without error', () => {
    expect(adjustColorForLightTheme('#000000')).toBe('#000000');
  });

  it('produces a lower-brightness result than the input', () => {
    const result = adjustColorForLightTheme('#8080ff');
    const parsed = parseColor(result);
    expect(parsed).not.toBeNull();
    // All channels should be at most the original values
    expect(parsed!.r).toBeLessThanOrEqual(128);
    expect(parsed!.g).toBeLessThanOrEqual(128);
    expect(parsed!.b).toBeLessThanOrEqual(255);
  });

  it('applies a darken factor of exactly 0.7', () => {
    // #646464 (100, 100, 100) * 0.7 = round(70) = 70 = 0x46
    expect(adjustColorForLightTheme('#646464')).toBe('#464646');
  });

  it('pads each channel to two hex digits', () => {
    // #0a0a0a (10, 10, 10) * 0.7 = round(7) = 7 = 0x07
    expect(adjustColorForLightTheme('#0a0a0a')).toBe('#070707');
  });

  it('correctly darkens each channel independently', () => {
    // #ff0000 (255, 0, 0) * 0.7 => r=round(178.5)=179=0xb3, g=0, b=0
    const result = adjustColorForLightTheme('#ff0000');
    const parsed = parseColor(result);
    expect(parsed).not.toBeNull();
    expect(parsed!.r).toBe(179);
    expect(parsed!.g).toBe(0);
    expect(parsed!.b).toBe(0);
  });
});

describe('parseColor edge cases', () => {
  it('correctly parses each hex channel independently', () => {
    const result = parseColor('#102030');
    expect(result).toEqual({ r: 16, g: 32, b: 48 });
  });

  it('parses rgb with no spaces', () => {
    expect(parseColor('rgb(10,20,30)')).toEqual({ r: 10, g: 20, b: 30 });
  });

  it('returns null for rgb with missing values', () => {
    expect(parseColor('rgb(10, 20)')).toBeNull();
  });

  it('returns null for a partial hex string', () => {
    expect(parseColor('#12345')).toBeNull();
  });

  it('returns null for a hex string with 8 characters', () => {
    expect(parseColor('#12345678')).toBeNull();
  });
});
