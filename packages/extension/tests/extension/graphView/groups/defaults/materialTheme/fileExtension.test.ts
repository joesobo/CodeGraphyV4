import { describe, expect, it } from 'vitest';
import { matchMaterialFileExtension } from '../../../../../../src/extension/graphView/groups/defaults/materialTheme/fileExtension';

describe('graphView/materialTheme/fileExtension', () => {
  it('matches dotted suffixes and exact extension names', () => {
    expect(matchMaterialFileExtension('main.ts', { ts: 'typescript' })).toEqual({
      iconName: 'typescript',
      key: 'ts',
      kind: 'fileExtension',
    });

    expect(matchMaterialFileExtension('tsx', { tsx: 'react' })).toEqual({
      iconName: 'react',
      key: 'tsx',
      kind: 'fileExtension',
    });
  });

  it('prefers the longest matching extension rule', () => {
    expect(matchMaterialFileExtension('archive.d.ts', {
      ts: 'typescript',
      'd.ts': 'declaration',
    })).toEqual({
      iconName: 'declaration',
      key: 'd.ts',
      kind: 'fileExtension',
    });
  });

  it('keeps the longest extension match even when the shorter rule is declared later', () => {
    expect(matchMaterialFileExtension('archive.d.ts', {
      'd.ts': 'declaration',
      ts: 'typescript',
    })).toEqual({
      iconName: 'declaration',
      key: 'd.ts',
      kind: 'fileExtension',
    });
  });

  it('returns undefined when no extension rule matches', () => {
    expect(matchMaterialFileExtension('README', { ts: 'typescript' })).toBeUndefined();
  });

  it('matches extensions case-insensitively while keeping the actual extension casing in the key', () => {
    expect(matchMaterialFileExtension('MAIN.TS', { ts: 'typescript' })).toEqual({
      iconName: 'typescript',
      key: 'TS',
      kind: 'fileExtension',
    });

    expect(matchMaterialFileExtension('TS', { ts: 'typescript' })).toEqual({
      iconName: 'typescript',
      key: 'TS',
      kind: 'fileExtension',
    });
  });
});
