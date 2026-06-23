import { describe, expect, it } from 'vitest';
import {
  createMaterialPathRuleMatcher,
  findLongestPathMatch,
  findLongestPathMatchWithMatcher,
} from '../../../../../../src/extension/graphView/groups/defaults/materialTheme/pathMatch';

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

  it('prefers scoped path rules over basename rules when using a precompiled matcher', () => {
    const matcher = createMaterialPathRuleMatcher({
      'vite.config.ts': 'generic-vite',
      'apps/web/vite.config.ts': 'web-vite',
    });

    expect(findLongestPathMatchWithMatcher('apps/web/vite.config.ts', matcher, 'fileName')).toEqual({
      iconName: 'web-vite',
      key: 'apps/web/vite.config.ts',
      kind: 'fileName',
    });
  });

  it('indexes scoped path rules by basename for candidate lookup', () => {
    const matcher = createMaterialPathRuleMatcher({
      'apps/web/vite.config.ts': 'web-vite',
      'packages/api/vite.config.ts': 'api-vite',
      'apps/web/package.json': 'package',
    });

    expect(
      matcher.pathRulesByLowerBaseName.get('vite.config.ts')?.map(rule => rule.normalizedRule),
    ).toEqual([
      'packages/api/vite.config.ts',
      'apps/web/vite.config.ts',
    ]);
    expect(
      matcher.pathRulesByLowerBaseName.get('package.json')?.map(rule => rule.normalizedRule),
    ).toEqual(['apps/web/package.json']);
  });

  it('returns undefined for non-matches', () => {
    expect(findLongestPathMatch('src/main.ts', { 'package.json': 'package' }, 'fileName')).toBeUndefined();
  });
});
