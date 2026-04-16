import { describe, expect, it, vi } from 'vitest';
import {
  createGraphViewProviderMessagePluginContext,
} from '../../../../../src/extension/graphView/webview/providerMessages/pluginContext';

describe('graph view provider listener plugin context', () => {
  it('returns safe defaults when analyzer and workspace state are unavailable', async () => {
    const context = createGraphViewProviderMessagePluginContext(
      {
        _analyzer: undefined,
        _firstAnalysis: false,
        _webviewReadyNotified: false,
        _sendFavorites: vi.fn(),
        _sendSettings: vi.fn(),
        _sendCachedTimeline: vi.fn(),
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
      } as never,
      {
        workspace: {
          workspaceFolders: undefined,
          getConfiguration: vi.fn(),
        },
        getConfigTarget: vi.fn(() => 'workspace'),
      } as never,
    );

    expect(context.getPluginFilterPatterns()).toEqual([]);
    expect(context.hasWorkspace()).toBe(false);
    expect(context.getInteractionPluginApi('plugin.api')).toBeUndefined();
    expect(context.getContextMenuPluginApi('plugin.api')).toBeUndefined();
    context.notifyWebviewReady();
  });

  it('reads plugin state and mutates provider state', () => {
    const source = {
      _analyzer: {
        getPluginFilterPatterns: vi.fn(() => ['plugin/**']),
        registry: {
          notifyWebviewReady: vi.fn(),
          getPluginAPI: vi.fn(() => ({ id: 'plugin.api' })),
        },
      },
      _firstAnalysis: true,
      _webviewReadyNotified: false,
      _sendFavorites: vi.fn(),
      _sendSettings: vi.fn(),
      _sendCachedTimeline: vi.fn(),
      _sendDecorations: vi.fn(),
      _sendContextMenuItems: vi.fn(),
      _sendPluginWebviewInjections: vi.fn(),
      _firstWorkspaceReadyPromise: Promise.resolve(),
      _eventBus: {
        emit: vi.fn(),
      },
      _userGroups: [],
      _filterPatterns: ['dist/**'],
      _loadGroupsAndFilterPatterns: vi.fn(),
      _loadDisabledRulesAndPlugins: vi.fn(() => false),
      _sendDepthState: vi.fn(),
    };
    const dependencies = {
      workspace: {
        workspaceFolders: [{ uri: { fsPath: '/workspace' } }],
        getConfiguration: vi.fn(),
      },
      getConfigTarget: vi.fn(() => 'workspace'),
    };

    const context = createGraphViewProviderMessagePluginContext(
      source as never,
      dependencies as never,
    );

    expect(context.getPluginFilterPatterns()).toEqual(['plugin/**']);
    expect(context.hasWorkspace()).toBe(true);
    expect(context.isFirstAnalysis()).toBe(true);
    context.emitEvent('graph:event', { id: 1 });
    context.setUserGroups([{ id: 'user:src', pattern: 'src/**', color: '#112233' }] as never);
    context.setFilterPatterns(['src/**']);
    context.setWebviewReadyNotified(true);

    expect(source._eventBus.emit).toHaveBeenCalledWith('graph:event', { id: 1 });
    expect(source._userGroups).toEqual([
      { id: 'user:src', pattern: 'src/**', color: '#112233' },
    ]);
    expect(source._filterPatterns).toEqual(['src/**']);
    expect(source._webviewReadyNotified).toBe(true);
  });

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
      _sendCachedTimeline: vi.fn(),
      _sendDecorations: vi.fn(),
      _sendContextMenuItems: vi.fn(),
      _sendPluginExporters: vi.fn(),
      _sendPluginToolbarActions: vi.fn(),
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
    context.sendCachedTimeline();
    context.sendDecorations();
    context.sendContextMenuItems();
    expect(context.sendPluginExporters).toBeTypeOf('function');
    context.sendPluginExporters?.();
    expect(context.sendPluginToolbarActions).toBeTypeOf('function');
    context.sendPluginToolbarActions?.();
    context.sendPluginWebviewInjections();
    context.sendActiveFile();
    await expect(context.waitForFirstWorkspaceReady()).resolves.toBe('ready');

    expect(source._loadGroupsAndFilterPatterns).toHaveBeenCalledOnce();
    expect(source._loadDisabledRulesAndPlugins).toHaveBeenCalledOnce();
    expect(source._sendDepthState).toHaveBeenCalledOnce();
    expect(source._sendGraphControls).toHaveBeenCalledOnce();
    expect(source._sendFavorites).toHaveBeenCalledOnce();
    expect(source._sendSettings).toHaveBeenCalledOnce();
    expect(source._sendCachedTimeline).toHaveBeenCalledOnce();
    expect(source._sendDecorations).toHaveBeenCalledOnce();
    expect(source._sendContextMenuItems).toHaveBeenCalledOnce();
    expect(source._sendPluginExporters).toHaveBeenCalledOnce();
    expect(source._sendPluginToolbarActions).toHaveBeenCalledOnce();
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
      _sendCachedTimeline: vi.fn(),
      _sendDecorations: vi.fn(),
      _sendContextMenuItems: vi.fn(),
      _sendPluginExporters: undefined,
      _sendPluginToolbarActions: undefined,
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
      context.sendActiveFile();
    }).not.toThrow();

    expect(source._sendMessage).toHaveBeenCalledWith({
      type: 'ACTIVE_FILE_UPDATED',
      payload: { filePath: null },
    });
  });

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
      _sendCachedTimeline: vi.fn(),
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
