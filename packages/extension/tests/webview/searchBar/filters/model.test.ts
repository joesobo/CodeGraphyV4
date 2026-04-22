import { describe, expect, it } from 'vitest';
import {
  addFilterPatterns,
  editFilterPattern,
  filterPatternsEqual,
  getDisabledFilterPatterns,
  getEnabledFilterCount,
  getEnabledFilterPatterns,
  toFilterGlob,
} from '../../../../src/webview/components/searchBar/filters/model';

describe('searchBar/filters/model', () => {
  it('prefills node filter paths as repo globs', () => {
    expect(toFilterGlob('src/app.ts')).toBe('**/src/app.ts');
  });

  it('keeps existing glob prefixes when prefilled', () => {
    expect(toFilterGlob('**/src/app.ts')).toBe('**/src/app.ts');
  });

  it('deduplicates custom patterns when adding pending globs', () => {
    expect(addFilterPatterns(['**/src/app.ts'], [' **/src/app.ts ', '**/src/main.ts'])).toEqual([
      '**/src/app.ts',
      '**/src/main.ts',
    ]);
  });

  it('returns only individually enabled filter patterns', () => {
    expect(getEnabledFilterPatterns({
      disabledCustomPatterns: ['custom/**'],
      disabledPluginPatterns: ['plugin-disabled/**'],
      customPatterns: ['custom/**'],
      pluginPatterns: ['plugin/**', 'plugin-disabled/**'],
    })).toEqual(['plugin/**']);
  });

  it('updates disabled pattern lists from row toggle state', () => {
    expect(getDisabledFilterPatterns(['old/**'], 'new/**', false)).toEqual(['old/**', 'new/**']);
    expect(getDisabledFilterPatterns(['old/**', 'new/**'], 'new/**', true)).toEqual(['old/**']);
  });

  it('keeps the original patterns when editing to an empty or unchanged value', () => {
    expect(editFilterPattern(['src/**'], 'src/**', ' src/** ')).toEqual(['src/**']);
    expect(editFilterPattern(['src/**'], 'src/**', '   ')).toEqual(['src/**']);
  });

  it('replaces the edited pattern when the next value is new', () => {
    expect(editFilterPattern(['src/**', 'test/**'], 'src/**', ' app/** ')).toEqual([
      'app/**',
      'test/**',
    ]);
  });

  it('compares filter pattern lists by length and order', () => {
    expect(filterPatternsEqual(['a'], ['a'])).toBe(true);
    expect(filterPatternsEqual(['a'], ['a', 'b'])).toBe(false);
    expect(filterPatternsEqual(['a', 'b'], ['b', 'a'])).toBe(false);
  });

  it('counts only enabled patterns', () => {
    expect(getEnabledFilterCount({
      disabledCustomPatterns: ['custom/**'],
      disabledPluginPatterns: ['plugin-disabled/**'],
      customPatterns: ['custom/**', 'custom-enabled/**'],
      pluginPatterns: ['plugin/**', 'plugin-disabled/**'],
    })).toBe(2);
  });
});
