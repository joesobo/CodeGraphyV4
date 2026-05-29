import { describe, expect, it } from 'vitest';
import { parseColor } from '../../../src/webview/colorParsing/parse';

describe('webview/colorParsing/parse', () => {
  it('parses supported hex and rgb color formats', () => {
    expect(parseColor('#102030')).toEqual({ r: 16, g: 32, b: 48 });
    expect(parseColor('rgb(10, 20, 30)')).toEqual({ r: 10, g: 20, b: 30 });
  });

  it('returns null when no supported parser matches', () => {
    expect(parseColor('hsl(120, 50%, 50%)')).toBeNull();
  });
});
