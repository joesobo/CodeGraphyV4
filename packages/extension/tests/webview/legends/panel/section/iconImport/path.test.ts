import { describe, expect, it } from 'vitest';
import {
  buildLegendIconPath,
  getIconBaseName,
  getIconExtension,
  sanitizeIconPathSegment,
} from '../../../../../../src/webview/components/legends/panel/section/iconImport/path';

describe('legends/panel/section/iconImport path', () => {
  it('sanitizes path segments for persisted legend icon names', () => {
    expect(sanitizeIconPathSegment('  Type Script  ')).toBe('type-script');
    expect(sanitizeIconPathSegment('C# + .NET')).toBe('c-net');
    expect(sanitizeIconPathSegment('---Type Script---')).toBe('type-script');
    expect(sanitizeIconPathSegment('---')).toBe('icon');
  });

  it('uses png only for png file names and falls back to svg', () => {
    expect(getIconExtension('icon.PNG')).toBe('png');
    expect(getIconExtension('icon.svg')).toBe('svg');
    expect(getIconExtension('icon')).toBe('svg');
  });

  it('removes only the final file extension from the icon base name', () => {
    expect(getIconBaseName('my.icon.svg')).toBe('my.icon');
    expect(getIconBaseName('icon')).toBe('icon');
  });

  it('builds a deterministic legend icon path from the legend id and file name', () => {
    expect(buildLegendIconPath('legend:custom', 'Type Script.svg')).toBe(
      '.codegraphy/icons/legend-custom-type-script.svg',
    );
    expect(buildLegendIconPath(' ', '---.PNG')).toBe(
      '.codegraphy/icons/icon-icon.png',
    );
  });
});
