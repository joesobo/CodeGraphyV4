import { describe, expect, it } from 'vitest';
import { getExtension } from '../../../../src/core/colors/extension/extract';

describe('getExtension', () => {
  it('returns the extension for a normal file path', () => {
    expect(getExtension('src/app.ts')).toBe('.ts');
  });

  it('returns empty string for dotfiles like .gitignore', () => {
    expect(getExtension('.gitignore')).toBe('');
  });

  it('returns the last extension for multi-part extensions', () => {
    expect(getExtension('app.test.ts')).toBe('.ts');
  });
});
