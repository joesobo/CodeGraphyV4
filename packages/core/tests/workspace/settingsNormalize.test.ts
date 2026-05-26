import { describe, expect, it } from 'vitest';
import { createDefaultCodeGraphyWorkspaceSettings } from '../../src/workspace/settingsDefaults';
import { normalizeCodeGraphyWorkspaceSettings } from '../../src/workspace/settingsNormalize';

describe('workspace/settingsNormalize', () => {
  it('returns defaults for non-object settings values', () => {
    const defaults = createDefaultCodeGraphyWorkspaceSettings();

    expect(normalizeCodeGraphyWorkspaceSettings(null)).toEqual(defaults);
    expect(normalizeCodeGraphyWorkspaceSettings([])).toEqual(defaults);
  });

  it('falls back to defaults for invalid scalar settings', () => {
    const defaults = createDefaultCodeGraphyWorkspaceSettings();

    expect(normalizeCodeGraphyWorkspaceSettings({
      maxFiles: Number.NaN,
      include: [42],
      respectGitignore: 'yes',
      showOrphans: 'no',
    })).toEqual(defaults);
  });

  it('normalizes supported scalar, array, and plugin settings', () => {
    expect(normalizeCodeGraphyWorkspaceSettings({
      version: 99,
      maxFiles: 25,
      include: ['src/**/*.ts', 42, 'packages/**/*.ts'],
      respectGitignore: false,
      showOrphans: false,
      filterPatterns: ['dist/**', 'dist/**', 7],
      disabledCustomFilterPatterns: ['generated/**', 'generated/**'],
      plugins: [
        {
          package: '  @codegraphy-dev/plugin-python  ',
          disabledFilterPatterns: ['**/__pycache__/**', '**/__pycache__/**', false],
          options: { includeTests: true },
        },
        { package: '' },
        'plugin-string',
      ],
    })).toEqual({
      version: 1,
      maxFiles: 25,
      include: ['src/**/*.ts', 'packages/**/*.ts'],
      respectGitignore: false,
      showOrphans: false,
      filterPatterns: ['dist/**'],
      disabledCustomFilterPatterns: ['generated/**'],
      plugins: [{
        package: '@codegraphy-dev/plugin-python',
        disabledFilterPatterns: ['**/__pycache__/**'],
        options: { includeTests: true },
      }],
    });
  });
});
