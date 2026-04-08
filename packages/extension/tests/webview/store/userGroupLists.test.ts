import { describe, expect, it } from 'vitest';
import {
  areGroupListsEqual,
  replaceUserGroups,
} from '../../../src/webview/store/userGroupLists';

describe('webview/store/userGroupLists', () => {
  it('compares group lists by shape and values', () => {
    expect(
      areGroupListsEqual(
        [{ id: 'user:src', pattern: 'src/**', color: '#112233' }],
        [{ id: 'user:src', pattern: 'src/**', color: '#112233' }],
      ),
    ).toBe(true);

    expect(
      areGroupListsEqual(
        [{ id: 'user:src', pattern: 'src/**', color: '#112233' }],
        [{ id: 'user:src', pattern: 'src/**', color: '#445566' }],
      ),
    ).toBe(false);
  });

  it('replaces user groups while preserving plugin defaults from the incoming list', () => {
    expect(
      replaceUserGroups(
        [
          { id: 'plugin:default', pattern: 'vendor/**', color: '#ff0000', isPluginDefault: true },
          { id: 'user:stale', pattern: 'dist/**', color: '#00ff00' },
        ],
        [{ id: 'user:src', pattern: 'src/**', color: '#112233' }],
      ),
    ).toEqual([
      { id: 'user:src', pattern: 'src/**', color: '#112233' },
      { id: 'plugin:default', pattern: 'vendor/**', color: '#ff0000', isPluginDefault: true },
    ]);
  });
});
