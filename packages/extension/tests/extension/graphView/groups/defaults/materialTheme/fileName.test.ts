import { describe, expect, it } from 'vitest';
import { matchMaterialFileName } from '../../../../../../src/extension/graphView/groups/defaults/materialTheme/fileName';

describe('graphView/materialTheme/fileName', () => {
  it('matches basename and nested suffix rules', () => {
    expect(matchMaterialFileName('src/package.json', { 'package.json': 'package' })).toEqual({
      iconName: 'package',
      key: 'package.json',
      kind: 'fileName',
    });

    expect(matchMaterialFileName('apps/web/vite.config.ts', { 'web/vite.config.ts': 'vite' })).toEqual({
      iconName: 'vite',
      key: 'web/vite.config.ts',
      kind: 'fileName',
    });
  });

  it('prefers the longest matching file name rule', () => {
    expect(matchMaterialFileName('apps/web/vite.config.ts', {
      'vite.config.ts': 'generic-vite',
      'web/vite.config.ts': 'scoped-vite',
    })).toEqual({
      iconName: 'scoped-vite',
      key: 'web/vite.config.ts',
      kind: 'fileName',
    });
  });

  it('keeps the longest file name match even when the shorter rule is declared later', () => {
    expect(matchMaterialFileName('apps/web/vite.config.ts', {
      'web/vite.config.ts': 'scoped-vite',
      'vite.config.ts': 'generic-vite',
    })).toEqual({
      iconName: 'scoped-vite',
      key: 'web/vite.config.ts',
      kind: 'fileName',
    });
  });

  it('normalizes windows separators and returns undefined when nothing matches', () => {
    expect(matchMaterialFileName('apps\\web\\vite.config.ts', { 'web/vite.config.ts': 'vite' })).toEqual({
      iconName: 'vite',
      key: 'web/vite.config.ts',
      kind: 'fileName',
    });
    expect(matchMaterialFileName('src/main.ts', { 'package.json': 'package' })).toBeUndefined();
  });

  it('matches Material file-name rules case-insensitively for basename and nested paths', () => {
    expect(matchMaterialFileName('README.md', { 'readme.md': 'readme' })).toEqual({
      iconName: 'readme',
      key: 'README.md',
      kind: 'fileName',
    });

    expect(matchMaterialFileName('apps/web/Dockerfile', { 'web/dockerfile': 'docker' })).toEqual({
      iconName: 'docker',
      key: 'web/Dockerfile',
      kind: 'fileName',
    });
  });
});
