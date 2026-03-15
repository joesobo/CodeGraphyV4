import { describe, expect, it, vi } from 'vitest';
import {
  createGraphViewProviderMessagePluginContext,
} from '../../../../src/extension/graphView/messages/providerListenerPluginContext';

describe('graph view provider listener plugin context', () => {
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
});
