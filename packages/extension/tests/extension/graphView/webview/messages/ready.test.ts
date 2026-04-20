import { describe, expect, it, vi } from 'vitest';
import { applyWebviewReady } from '../../../../../src/extension/graphView/webview/messages/ready';

function createHandlers() {
  return {
    getFilterPatterns: vi.fn(() => ['dist/**']),
    getPluginFilterPatterns: vi.fn(() => ['venv/**']),
    getConfig: vi.fn(<T>(_: string, defaultValue: T): T => defaultValue),
    loadGroupsAndFilterPatterns: vi.fn(),
    loadDisabledRulesAndPlugins: vi.fn(),
    sendDepthState: vi.fn(),
    sendGraphControls: vi.fn(),
    loadAndSendData: vi.fn(),
    sendFavorites: vi.fn(),
    sendSettings: vi.fn(),
    sendPhysicsSettings: vi.fn(),
    sendGroupsUpdated: vi.fn(),
    sendMessage: vi.fn(),
    sendCachedTimeline: vi.fn(),
    sendDecorations: vi.fn(),
    sendContextMenuItems: vi.fn(),
    sendPluginWebviewInjections: vi.fn(),
    sendPluginToolbarActions: vi.fn(),
    sendActiveFile: vi.fn(),
    waitForFirstWorkspaceReady: vi.fn(() => Promise.resolve()),
    notifyWebviewReady: vi.fn(),
  };
}

describe('graph view ready message', () => {
  it('sends the initial webview payloads and notifies readiness', async () => {
    const handlers = createHandlers();

    const readyNotified = await applyWebviewReady(
      {
        maxFiles: 500,
        playbackSpeed: 1,
        dagMode: 'td',
        nodeSizeMode: 'connections',
        focusedFile: 'src/game/player.gd',
        hasWorkspace: false,
        firstAnalysis: false,
        readyNotified: false,
      },
      handlers
    );

    expect(handlers.loadGroupsAndFilterPatterns).toHaveBeenCalledOnce();
    expect(handlers.loadDisabledRulesAndPlugins).toHaveBeenCalledOnce();
    expect(handlers.sendDepthState).toHaveBeenCalledOnce();
    expect(handlers.sendGraphControls).toHaveBeenCalledOnce();
    expect(handlers.loadAndSendData).toHaveBeenCalledOnce();
    expect(handlers.sendFavorites).toHaveBeenCalledOnce();
    expect(handlers.sendSettings).toHaveBeenCalledOnce();
    expect(handlers.sendPhysicsSettings).toHaveBeenCalledOnce();
    expect(handlers.sendGroupsUpdated).toHaveBeenCalledOnce();
    expect(handlers.sendCachedTimeline).toHaveBeenCalledOnce();
    expect(handlers.sendDecorations).toHaveBeenCalledOnce();
    expect(handlers.sendContextMenuItems).toHaveBeenCalledOnce();
    expect(handlers.sendPluginWebviewInjections).toHaveBeenCalledOnce();
    expect(handlers.sendActiveFile).toHaveBeenCalledOnce();
    expect(handlers.sendMessage).toHaveBeenCalledWith({
      type: 'FILTER_PATTERNS_UPDATED',
      payload: {
        patterns: ['dist/**'],
        pluginPatterns: ['venv/**'],
        disabledCustomPatterns: [],
        disabledPluginPatterns: [],
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
    expect(handlers.notifyWebviewReady).toHaveBeenCalledOnce();
    expect(readyNotified).toBe(true);
  });

  it('sends available views before kicking off analysis', async () => {
    const callOrder: string[] = [];
    const handlers = createHandlers();
    handlers.sendDepthState.mockImplementation(() => {
      callOrder.push('views');
    });
    handlers.loadAndSendData.mockImplementation(() => {
      callOrder.push('analyze');
    });

    await applyWebviewReady(
      {
        maxFiles: 500,
        playbackSpeed: 1,
        dagMode: null,
        nodeSizeMode: 'connections',
        focusedFile: undefined,
        hasWorkspace: true,
        firstAnalysis: true,
        readyNotified: false,
      },
      handlers
    );

    expect(callOrder.indexOf('views')).toBeGreaterThanOrEqual(0);
    expect(callOrder.indexOf('analyze')).toBeGreaterThanOrEqual(0);
    expect(callOrder.indexOf('views')).toBeLessThan(callOrder.indexOf('analyze'));
  });

  it('waits for workspace readiness during the first workspace-backed analysis', async () => {
    const handlers = createHandlers();

    await applyWebviewReady(
      {
        maxFiles: 500,
        playbackSpeed: 1,
        dagMode: null,
        nodeSizeMode: 'connections',
        focusedFile: undefined,
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
        maxFiles: 500,
        playbackSpeed: 1,
        dagMode: null,
        nodeSizeMode: 'connections',
        focusedFile: undefined,
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
        maxFiles: 500,
        playbackSpeed: 1,
        dagMode: null,
        nodeSizeMode: 'connections',
        focusedFile: undefined,
        hasWorkspace: false,
        firstAnalysis: false,
        readyNotified: true,
      },
      handlers
    );

    expect(handlers.notifyWebviewReady).not.toHaveBeenCalled();
    expect(readyNotified).toBe(true);
  });

  it('waits for cached timeline replay before notifying readiness', async () => {
    const events: string[] = [];
    const handlers = createHandlers();
    handlers.sendCachedTimeline.mockImplementation(async () => {
      events.push('timeline:start');
      await Promise.resolve();
      events.push('timeline:end');
    });
    handlers.notifyWebviewReady.mockImplementation(() => {
      events.push('ready');
    });

    await applyWebviewReady(
      {
        maxFiles: 500,
        playbackSpeed: 1,
        dagMode: null,
        nodeSizeMode: 'connections',
        focusedFile: undefined,
        hasWorkspace: false,
        firstAnalysis: false,
        readyNotified: false,
      },
      handlers
    );

    expect(events).toEqual(['timeline:start', 'timeline:end', 'ready']);
  });
});
