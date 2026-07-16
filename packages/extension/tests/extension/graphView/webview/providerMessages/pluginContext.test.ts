import { describe, expect, it, vi } from 'vitest';
import {
  createGraphViewProviderMessagePluginContext,
} from '../../../../../src/extension/graphView/webview/providerMessages/pluginContext';

describe('graph view provider listener plugin context state', () => {
  it('returns safe defaults when analyzer and workspace state are unavailable', async () => {
    const context = createGraphViewProviderMessagePluginContext(
      {
        _analyzer: undefined,
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

  it('does not expose disabled plugin APIs to webview actions', () => {
    const source = {
      _analyzer: {
        getPluginFilterPatterns: vi.fn(() => []),
        registry: {
          notifyWebviewReady: vi.fn(),
          getPluginAPI: vi.fn((pluginId: string) => ({ id: pluginId })),
        },
      },
      _disabledPlugins: new Set(['plugin.disabled']),
      _firstAnalysis: false,
      _webviewReadyNotified: false,
      _sendFavorites: vi.fn(),
      _sendSettings: vi.fn(),
      _sendDecorations: vi.fn(),
      _sendContextMenuItems: vi.fn(),
      _sendPluginWebviewInjections: vi.fn(),
      _firstWorkspaceReadyPromise: Promise.resolve(),
      _eventBus: {
        emit: vi.fn(),
      },
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

    expect(context.getInteractionPluginApi('plugin.disabled')).toBeUndefined();
    expect(context.getContextMenuPluginApi('plugin.disabled')).toBeUndefined();
    expect(context.getExporterPluginApi?.('plugin.disabled')).toBeUndefined();
    expect(context.getToolbarActionPluginApi?.('plugin.disabled')).toBeUndefined();
    expect(context.getInteractionPluginApi('plugin.enabled')).toEqual({ id: 'plugin.enabled' });
  });

});
