import { describe, expect, it, vi } from 'vitest';
import { applyWebviewReady } from '../../../../../src/extension/graphView/webview/messages/ready';

function createHandlers() {
  return {
    loadGroupsAndFilterPatterns: vi.fn(),
    loadDisabledRulesAndPlugins: vi.fn(),
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
    waitForFirstWorkspaceReady: vi.fn(() => Promise.resolve()),
    notifyWebviewReady: vi.fn(),
  };
}

describe('graph view ready message', () => {
  it('sends the initial webview payloads and notifies readiness', async () => {
    const handlers = createHandlers();

    const readyNotified = await applyWebviewReady(
      {
        filterPatterns: ['dist/**'],
        pluginFilterPatterns: ['venv/**'],
        maxFiles: 500,
        playbackSpeed: 1,
        dagMode: 'td',
        nodeSizeMode: 'connections',
        folderNodeColor: '#111111',
        hasWorkspace: false,
        firstAnalysis: false,
        readyNotified: false,
      },
      handlers
    );

    expect(handlers.loadGroupsAndFilterPatterns).toHaveBeenCalledOnce();
    expect(handlers.loadDisabledRulesAndPlugins).toHaveBeenCalledOnce();
    expect(handlers.analyzeAndSendData).toHaveBeenCalledOnce();
    expect(handlers.sendFavorites).toHaveBeenCalledOnce();
    expect(handlers.sendSettings).toHaveBeenCalledOnce();
    expect(handlers.sendPhysicsSettings).toHaveBeenCalledOnce();
    expect(handlers.sendGroupsUpdated).toHaveBeenCalledOnce();
    expect(handlers.sendCachedTimeline).toHaveBeenCalledOnce();
    expect(handlers.sendDecorations).toHaveBeenCalledOnce();
    expect(handlers.sendContextMenuItems).toHaveBeenCalledOnce();
    expect(handlers.sendPluginWebviewInjections).toHaveBeenCalledOnce();
    expect(handlers.sendMessage).toHaveBeenCalledWith({
      type: 'FILTER_PATTERNS_UPDATED',
      payload: {
        patterns: ['dist/**'],
        pluginPatterns: ['venv/**'],
      },
    });
    expect(handlers.sendMessage).toHaveBeenCalledWith({
      type: 'MAX_FILES_UPDATED',
      payload: { maxFiles: 500 },
    });
    expect(handlers.sendMessage).toHaveBeenCalledWith({
      type: 'PLAYBACK_SPEED_UPDATED',
      payload: { speed: 1 },
    });
    expect(handlers.sendMessage).toHaveBeenCalledWith({
      type: 'DAG_MODE_UPDATED',
      payload: { dagMode: 'td' },
    });
    expect(handlers.sendMessage).toHaveBeenCalledWith({
      type: 'NODE_SIZE_MODE_UPDATED',
      payload: { nodeSizeMode: 'connections' },
    });
    expect(handlers.sendMessage).toHaveBeenCalledWith({
      type: 'FOLDER_NODE_COLOR_UPDATED',
      payload: { folderNodeColor: '#111111' },
    });
    expect(handlers.notifyWebviewReady).toHaveBeenCalledOnce();
    expect(readyNotified).toBe(true);
  });

  it('waits for workspace readiness during the first workspace-backed analysis', async () => {
    const handlers = createHandlers();

    await applyWebviewReady(
      {
        filterPatterns: [],
        pluginFilterPatterns: [],
        maxFiles: 500,
        playbackSpeed: 1,
        dagMode: null,
        nodeSizeMode: 'connections',
        folderNodeColor: '#111111',
        hasWorkspace: true,
        firstAnalysis: true,
        readyNotified: false,
      },
      handlers
    );

    expect(handlers.waitForFirstWorkspaceReady).toHaveBeenCalledOnce();
  });

  it('skips workspace readiness waiting outside the initial workspace pass', async () => {
    const handlers = createHandlers();

    await applyWebviewReady(
      {
        filterPatterns: [],
        pluginFilterPatterns: [],
        maxFiles: 500,
        playbackSpeed: 1,
        dagMode: null,
        nodeSizeMode: 'connections',
        folderNodeColor: '#111111',
        hasWorkspace: true,
        firstAnalysis: false,
        readyNotified: false,
      },
      handlers
    );

    expect(handlers.waitForFirstWorkspaceReady).not.toHaveBeenCalled();
  });

  it('does not notify readiness twice', async () => {
    const handlers = createHandlers();

    const readyNotified = await applyWebviewReady(
      {
        filterPatterns: [],
        pluginFilterPatterns: [],
        maxFiles: 500,
        playbackSpeed: 1,
        dagMode: null,
        nodeSizeMode: 'connections',
        folderNodeColor: '#111111',
        hasWorkspace: false,
        firstAnalysis: false,
        readyNotified: true,
      },
      handlers
    );

    expect(handlers.notifyWebviewReady).not.toHaveBeenCalled();
    expect(readyNotified).toBe(true);
  });
});
