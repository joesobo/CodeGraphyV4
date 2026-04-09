import { describe, expect, it, vi } from 'vitest';
import type { DagMode, NodeSizeMode } from '@/shared/settings/modes';
import {
  dispatchGraphViewPluginReadyMessage,
  type GraphViewPluginReadyContext,
} from '../../../../../src/extension/graphView/webview/dispatch/pluginReady';

function createContext(
  overrides: Partial<GraphViewPluginReadyContext> = {},
): GraphViewPluginReadyContext {
  return {
    getFilterPatterns: vi.fn(() => ['src/**']),
    getPluginFilterPatterns: vi.fn(() => ['plugin:test/**']),
    getMaxFiles: vi.fn(() => 500),
    getPlaybackSpeed: vi.fn(() => 2),
    getDepthMode: vi.fn(() => false),
    getDagMode: vi.fn(() => 'td' as DagMode),
    getNodeSizeMode: vi.fn(() => 'connections' as NodeSizeMode),
    getFocusedFile: vi.fn(() => undefined),
    hasWorkspace: vi.fn(() => false),
    isFirstAnalysis: vi.fn(() => false),
    isWebviewReadyNotified: vi.fn(() => false),
    loadGroupsAndFilterPatterns: vi.fn(),
    loadDisabledRulesAndPlugins: vi.fn(),
    sendDepthState: vi.fn(),
    sendGraphControls: vi.fn(),
    loadAndSendData: vi.fn(() => Promise.resolve()),
    sendFavorites: vi.fn(),
    sendSettings: vi.fn(),
    sendPhysicsSettings: vi.fn(),
    sendGroupsUpdated: vi.fn(),
    sendMessage: vi.fn(),
    sendCachedTimeline: vi.fn(),
    sendDecorations: vi.fn(),
    sendContextMenuItems: vi.fn(),
    sendPluginToolbarActions: vi.fn(),
    sendPluginWebviewInjections: vi.fn(),
    sendActiveFile: vi.fn(),
    waitForFirstWorkspaceReady: vi.fn(() => Promise.resolve()),
    notifyWebviewReady: vi.fn(),
    ...overrides,
  };
}

describe('dispatchGraphViewPluginReadyMessage', () => {
  it('sends ready payloads and notifies the first ready event', async () => {
    const context = createContext();

    await expect(
      dispatchGraphViewPluginReadyMessage({ type: 'WEBVIEW_READY', payload: null }, context),
    ).resolves.toBe(true);

    expect(context.loadGroupsAndFilterPatterns).toHaveBeenCalledOnce();
    expect(context.loadDisabledRulesAndPlugins).toHaveBeenCalledOnce();
    expect(context.sendDepthState).toHaveBeenCalledOnce();
    expect(context.sendGraphControls).toHaveBeenCalledOnce();
    expect(context.sendFavorites).toHaveBeenCalledOnce();
    expect(context.sendSettings).toHaveBeenCalledOnce();
    expect(context.sendPhysicsSettings).toHaveBeenCalledOnce();
    expect(context.sendGroupsUpdated).toHaveBeenCalledOnce();
    expect(context.sendCachedTimeline).toHaveBeenCalledOnce();
    expect(context.sendDecorations).toHaveBeenCalledOnce();
    expect(context.sendContextMenuItems).toHaveBeenCalledOnce();
    expect(context.sendPluginWebviewInjections).toHaveBeenCalledOnce();
    expect(context.sendActiveFile).toHaveBeenCalledOnce();
    expect(context.notifyWebviewReady).toHaveBeenCalledOnce();
    expect(context.sendMessage).toHaveBeenCalledWith({
      type: 'FILTER_PATTERNS_UPDATED',
      payload: {
        patterns: ['src/**'],
        pluginPatterns: ['plugin:test/**'],
      },
    });
    expect(context.sendMessage).toHaveBeenCalledWith({
      type: 'DEPTH_MODE_UPDATED',
      payload: { depthMode: false },
    });
  });

  it('waits for first workspace readiness and skips duplicate notification', async () => {
    const context = createContext({
      hasWorkspace: vi.fn(() => true),
      isFirstAnalysis: vi.fn(() => true),
      isWebviewReadyNotified: vi.fn(() => true),
    });

    await expect(
      dispatchGraphViewPluginReadyMessage({ type: 'WEBVIEW_READY', payload: null }, context),
    ).resolves.toBe(true);

    expect(context.waitForFirstWorkspaceReady).toHaveBeenCalledOnce();
    expect(context.notifyWebviewReady).not.toHaveBeenCalled();
  });
});
