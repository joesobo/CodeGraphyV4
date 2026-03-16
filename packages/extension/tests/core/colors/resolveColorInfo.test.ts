import { describe, it, expect } from 'vitest';
import { resolveColorInfo } from '../../../src/core/colors/resolveColorInfo';
import { DEFAULT_FALLBACK_COLOR } from '../../../src/core/colors/colorPaletteTypes';

function emptyMap(): Map<string, string> {
  return new Map();
}

describe('resolveColorInfo', () => {
  it('returns user pattern color when file matches a user pattern', () => {
    const userPatterns = new Map([['**/*.test.ts', '#FF0000']]);

    const result = resolveColorInfo(
      'src/app.test.ts', userPatterns, emptyMap(), emptyMap(), emptyMap(), emptyMap()
    );

    expect(result).toEqual({ color: '#FF0000', source: 'user' });
  });

  it('returns plugin pattern color when file matches a plugin pattern but not user pattern', () => {
    const pluginPatterns = new Map([['**/*.spec.ts', '#00FF00']]);

    const result = resolveColorInfo(
      'src/app.spec.ts', emptyMap(), pluginPatterns, emptyMap(), emptyMap(), emptyMap()
    );

    expect(result).toEqual({ color: '#00FF00', source: 'plugin' });
  });

  it('prefers user pattern over plugin pattern when both match', () => {
    const userPatterns = new Map([['**/*.ts', '#FF0000']]);
    const pluginPatterns = new Map([['**/*.ts', '#00FF00']]);

    const result = resolveColorInfo(
      'src/app.ts', userPatterns, pluginPatterns, emptyMap(), emptyMap(), emptyMap()
    );

    expect(result).toEqual({ color: '#FF0000', source: 'user' });
  });

  it('returns user extension color when no pattern matches', () => {
    const userExtColors = new Map([['.ts', '#0000FF']]);

    const result = resolveColorInfo(
      'src/app.ts', emptyMap(), emptyMap(), userExtColors, emptyMap(), emptyMap()
    );

    expect(result).toEqual({ color: '#0000FF', source: 'user' });
  });

  it('returns plugin extension color when no pattern or user extension matches', () => {
    const pluginExtColors = new Map([['.ts', '#AABBCC']]);

    const result = resolveColorInfo(
      'src/app.ts', emptyMap(), emptyMap(), emptyMap(), pluginExtColors, emptyMap()
    );

    expect(result).toEqual({ color: '#AABBCC', source: 'plugin' });
  });

  it('returns generated color when no pattern or explicit extension matches', () => {
    const generatedColors = new Map([['.ts', '#123456']]);

    const result = resolveColorInfo(
      'src/app.ts', emptyMap(), emptyMap(), emptyMap(), emptyMap(), generatedColors
    );

    expect(result).toEqual({ color: '#123456', source: 'generated' });
  });

  it('returns fallback color when nothing matches', () => {
    const result = resolveColorInfo(
      'src/app.ts', emptyMap(), emptyMap(), emptyMap(), emptyMap(), emptyMap()
    );

    expect(result).toEqual({ color: DEFAULT_FALLBACK_COLOR, source: 'generated' });
  });

  it('normalizes backslashes in file paths to forward slashes', () => {
    const userPatterns = new Map([['src/**/*.ts', '#FF0000']]);

    const result = resolveColorInfo(
      'src\\app.ts', userPatterns, emptyMap(), emptyMap(), emptyMap(), emptyMap()
    );

    expect(result).toEqual({ color: '#FF0000', source: 'user' });
  });

  it('extracts filename from path for pattern matching', () => {
    const userPatterns = new Map([['app.ts', '#FF0000']]);

    const result = resolveColorInfo(
      'src/app.ts', userPatterns, emptyMap(), emptyMap(), emptyMap(), emptyMap()
    );

    expect(result).toEqual({ color: '#FF0000', source: 'user' });
  });

  it('prioritizes user extension over plugin extension for same extension', () => {
    const userExtColors = new Map([['.ts', '#FF0000']]);
    const pluginExtColors = new Map([['.ts', '#00FF00']]);

    const result = resolveColorInfo(
      'src/app.ts', emptyMap(), emptyMap(), userExtColors, pluginExtColors, emptyMap()
    );

    expect(result).toEqual({ color: '#FF0000', source: 'user' });
  });

  it('prioritizes plugin extension over generated color', () => {
    const pluginExtColors = new Map([['.ts', '#AABBCC']]);
    const generatedColors = new Map([['.ts', '#123456']]);

    const result = resolveColorInfo(
      'src/app.ts', emptyMap(), emptyMap(), emptyMap(), pluginExtColors, generatedColors
    );

    expect(result).toEqual({ color: '#AABBCC', source: 'plugin' });
  });

  it('handles file with no extension by using fallback color', () => {
    const result = resolveColorInfo(
      'Makefile', emptyMap(), emptyMap(), emptyMap(), emptyMap(), emptyMap()
    );

    expect(result).toEqual({ color: DEFAULT_FALLBACK_COLOR, source: 'generated' });
  });

  it('handles path that is just a filename', () => {
    const userExtColors = new Map([['.ts', '#FF0000']]);

    const result = resolveColorInfo(
      'app.ts', emptyMap(), emptyMap(), userExtColors, emptyMap(), emptyMap()
    );

    expect(result).toEqual({ color: '#FF0000', source: 'user' });
  });
});
