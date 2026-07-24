import { describe, expect, it } from 'vitest';
import { validateWorkspaceSettingsRecord } from '../../src/workspace/settingsValidation';

describe('workspace/settingsValidation', () => {
  it('accepts supported settings while preserving unknown fields', () => {
    expect(validateWorkspaceSettingsRecord({
      maxFiles: 2500,
      include: ['src/**'],
      respectGitignore: true,
      futureSetting: { mode: 'fast' },
    })).toEqual({
      maxFiles: 2500,
      include: ['src/**'],
      respectGitignore: true,
      futureSetting: { mode: 'fast' },
    });
  });

  it('rejects malformed known settings', () => {
    expect(() => validateWorkspaceSettingsRecord({ maxFiles: 0 })).toThrow(
      'maxFiles must be a positive integer',
    );
    expect(() => validateWorkspaceSettingsRecord({ filterPatterns: 'generated' })).toThrow(
      'filterPatterns must be an array of strings',
    );
    expect(() => validateWorkspaceSettingsRecord({ plugins: [{ id: 'plugin.without.activation' }] })).toThrow(
      'plugin entry must have a nonblank id with activation, or a nonblank package',
    );
  });
});
