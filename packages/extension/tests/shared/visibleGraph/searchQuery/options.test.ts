import { describe, expect, it } from 'vitest';
import { compileSearchPattern, normalizeSearchOptions } from '../../../../src/shared/visibleGraph/searchQuery/options';

describe('shared/visibleGraph/searchQuery/options', () => {
  it('normalizes omitted options to literal case-insensitive substring search', () => {
    expect(normalizeSearchOptions(undefined)).toEqual({
      matchCase: false,
      wholeWord: false,
      regex: false,
    });
  });

  it('does not compile a regex for literal substring search', () => {
    const result = compileSearchPattern('Foo.*ts', normalizeSearchOptions({}));

    expect(result).toEqual({ pattern: null, regexError: null });
  });

  it('compiles regex search as case-insensitive by default', () => {
    const result = compileSearchPattern('^foo panel', normalizeSearchOptions({ regex: true }));

    expect(result.regexError).toBeNull();
    expect(result.pattern?.test('Foo Panel src/FooPanel.tsx')).toBe(true);
  });

  it('respects match case for regex search', () => {
    const result = compileSearchPattern('^foo panel', normalizeSearchOptions({
      regex: true,
      matchCase: true,
    }));

    expect(result.regexError).toBeNull();
    expect(result.pattern?.test('Foo Panel src/FooPanel.tsx')).toBe(false);
  });

  it('escapes regex syntax for whole-word literal search', () => {
    const result = compileSearchPattern('foo.ts', normalizeSearchOptions({ wholeWord: true }));

    expect(result.regexError).toBeNull();
    expect(result.pattern?.test('src/foo.ts')).toBe(true);
    expect(result.pattern?.test('src/fooxts')).toBe(false);
  });

  it('returns parser errors for invalid regex search', () => {
    const result = compileSearchPattern('[', normalizeSearchOptions({ regex: true }));

    expect(result.pattern).toBeNull();
    expect(result.regexError).toMatch(/Invalid regular expression/);
  });
});
