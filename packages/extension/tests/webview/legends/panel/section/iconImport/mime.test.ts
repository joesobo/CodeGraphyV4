import { describe, expect, it } from 'vitest';
import { getIconMimeType } from '../../../../../../src/webview/components/legends/panel/section/iconImport/mime';

function createFile(name: string, type = ''): File {
  return new File(['icon'], name, { type });
}

describe('legends/panel/section/iconImport mime', () => {
  it('keeps the file provided MIME type when available', () => {
    expect(getIconMimeType(createFile('icon.svg', 'image/custom'))).toBe('image/custom');
  });

  it('infers png and svg MIME types when the file type is missing', () => {
    expect(getIconMimeType(createFile('icon.png'))).toBe('image/png');
    expect(getIconMimeType(createFile('icon.svg'))).toBe('image/svg+xml');
    expect(getIconMimeType(createFile('icon'))).toBe('image/svg+xml');
  });
});
