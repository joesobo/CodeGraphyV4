import { describe, expect, it } from 'vitest';
import { isExtension } from '../../../../src/core/colors/extension/predicate';

describe('isExtension', () => {
  it('returns true for simple extensions', () => {
    expect(isExtension('.ts')).toBe(true);
    expect(isExtension('.js')).toBe(true);
    expect(isExtension('.py')).toBe(true);
    expect(isExtension('.json')).toBe(true);
  });

  it('returns true for 4-character and shorter extensions', () => {
    expect(isExtension('.java')).toBe(true);
    expect(isExtension('.c')).toBe(true);
    expect(isExtension('.md')).toBe(true);
    expect(isExtension('.go')).toBe(true);
    expect(isExtension('.tsx')).toBe(true);
    expect(isExtension('.jsx')).toBe(true);
  });

  it('returns false for extensions longer than 4 characters after the dot', () => {
    expect(isExtension('.scala')).toBe(false);
    expect(isExtension('.jsonl')).toBe(false);
  });

  it('returns false for paths and globs', () => {
    expect(isExtension('*.ts')).toBe(false);
    expect(isExtension('**/*.ts')).toBe(false);
    expect(isExtension('src/file.ts')).toBe(false);
    expect(isExtension('src\\file.ts')).toBe(false);
  });

  it('returns false for non-extension inputs', () => {
    expect(isExtension('ts')).toBe(false);
    expect(isExtension('.')).toBe(false);
    expect(isExtension('.test.ts')).toBe(false);
    expect(isExtension('.d.ts')).toBe(false);
    expect(isExtension('')).toBe(false);
    expect(isExtension('Makefile')).toBe(false);
  });
});
