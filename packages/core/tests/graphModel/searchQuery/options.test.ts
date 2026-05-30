import { describe, expect, it } from 'vitest';
import {
  compileSearchPattern,
  normalizeSearchOptions,
} from '../../../src/graphModel/searchQuery/options';

describe('graphModel/searchQuery options', () => {
  it('normalizes omitted search options to the default fuzzy mode', () => {
    expect(normalizeSearchOptions(undefined)).toEqual({
      matchCase: false,
      wholeWord: false,
      regex: false,
    });
    expect(compileSearchPattern('User', normalizeSearchOptions(undefined))).toEqual({
      pattern: null,
      regexError: null,
    });
  });

  it('compiles case-sensitive and case-insensitive regex patterns', () => {
    expect(compileSearchPattern('User.*Repo', {
      matchCase: true,
      wholeWord: false,
      regex: true,
    }).pattern?.flags).toBe('');
    expect(compileSearchPattern('User.*Repo', {
      matchCase: false,
      wholeWord: false,
      regex: true,
    }).pattern?.flags).toBe('i');
  });

  it('reports invalid regex syntax and escapes whole-word literals', () => {
    const invalid = compileSearchPattern('[', {
      matchCase: false,
      wholeWord: false,
      regex: true,
    });
    expect(invalid.pattern).toBeNull();
    expect(invalid.regexError).toContain('Invalid regular expression');

    const wholeWord = compileSearchPattern('User.repo', {
      matchCase: false,
      wholeWord: true,
      regex: false,
    });
    expect(wholeWord.regexError).toBeNull();
    expect(wholeWord.pattern?.test('User.repo')).toBe(true);
    expect(wholeWord.pattern?.test('UserXrepo')).toBe(false);
  });
});
