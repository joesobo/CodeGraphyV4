import { describe, expect, it } from 'vitest';
import { matchMaterialLanguageFallback } from '../../../../../../src/extension/graphView/groups/defaults/materialTheme/languageFallback';

describe('graphView/materialTheme/languageFallback', () => {
  it('uses language fallback rules when the manifest defines the language id', () => {
    expect(matchMaterialLanguageFallback('main.tsx', { typescriptreact: 'react' })).toEqual({
      iconName: 'react',
      key: 'tsx',
      kind: 'fileExtension',
    });

    expect(matchMaterialLanguageFallback('go', { go: 'go' })).toEqual({
      iconName: 'go',
      key: 'go',
      kind: 'fileExtension',
    });
  });

  it('prefers the longest fallback extension match', () => {
    expect(matchMaterialLanguageFallback('README.markdown', { markdown: 'markdown' })).toEqual({
      iconName: 'markdown',
      key: 'markdown',
      kind: 'fileExtension',
    });
  });

  it('ignores missing language ids and returns undefined for unmatched files', () => {
    expect(matchMaterialLanguageFallback('main.ts', { javascript: 'javascript' })).toBeUndefined();
    expect(matchMaterialLanguageFallback('README', { markdown: 'markdown' })).toBeUndefined();
  });

  it('matches fallback extensions case-insensitively while keeping the actual suffix casing in the key', () => {
    expect(matchMaterialLanguageFallback('README.MARKDOWN', { markdown: 'markdown' })).toEqual({
      iconName: 'markdown',
      key: 'MARKDOWN',
      kind: 'fileExtension',
    });

    expect(matchMaterialLanguageFallback('MARKDOWN', { markdown: 'markdown' })).toEqual({
      iconName: 'markdown',
      key: 'MARKDOWN',
      kind: 'fileExtension',
    });
  });
});
