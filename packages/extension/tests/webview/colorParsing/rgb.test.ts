import { describe, expect, it } from 'vitest';
import { parseRgbColor } from '../../../src/webview/colorParsing/rgb';

describe('webview/colorParsing/rgb', () => {
  it('parses rgb and rgba channels', () => {
    expect(parseRgbColor('rgb(10,20,30)')).toEqual({ r: 10, g: 20, b: 30 });
    expect(parseRgbColor('rgba(40, 50, 60, 0.5)')).toEqual({ r: 40, g: 50, b: 60 });
  });

  it('rejects missing and non-integer rgb channels', () => {
    expect(parseRgbColor('rgb(10, 20)')).toBeNull();
    expect(parseRgbColor('rgb(10, 20, blue)')).toBeNull();
    expect(parseRgbColor('rgb(10.5, 20, 30)')).toBeNull();
    expect(parseRgbColor('rgb(10, blue, 30)')).toBeNull();
  });

  it('rejects unanchored rgb functions and other function names', () => {
    expect(parseRgbColor('prefix rgb(10, 20, 30)')).toBeNull();
    expect(parseRgbColor('rgb(10, 20, 30) suffix')).toBeNull();
    expect(parseRgbColor('hsl(10, 20, 30)')).toBeNull();
  });
});
