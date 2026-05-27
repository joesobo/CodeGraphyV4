import { describe, expect, it } from 'vitest';
import { parseCssColorFunction } from '../../../src/webview/colorParsing/functions';

describe('webview/colorParsing/functions', () => {
  it('parses a lowercase function name and trimmed comma-separated arguments', () => {
    expect(parseCssColorFunction('RGB( 10, 20 ,30 )')).toEqual({
      name: 'rgb',
      args: ['10', '20', '30'],
    });
    expect(parseCssColorFunction(' z ( 1 ) ')).toEqual({
      name: 'z',
      args: ['1'],
    });
  });

  it('rejects values without a complete color function', () => {
    expect(parseCssColorFunction('rgb 10, 20, 30')).toBeNull();
    expect(parseCssColorFunction('rgb(10, 20, 30')).toBeNull();
    expect(parseCssColorFunction('rgb(10, 20, 30) trailing')).toBeNull();
    expect(parseCssColorFunction('rgb)10, 20, 30(')).toBeNull();
  });

  it('rejects function names containing non-letter characters', () => {
    expect(parseCssColorFunction('1rgb(10, 20, 30)')).toBeNull();
    expect(parseCssColorFunction('r-g-b(10, 20, 30)')).toBeNull();
    expect(parseCssColorFunction('rgb2(10, 20, 30)')).toBeNull();
    expect(parseCssColorFunction('(10, 20, 30)')).toBeNull();
  });
});
