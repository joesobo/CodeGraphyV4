import { describe, expect, it } from 'vitest';
import { arrayBufferToBase64 } from '../../../../../../src/webview/components/legends/panel/section/iconImport/encoding';

describe('legends/panel/section/iconImport encoding', () => {
  it('encodes an array buffer as base64', () => {
    const bytes = new Uint8Array([60, 115, 118, 103, 47, 62]);

    expect(arrayBufferToBase64(bytes.buffer)).toBe('PHN2Zy8+');
  });
});
