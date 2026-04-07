import { describe, expect, it } from 'vitest';
import {
  setPluginFilterPatterns,
  setPluginUserGroups,
  setPluginWebviewReadyNotified,
} from '../../../../../src/extension/graphView/webview/providerMessages/pluginState';

describe('graphView/webview/providerMessages/pluginState', () => {
  it('updates the mutable provider state slices', () => {
    const source = {
      _userGroups: [],
      _filterPatterns: [],
      _webviewReadyNotified: false,
    };

    setPluginUserGroups(source as never, [{ id: 'user:src', pattern: 'src/**', color: '#112233' }] as never);
    setPluginFilterPatterns(source as never, ['dist/**']);
    setPluginWebviewReadyNotified(source as never, true);

    expect(source).toEqual({
      _userGroups: [{ id: 'user:src', pattern: 'src/**', color: '#112233' }],
      _filterPatterns: ['dist/**'],
      _webviewReadyNotified: true,
    });
  });
});
