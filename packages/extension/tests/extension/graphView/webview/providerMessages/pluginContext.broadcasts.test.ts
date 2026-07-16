import { describe, expect, it, vi } from 'vitest';
import {
  createGraphViewProviderMessagePluginContext,
} from '../../../../../src/extension/graphView/webview/providerMessages/pluginContext';

describe('graph view provider listener plugin context broadcasts', () => {
  it('delegates provider broadcasts, ready state, and active-file messaging', async () => {
    const readyPromise = Promise.resolve('ready');
    const source = {
      _analyzer: {
        getPluginFilterPatterns: vi.fn(() => ['plugin/**']),
        registry: {
          notifyWebviewReady: vi.fn(),
          getPluginAPI: vi.fn(() => ({ id: 'plugin.api' })),
        },
      },
      _firstAnalysis: false,
      _webviewReadyNotified: true,
      _sendFavorites: vi.fn(),
      _sendSettings: vi.fn(),
      _sendDecorations: vi.fn(),
      _sendContextMenuItems: vi.fn(),
      _sendPluginExporters: vi.fn(),
      _sendPluginToolbarActions: vi.fn(),
      _sendGraphViewContributionStatuses: vi.fn(),
      _sendPluginWebviewInjections: vi.fn(),
      _sendDepthState: vi.fn(),
      _sendGraphControls: vi.fn(),
      _sendMessage: vi.fn(),
      _viewContext: {
        focusedFile: 'src/app.ts',
      },
      _firstWorkspaceReadyPromise: readyPromise,
      _eventBus: {
        emit: vi.fn(),
      },
      _userGroups: [],
      _filterPatterns: [],
      _loadGroupsAndFilterPatterns: vi.fn(),
      _loadDisabledRulesAndPlugins: vi.fn(() => true),
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

    expect(context.isWebviewReadyNotified()).toBe(true);
    context.loadGroupsAndFilterPatterns();
    expect(context.loadDisabledRulesAndPlugins()).toBe(true);
    context.sendDepthState();
    expect(context.sendGraphControls).toBeTypeOf('function');
    context.sendGraphControls?.();
    context.sendFavorites();
    context.sendSettings();
    context.sendDecorations();
    context.sendContextMenuItems();
    expect(context.sendPluginExporters).toBeTypeOf('function');
    context.sendPluginExporters?.();
    expect(context.sendPluginToolbarActions).toBeTypeOf('function');
    context.sendPluginToolbarActions?.();
    expect(context.sendGraphViewContributionStatuses).toBeTypeOf('function');
    context.sendGraphViewContributionStatuses?.();
    context.sendPluginWebviewInjections();
    context.sendActiveFile();
    await expect(context.waitForFirstWorkspaceReady()).resolves.toBe('ready');

    expect(source._loadGroupsAndFilterPatterns).toHaveBeenCalledOnce();
    expect(source._loadDisabledRulesAndPlugins).toHaveBeenCalledOnce();
    expect(source._sendDepthState).toHaveBeenCalledOnce();
    expect(source._sendGraphControls).toHaveBeenCalledOnce();
    expect(source._sendFavorites).toHaveBeenCalledOnce();
    expect(source._sendSettings).toHaveBeenCalledOnce();
    expect(source._sendDecorations).toHaveBeenCalledOnce();
    expect(source._sendContextMenuItems).toHaveBeenCalledOnce();
    expect(source._sendPluginExporters).toHaveBeenCalledOnce();
    expect(source._sendPluginToolbarActions).toHaveBeenCalledOnce();
    expect(source._sendGraphViewContributionStatuses).toHaveBeenCalledOnce();
    expect(source._sendPluginWebviewInjections).toHaveBeenCalledOnce();
    expect(source._sendMessage).toHaveBeenCalledWith({
      type: 'ACTIVE_FILE_UPDATED',
      payload: { filePath: 'src/app.ts' },
    });
  });

  it('tolerates optional provider broadcasts being absent', () => {
    const source = {
      _analyzer: undefined,
      _firstAnalysis: false,
      _webviewReadyNotified: false,
      _sendFavorites: vi.fn(),
      _sendSettings: vi.fn(),
      _sendDecorations: vi.fn(),
      _sendContextMenuItems: vi.fn(),
      _sendPluginExporters: undefined,
      _sendPluginToolbarActions: undefined,
      _sendGraphViewContributionStatuses: undefined,
      _sendPluginWebviewInjections: vi.fn(),
      _sendDepthState: vi.fn(),
      _sendGraphControls: undefined,
      _sendMessage: vi.fn(),
      _viewContext: {
        focusedFile: null,
      },
      _firstWorkspaceReadyPromise: Promise.resolve(),
      _eventBus: {
        emit: vi.fn(),
      },
      _userGroups: [],
      _filterPatterns: [],
      _loadGroupsAndFilterPatterns: vi.fn(),
      _loadDisabledRulesAndPlugins: vi.fn(() => false),
    };
    const context = createGraphViewProviderMessagePluginContext(
      source as never,
      {
        workspace: {
          workspaceFolders: [],
          getConfiguration: vi.fn(),
        },
        getConfigTarget: vi.fn(() => 'workspace'),
      } as never,
    );

    expect(() => {
      context.sendGraphControls?.();
      context.sendPluginExporters?.();
      context.sendPluginToolbarActions?.();
      context.sendGraphViewContributionStatuses?.();
      context.sendActiveFile();
    }).not.toThrow();

    expect(source._sendMessage).toHaveBeenCalledWith({
      type: 'ACTIVE_FILE_UPDATED',
      payload: { filePath: null },
    });
  });

});
