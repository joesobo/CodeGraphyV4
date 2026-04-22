import { describe, expect, it } from 'vitest';
import { findLongestPathMatch } from '../../../../../../src/extension/graphView/groups/defaults/materialTheme/pathMatch';

describe('graphView/materialTheme/pathMatch', () => {
  it('matches basename rules case-insensitively', () => {
    expect(findLongestPathMatch('README.md', { 'readme.md': 'readme' }, 'fileName')).toEqual({
      iconName: 'readme',
      key: 'README.md',
      kind: 'fileName',
    });
  });

  it('matches scoped path rules against suffixes', () => {
    expect(findLongestPathMatch('apps/web/vite.config.ts', {
      'web/vite.config.ts': 'vite',
    }, 'fileName')).toEqual({
      iconName: 'vite',
      key: 'web/vite.config.ts',
      kind: 'fileName',
    });
  });

  it('returns undefined for non-matches', () => {
    expect(findLongestPathMatch('src/main.ts', { 'package.json': 'package' }, 'fileName')).toBeUndefined();
  });
});
