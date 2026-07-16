import { describe, expect, it, vi } from 'vitest';
import {
  createGraphViewProviderMessagePluginContext,
} from '../../../../../src/extension/graphView/webview/providerMessages/pluginContext';

describe('graph view provider listener plugin context APIs', () => {
  it('notifies the analyzer, exposes plugin APIs, and logs plugin context failures', () => {
    const notifyWebviewReady = vi.fn();
    const getPluginAPI = vi.fn((pluginId: string) => ({ pluginId }));
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const source = {
      _analyzer: {
        getPluginFilterPatterns: vi.fn(() => ['plugin/**']),
        registry: {
          notifyWebviewReady,
          getPluginAPI,
        },
      },
      _firstAnalysis: false,
      _webviewReadyNotified: false,
      _sendFavorites: vi.fn(),
      _sendSettings: vi.fn(),
      _sendDecorations: vi.fn(),
      _sendContextMenuItems: vi.fn(),
      _sendPluginWebviewInjections: vi.fn(),
      _firstWorkspaceReadyPromise: Promise.resolve(),
      _eventBus: { emit: vi.fn() },
      _userGroups: [],
      _filterPatterns: [],
      _loadGroupsAndFilterPatterns: vi.fn(),
      _loadDisabledRulesAndPlugins: vi.fn(() => false),
      _sendDepthState: vi.fn(),
    };
    const context = createGraphViewProviderMessagePluginContext(
      source as never,
      {
        workspace: {
          workspaceFolders: [{ uri: { fsPath: '/workspace' } }],
          getConfiguration: vi.fn(),
        },
        getConfigTarget: vi.fn(() => 'workspace'),
      } as never,
    );

    context.notifyWebviewReady();

    expect(context.getInteractionPluginApi('plugin.interaction')).toEqual({
      pluginId: 'plugin.interaction',
    });
    expect(context.getContextMenuPluginApi('plugin.context')).toEqual({
      pluginId: 'plugin.context',
    });
    context.logError('plugin failure', 'boom');

    expect(notifyWebviewReady).toHaveBeenCalledOnce();
    expect(getPluginAPI).toHaveBeenCalledWith('plugin.interaction');
    expect(getPluginAPI).toHaveBeenCalledWith('plugin.context');
    expect(consoleError).toHaveBeenCalledWith('plugin failure', 'boom');

    consoleError.mockRestore();
  });
});
