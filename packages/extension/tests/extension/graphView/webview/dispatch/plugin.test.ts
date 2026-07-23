import { describe, expect, it, vi } from 'vitest';

import {
  dispatchGraphViewPluginMessage,
  type GraphViewPluginMessageContext,
} from '../../../../../src/extension/graphView/webview/dispatch/plugin';

function createContext(): GraphViewPluginMessageContext {
  return {
    getFilterPatterns: () => [],
    getPluginFilterPatterns: () => [],
    getPluginFilterGroups: () => [],
    getConfig: <T>(_key: string, defaultValue: T): T => defaultValue,
    getMaxFiles: () => 500,
    getNodeSizeMode: () => 'connections',
    getDepthMode: () => false,
    getFocusedFile: () => undefined,
    hasWorkspace: () => false,
    isFirstAnalysis: () => false,
    isWebviewReadyNotified: () => false,
    getGraphData: () => ({ nodes: [], edges: [] }),
    loadGroupsAndFilterPatterns: vi.fn(),
    loadDisabledRulesAndPlugins: vi.fn(),
    sendDepthState: vi.fn(),
    sendGraphControls: vi.fn(),
    loadAndSendData: vi.fn(async () => undefined),
    analyzeAndSendData: vi.fn(async () => undefined),
    sendFavorites: vi.fn(),
    sendSettings: vi.fn(),
    sendPhysicsSettings: vi.fn(),
    sendGroupsUpdated: vi.fn(),
    sendMessage: vi.fn(),
    sendDecorations: vi.fn(),
    sendPluginWebviewInjections: vi.fn(),
    sendActiveFile: vi.fn(),
    waitForFirstWorkspaceReady: () => Promise.resolve(),
    notifyWebviewReady: vi.fn(),
    logError: vi.fn(),
  };
}

describe('graph view plugin message dispatch', () => {
  it('handles webview readiness through the Extension plugin path', async () => {
    const context = createContext();

    await expect(
      dispatchGraphViewPluginMessage({ type: 'WEBVIEW_READY', payload: null }, context),
    ).resolves.toEqual({ handled: true, readyNotified: true });

    expect(context.sendPluginWebviewInjections).toHaveBeenCalledOnce();
    expect(context.notifyWebviewReady).toHaveBeenCalledOnce();
  });

  it('does not claim unrelated webview messages', async () => {
    await expect(
      dispatchGraphViewPluginMessage({ type: 'REFRESH_GRAPH' }, createContext()),
    ).resolves.toEqual({ handled: false });
  });
});
