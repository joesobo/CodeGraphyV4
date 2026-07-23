import { describe, expect, it, vi } from 'vitest';

import { createGraphViewProviderMessagePluginContext } from '../../../../../src/extension/graphView/webview/providerMessages/pluginContext';

describe('graph view provider Extension plugin context', () => {
  it('notifies the composed registry when the webview is ready', () => {
    const notifyWebviewReady = vi.fn();
    const context = createGraphViewProviderMessagePluginContext(
      {
        _analyzer: {
          getPluginFilterPatterns: () => [],
          registry: { notifyWebviewReady },
        },
        _firstAnalysis: false,
        _webviewReadyNotified: false,
        _sendFavorites: vi.fn(),
        _sendSettings: vi.fn(),
        _sendDecorations: vi.fn(),
        _sendPluginWebviewInjections: vi.fn(),
        _firstWorkspaceReadyPromise: Promise.resolve(),
        _userGroups: [],
        _filterPatterns: [],
        _loadGroupsAndFilterPatterns: vi.fn(),
        _loadDisabledRulesAndPlugins: vi.fn(() => false),
        _sendDepthState: vi.fn(),
      } as never,
      {
        workspace: {
          workspaceFolders: undefined,
          getConfiguration: vi.fn(),
        },
      } as never,
    );

    context.notifyWebviewReady();

    expect(notifyWebviewReady).toHaveBeenCalledOnce();
  });

  it('uses safe defaults without an analyzer or workspace', () => {
    const context = createGraphViewProviderMessagePluginContext(
      {
        _analyzer: undefined,
        _firstAnalysis: false,
        _webviewReadyNotified: false,
        _sendFavorites: vi.fn(),
        _sendSettings: vi.fn(),
        _sendDecorations: vi.fn(),
        _sendPluginWebviewInjections: vi.fn(),
        _firstWorkspaceReadyPromise: Promise.resolve(),
        _userGroups: [],
        _filterPatterns: [],
        _loadGroupsAndFilterPatterns: vi.fn(),
        _loadDisabledRulesAndPlugins: vi.fn(() => false),
        _sendDepthState: vi.fn(),
      } as never,
      {
        workspace: {
          workspaceFolders: undefined,
          getConfiguration: vi.fn(),
        },
      } as never,
    );

    expect(context.getPluginFilterPatterns()).toEqual([]);
    expect(context.hasWorkspace()).toBe(false);
    expect(() => context.notifyWebviewReady()).not.toThrow();
  });
});
