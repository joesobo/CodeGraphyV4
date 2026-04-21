import { describe, expect, it } from 'vitest';
import { matchMaterialFolderName } from '../../../../../../src/extension/graphView/groups/defaults/materialTheme/folderName';

describe('graphView/materialTheme/folderName', () => {
  it('matches basename folder rules across the tree', () => {
    expect(matchMaterialFolderName('packages/app/src', { src: 'folder-src' })).toEqual({
      iconName: 'folder-src',
      key: 'src',
      kind: 'folderName',
    });
  });

  it('matches nested folder path rules case-insensitively', () => {
    expect(matchMaterialFolderName('.github/ISSUE_TEMPLATE', {
      '.github/issue_template': 'folder-github',
    })).toEqual({
      iconName: 'folder-github',
      key: '.github/ISSUE_TEMPLATE',
      kind: 'folderName',
    });
  });

  it('returns undefined when no folder rule matches', () => {
    expect(matchMaterialFolderName('packages/app/lib', { src: 'folder-src' })).toBeUndefined();
  });

  it('prefers the longest matching folder rule', () => {
    expect(matchMaterialFolderName('packages/app/components', {
      components: 'generic-components',
      'app/components': 'scoped-components',
    })).toEqual({
      iconName: 'scoped-components',
      key: 'app/components',
      kind: 'folderName',
    });
  });

  it('falls back to expanded folder rules when needed', () => {
    expect(matchMaterialFolderName(
      'packages/app/src',
      {},
      { src: 'folder-src-open' },
    )).toEqual({
      iconName: 'folder-src-open',
      key: 'src',
      kind: 'folderName',
    });
  });
});
