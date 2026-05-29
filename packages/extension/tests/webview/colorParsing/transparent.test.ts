import { describe, expect, it } from 'vitest';
import { isFullyTransparentColor } from '../../../src/webview/colorParsing/transparent';

describe('webview/colorParsing/transparent', () => {
  it('accepts the transparent keyword regardless of casing or surrounding whitespace', () => {
    expect(isFullyTransparentColor(' transparent ')).toBe(true);
    expect(isFullyTransparentColor('TRANSPARENT')).toBe(true);
  });

  it('accepts rgba values with zero alpha', () => {
    expect(isFullyTransparentColor('rgba(0, 0, 0, 0)')).toBe(true);
    expect(isFullyTransparentColor('rgba(12, 34, 56, 0.000)')).toBe(true);
  });

  it('rejects non-zero alpha and malformed rgba values', () => {
    expect(isFullyTransparentColor('rgba(0, 0, 0, 1)')).toBe(false);
    expect(isFullyTransparentColor('rgba(0, 0, 0, 0.5)')).toBe(false);
    expect(isFullyTransparentColor('rgba(0, 0, 0, 0.)')).toBe(false);
    expect(isFullyTransparentColor('rgba(0, 0, 0, 0.0x)')).toBe(false);
    expect(isFullyTransparentColor('rgba(0, 0, 0)')).toBe(false);
    expect(isFullyTransparentColor('rgb(0, 0, 0)')).toBe(false);
    expect(isFullyTransparentColor('rgba(0, 0, 0, 0) trailing')).toBe(false);
  });
});
