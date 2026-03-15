import { describe, expect, it, vi } from 'vitest';
import {
  createGraphViewProviderMessagePluginContext,
} from '../../../../src/extension/graphView/messages/providerListenerPluginContext';

describe('graph view provider listener plugin context', () => {
  it('returns safe defaults when analyzer and workspace state are unavailable', async () => {
    const getConfiguration = vi.fn(() => ({ update: vi.fn(() => Promise.resolve()) }));
    const context = createGraphViewProviderMessagePluginContext(
      {
        _analyzer: undefined,
        _firstAnalysis: false,
        _webviewReadyNotified: false,
        _hiddenPluginGroupIds: new Set<string>(),
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
      } as never,
      {
        workspace: {
          workspaceFolders: undefined,
          getConfiguration,
        },
        getConfigTarget: vi.fn(() => 'workspace'),
      } as never,
    );

    expect(context.getPluginFilterPatterns()).toEqual([]);
    expect(context.hasWorkspace()).toBe(false);
    expect(context.getInteractionPluginApi('plugin.api')).toBeUndefined();
    expect(context.getContextMenuPluginApi('plugin.api')).toBeUndefined();
    context.notifyWebviewReady();
    await context.updateHiddenPluginGroups([]);

    expect(getConfiguration).toHaveBeenCalledWith('codegraphy');
  });

  it('reads plugin state, mutates provider state, and persists hidden plugin groups', async () => {
    const update = vi.fn(() => Promise.resolve());
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
      _hiddenPluginGroupIds: new Set(['plugin.hidden']),
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
    };
    const dependencies = {
      workspace: {
        workspaceFolders: [{ uri: { fsPath: '/workspace' } }],
        getConfiguration: vi.fn(() => ({ update })),
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
    expect(context.getHiddenPluginGroupIds()).toBe(source._hiddenPluginGroupIds);
    context.emitEvent('graph:event', { id: 1 });
    await context.updateHiddenPluginGroups(['plugin.hidden', 'plugin.extra']);
    context.setUserGroups([{ id: 'user:src', pattern: 'src/**', color: '#112233' }] as never);
    context.setFilterPatterns(['src/**']);
    context.setWebviewReadyNotified(true);

    expect(source._eventBus.emit).toHaveBeenCalledWith('graph:event', { id: 1 });
    expect(update).toHaveBeenCalledWith(
      'hiddenPluginGroups',
      ['plugin.hidden', 'plugin.extra'],
      'workspace',
    );
    expect(source._userGroups).toEqual([
      { id: 'user:src', pattern: 'src/**', color: '#112233' },
    ]);
    expect(source._filterPatterns).toEqual(['src/**']);
    expect(source._webviewReadyNotified).toBe(true);
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
      _hiddenPluginGroupIds: new Set<string>(),
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
    };
    const context = createGraphViewProviderMessagePluginContext(
      source as never,
      {
        workspace: {
          workspaceFolders: [{ uri: { fsPath: '/workspace' } }],
          getConfiguration: vi.fn(() => ({ update: vi.fn(() => Promise.resolve()) })),
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
