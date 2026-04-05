import { describe, expect, it, vi } from 'vitest';
import type { NodeSizeMode } from '@/shared/settings/modes';
import type { IGraphData } from '@/shared/graph/types';
import {
  dispatchGraphViewPluginMessage,
  type GraphViewPluginMessageContext,
} from '../../../../../src/extension/graphView/webview/dispatch/plugin';

function createContext(
  overrides: Partial<GraphViewPluginMessageContext> = {},
): GraphViewPluginMessageContext {
  return {
    getFilterPatterns: vi.fn(() => []),
    getPluginFilterPatterns: vi.fn(() => []),
    getMaxFiles: vi.fn(() => 500),
    getPlaybackSpeed: vi.fn(() => 1),
    getDagMode: vi.fn(() => null),
    getNodeSizeMode: vi.fn(() => 'connections' as NodeSizeMode),
    getFolderNodeColor: vi.fn(() => '#111111'),
    getFocusedFile: vi.fn(() => undefined),
    hasWorkspace: vi.fn(() => false),
    isFirstAnalysis: vi.fn(() => false),
    isWebviewReadyNotified: vi.fn(() => false),
    getHiddenPluginGroupIds: vi.fn(() => new Set<string>()),
    getGraphData: vi.fn(
      () =>
        ({
          nodes: [{ id: 'src/index.ts' }],
          edges: [{ id: 'src/index.ts->src/lib.ts' }],
        }) as IGraphData,
    ),
    loadGroupsAndFilterPatterns: vi.fn(),
    loadDisabledRulesAndPlugins: vi.fn(),
    sendAvailableViews: vi.fn(),
    analyzeAndSendData: vi.fn(),
    sendFavorites: vi.fn(),
    sendSettings: vi.fn(),
    sendPhysicsSettings: vi.fn(),
    sendGroupsUpdated: vi.fn(),
    sendMessage: vi.fn(),
    sendCachedTimeline: vi.fn(),
    sendDecorations: vi.fn(),
    sendContextMenuItems: vi.fn(),
    sendPluginWebviewInjections: vi.fn(),
    sendActiveFile: vi.fn(),
    waitForFirstWorkspaceReady: vi.fn(() => Promise.resolve()),
    notifyWebviewReady: vi.fn(),
    getInteractionPluginApi: vi.fn(),
    getContextMenuPluginApi: vi.fn(),
    emitEvent: vi.fn(),
    findNode: vi.fn((targetId: string) => ({ id: targetId })),
    findEdge: vi.fn((targetId: string) => ({ id: targetId })),
    logError: vi.fn(),
    updateHiddenPluginGroups: vi.fn(() => Promise.resolve()),
    recomputeGroups: vi.fn(),
    ...overrides,
  };
}

describe('graph view plugin message dispatch', () => {
  it('marks the webview as ready after applying the ready payloads', async () => {
    const context = createContext();

    await expect(
      dispatchGraphViewPluginMessage({ type: 'WEBVIEW_READY', payload: null }, context),
    ).resolves.toEqual({ handled: true, readyNotified: true });

    expect(context.loadGroupsAndFilterPatterns).toHaveBeenCalledOnce();
    expect(context.sendPluginWebviewInjections).toHaveBeenCalledOnce();
    expect(context.notifyWebviewReady).toHaveBeenCalledOnce();
  });

  it('forwards plugin interaction events through the event bus bridge', async () => {
    const context = createContext();

    await expect(
      dispatchGraphViewPluginMessage(
        {
          type: 'GRAPH_INTERACTION',
          payload: {
            event: 'nodeClick',
            data: { pluginId: 'plugin.test', nodeId: 'src/index.ts' },
          },
        },
        context,
      ),
    ).resolves.toEqual({ handled: true });

    expect(context.emitEvent).toHaveBeenCalledWith('nodeClick', {
      pluginId: 'plugin.test',
      nodeId: 'src/index.ts',
    });
  });

  it('runs plugin context menu actions against resolved graph targets', async () => {
    const action = vi.fn(() => Promise.resolve());
    const context = createContext({
      getContextMenuPluginApi: vi.fn(() => ({
        contextMenuItems: [{ action }],
      })),
      findNode: vi.fn(() => ({ id: 'src/index.ts', label: 'Index' })),
    });

    await expect(
      dispatchGraphViewPluginMessage(
        {
          type: 'PLUGIN_CONTEXT_MENU_ACTION',
          payload: {
            pluginId: 'plugin.test',
            index: 0,
            targetId: 'src/index.ts',
            targetType: 'node',
          },
        },
        context,
      ),
    ).resolves.toEqual({ handled: true });

    expect(context.getContextMenuPluginApi).toHaveBeenCalledWith('plugin.test');
    expect(context.findNode).toHaveBeenCalledWith('src/index.ts');
    expect(action).toHaveBeenCalledWith({ id: 'src/index.ts', label: 'Index' });
    expect(context.logError).not.toHaveBeenCalled();
  });

  it('updates hidden plugin groups for direct group toggles', async () => {
    const hiddenPluginGroupIds = new Set<string>();
    const context = createContext({
      getHiddenPluginGroupIds: vi.fn(() => hiddenPluginGroupIds),
    });

    await expect(
      dispatchGraphViewPluginMessage(
        {
          type: 'TOGGLE_PLUGIN_GROUP_DISABLED',
          payload: { groupId: 'plugin:test:*.ts', disabled: true },
        },
        context,
      ),
    ).resolves.toEqual({ handled: true });

    expect(hiddenPluginGroupIds.has('plugin:test:*.ts')).toBe(true);
    expect(context.updateHiddenPluginGroups).toHaveBeenCalledWith(['plugin:test:*.ts']);
    expect(context.recomputeGroups).toHaveBeenCalledOnce();
    expect(context.sendGroupsUpdated).toHaveBeenCalledOnce();
  });

  it('updates hidden plugin groups for section toggles', async () => {
    const hiddenPluginGroupIds = new Set<string>();
    const context = createContext({
      getHiddenPluginGroupIds: vi.fn(() => hiddenPluginGroupIds),
    });

    await expect(
      dispatchGraphViewPluginMessage(
        {
          type: 'TOGGLE_PLUGIN_SECTION_DISABLED',
          payload: { pluginId: 'test', disabled: true },
        },
        context,
      ),
    ).resolves.toEqual({ handled: true });

    expect(hiddenPluginGroupIds.has('plugin:test')).toBe(true);
    expect(context.updateHiddenPluginGroups).toHaveBeenCalledWith(['plugin:test']);
    expect(context.recomputeGroups).toHaveBeenCalledOnce();
    expect(context.sendGroupsUpdated).toHaveBeenCalledOnce();
  });

  it('returns false for unrelated messages', async () => {
    await expect(
      dispatchGraphViewPluginMessage({ type: 'OPEN_FILE', payload: { path: 'src/index.ts' } }, createContext()),
    ).resolves.toEqual({ handled: false });
  });
});
