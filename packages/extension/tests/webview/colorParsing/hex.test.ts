import { describe, expect, it } from 'vitest';
import { parseHexColor } from '../../../src/webview/colorParsing/hex';

describe('webview/colorParsing/hex', () => {
  it('parses six-digit hex colors case-insensitively', () => {
    expect(parseHexColor('#10A0ff')).toEqual({ r: 16, g: 160, b: 255 });
  });

  it('rejects unsupported and unanchored hex strings', () => {
    expect(parseHexColor('#abc')).toBeNull();
    expect(parseHexColor('prefix #10a0ff')).toBeNull();
    expect(parseHexColor('#10a0ff suffix')).toBeNull();
  });
});
