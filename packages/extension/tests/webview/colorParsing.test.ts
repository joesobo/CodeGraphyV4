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
});
