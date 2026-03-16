import { describe, it, expect } from 'vitest';
import {
  isExtension,
  normalizeExtension,
  getExtension,
  resolveColor,
  resolveColorInfo,
} from '@/core/colors/colorResolver';
import { DEFAULT_FALLBACK_COLOR } from '@/core/colors/ColorPaletteManager';

// ── Helper to build empty maps for unused layers ──────────────────────────────
const empty = <K, V>() => new Map<K, V>();

describe('isExtension', () => {
  it('returns true for short dot extensions like .ts', () => {
    expect(isExtension('.ts')).toBe(true);
  });

  it('returns true for short dot extensions like .tsx', () => {
    expect(isExtension('.tsx')).toBe(true);
  });

  it('returns false for dotfiles like .gitignore', () => {
    expect(isExtension('.gitignore')).toBe(false);
  });

  it('returns false for plain filenames like Makefile', () => {
    expect(isExtension('Makefile')).toBe(false);
  });

  it('returns false for glob patterns', () => {
    expect(isExtension('**/*.test.ts')).toBe(false);
  });

  it('returns false for paths with slashes', () => {
    expect(isExtension('src/index.ts')).toBe(false);
  });
});

describe('normalizeExtension', () => {
  it('adds a leading dot when missing', () => {
    expect(normalizeExtension('ts')).toBe('.ts');
  });

  it('lowercases the extension', () => {
    expect(normalizeExtension('.TS')).toBe('.ts');
  });

  it('trims surrounding whitespace', () => {
    expect(normalizeExtension('  .ts  ')).toBe('.ts');
  });

  it('preserves an already-normalized extension unchanged', () => {
    expect(normalizeExtension('.ts')).toBe('.ts');
  });
});

describe('getExtension', () => {
  it('returns the extension for a regular file', () => {
    expect(getExtension('src/app.ts')).toBe('.ts');
  });

  it('returns empty string for dotfiles', () => {
    expect(getExtension('.gitignore')).toBe('');
  });

  it('returns the last extension for multi-dot filenames', () => {
    expect(getExtension('app.test.ts')).toBe('.ts');
  });

  it('returns empty string for files without an extension', () => {
    expect(getExtension('Makefile')).toBe('');
  });
});

describe('resolveColor', () => {
  it('returns the user pattern color when the filename matches', () => {
    const userPatternColors = new Map([['Makefile', '#ff0000']]);

    const result = resolveColor(
      'Makefile',
      empty(),
      userPatternColors,
      empty(),
      empty(),
      empty()
    );

    expect(result).toBe('#ff0000');
  });

  it('returns the user pattern color when a glob matches the path', () => {
    const userPatternColors = new Map([['**/*.test.ts', '#ff0000']]);

    const result = resolveColor(
      'src/app.test.ts',
      empty(),
      userPatternColors,
      empty(),
      empty(),
      empty()
    );

    expect(result).toBe('#ff0000');
  });

  it('prefers user pattern over plugin pattern', () => {
    const userPatternColors = new Map([['Makefile', '#user']]);
    const pluginPatternColors = new Map([['Makefile', '#plugin']]);

    const result = resolveColor('Makefile', empty(), userPatternColors, empty(), pluginPatternColors, empty());

    expect(result).toBe('#user');
  });

  it('returns the plugin pattern color when no user pattern matches', () => {
    const pluginPatternColors = new Map([['Makefile', '#plugin']]);

    const result = resolveColor('Makefile', empty(), empty(), empty(), pluginPatternColors, empty());

    expect(result).toBe('#plugin');
  });

  it('returns the user extension color when no patterns match', () => {
    const userExtensionColors = new Map([['.ts', '#user-ext']]);

    const result = resolveColor('src/app.ts', userExtensionColors, empty(), empty(), empty(), empty());

    expect(result).toBe('#user-ext');
  });

  it('prefers user extension over plugin extension', () => {
    const userExtensionColors = new Map([['.ts', '#user-ext']]);
    const pluginExtensionColors = new Map([['.ts', '#plugin-ext']]);

    const result = resolveColor('src/app.ts', userExtensionColors, empty(), pluginExtensionColors, empty(), empty());

    expect(result).toBe('#user-ext');
  });

  it('returns the plugin extension color when no user colors match', () => {
    const pluginExtensionColors = new Map([['.ts', '#plugin-ext']]);

    const result = resolveColor('src/app.ts', empty(), empty(), pluginExtensionColors, empty(), empty());

    expect(result).toBe('#plugin-ext');
  });

  it('returns the generated color when no overrides match', () => {
    const generatedColors = new Map([['.ts', '#generated']]);

    const result = resolveColor('src/app.ts', empty(), empty(), empty(), empty(), generatedColors);

    expect(result).toBe('#generated');
  });

  it('returns the fallback color when nothing matches', () => {
    const result = resolveColor('src/app.ts', empty(), empty(), empty(), empty(), empty());

    expect(result).toBe(DEFAULT_FALLBACK_COLOR);
  });
});

describe('resolveColorInfo', () => {
  it('returns source "user" for user pattern matches', () => {
    const userPatternColors = new Map([['Makefile', '#ff0000']]);

    const result = resolveColorInfo('Makefile', empty(), userPatternColors, empty(), empty(), empty());

    expect(result.source).toBe('user');
    expect(result.color).toBe('#ff0000');
  });

  it('returns source "plugin" for plugin pattern matches', () => {
    const pluginPatternColors = new Map([['Makefile', '#plugin']]);

    const result = resolveColorInfo('Makefile', empty(), empty(), empty(), pluginPatternColors, empty());

    expect(result.source).toBe('plugin');
  });

  it('returns source "user" for user extension matches', () => {
    const userExtensionColors = new Map([['.ts', '#user']]);

    const result = resolveColorInfo('app.ts', userExtensionColors, empty(), empty(), empty(), empty());

    expect(result.source).toBe('user');
  });

  it('returns source "plugin" for plugin extension matches', () => {
    const pluginExtensionColors = new Map([['.ts', '#plugin']]);

    const result = resolveColorInfo('app.ts', empty(), empty(), pluginExtensionColors, empty(), empty());

    expect(result.source).toBe('plugin');
  });

  it('returns source "generated" for generated color matches', () => {
    const generatedColors = new Map([['.ts', '#gen']]);

    const result = resolveColorInfo('app.ts', empty(), empty(), empty(), empty(), generatedColors);

    expect(result.source).toBe('generated');
  });

  it('returns source "generated" and the fallback color when nothing matches', () => {
    const result = resolveColorInfo('app.ts', empty(), empty(), empty(), empty(), empty());

    expect(result.source).toBe('generated');
    expect(result.color).toBe(DEFAULT_FALLBACK_COLOR);
  });
});
