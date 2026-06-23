import { describe, expect, it, vi } from 'vitest';
import {
  applyWebviewReady,
  replayDuplicateWebviewReady,
} from '../../../../../src/extension/graphView/webview/messages/ready';

function createHandlers() {
  return {
    getGraphData: vi.fn(() => ({
      nodes: [{ id: 'cached.ts', label: 'cached.ts', color: '#ffffff' }],
      edges: [],
    })),
    getFilterPatterns: vi.fn(() => ['dist/**']),
    getPluginFilterPatterns: vi.fn(() => ['venv/**']),
    getPluginFilterGroups: vi.fn(() => []),
    getConfig: vi.fn(<T>(_key: string, defaultValue: T): T => defaultValue),
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
    sendPluginStatuses: vi.fn(),
    sendPluginWebviewInjections: vi.fn(),
    sendPluginToolbarActions: vi.fn(),
    sendGraphViewContributionStatuses: vi.fn(),
    sendActiveFile: vi.fn(),
    waitForFirstWorkspaceReady: vi.fn(() => Promise.resolve()),
    notifyWebviewReady: vi.fn(),
  };
}

describe('graph view ready message', () => {
  it('sends the initial webview payloads and notifies readiness', async () => {
    const handlers = createHandlers();
    const log = vi.spyOn(console, 'log').mockImplementation(() => undefined);

    const readyNotified = await applyWebviewReady(
      {
        maxFiles: 500,
        verboseDiagnostics: true,
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
    expect(handlers.sendPluginStatuses).toHaveBeenCalledOnce();
    expect(handlers.sendGraphViewContributionStatuses).toHaveBeenCalledOnce();
    expect(handlers.sendPluginWebviewInjections).toHaveBeenCalledOnce();
    expect(handlers.sendActiveFile).toHaveBeenCalledOnce();
    expect(handlers.sendMessage).toHaveBeenCalledWith({
      type: 'FILTER_PATTERNS_UPDATED',
      payload: {
        patterns: ['dist/**'],
        pluginPatterns: ['venv/**'],
        pluginPatternGroups: [],
        disabledCustomPatterns: [],
        disabledPluginPatterns: [],
      },
    });
    expect(handlers.sendMessage).toHaveBeenCalledWith({
      type: 'MAX_FILES_UPDATED',
      payload: { maxFiles: 500 },
    });
    expect(handlers.sendMessage).toHaveBeenCalledWith({
      type: 'VERBOSE_DIAGNOSTICS_UPDATED',
      payload: { verboseDiagnostics: true },
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
    expect(log.mock.calls.map(call => call[0])).toContain(
      '[CodeGraphy] Webview ready replayed: hasWorkspace=false, firstAnalysis=false, readyNotified=false, maxFiles=500',
    );
    expect(log.mock.calls.map(call => call[0])).toContain(
      '[CodeGraphy] Webview bootstrap complete: hasWorkspace=false, firstAnalysis=false, readyNotified=false',
    );
    log.mockRestore();
  });

  it('sends available views before kicking off analysis', async () => {
    const callOrder: string[] = [];
    const handlers = createHandlers();
    handlers.sendSettings.mockImplementation(() => callOrder.push('settings'));
    handlers.sendGraphControls.mockImplementation(() => callOrder.push('controls'));
    handlers.sendPluginWebviewInjections.mockImplementation(() => callOrder.push('plugin-injections'));
    handlers.sendMessage.mockImplementation((message: { type: string }) => {
      if (message.type === 'FILTER_PATTERNS_UPDATED') {
        callOrder.push('filters');
      }
    });
    handlers.loadAndSendData.mockImplementation(() => {
      callOrder.push('analyze');
    });

    await applyWebviewReady(
      {
        maxFiles: 500,
        verboseDiagnostics: false,
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

    expect(callOrder.indexOf('settings')).toBeGreaterThanOrEqual(0);
    expect(callOrder.indexOf('controls')).toBeGreaterThanOrEqual(0);
    expect(callOrder.indexOf('plugin-injections')).toBeGreaterThanOrEqual(0);
    expect(callOrder.indexOf('analyze')).toBeGreaterThanOrEqual(0);
    expect(callOrder.indexOf('settings')).toBeLessThan(callOrder.indexOf('analyze'));
    expect(callOrder.indexOf('controls')).toBeLessThan(callOrder.indexOf('analyze'));
    expect(callOrder.indexOf('plugin-injections')).toBeLessThan(callOrder.indexOf('analyze'));
    expect(callOrder.indexOf('filters')).toBeLessThan(callOrder.indexOf('analyze'));
  });

  it('does not replay unchanged filter patterns after graph loading', async () => {
    const events: string[] = [];
    const handlers = createHandlers();
    handlers.sendMessage.mockImplementation((message: { type: string }) => {
      if (message.type === 'FILTER_PATTERNS_UPDATED') {
        events.push('filters');
      }
    });
    handlers.loadAndSendData.mockImplementation(() => {
      events.push('graph');
    });

    await applyWebviewReady(
      {
        maxFiles: 500,
        verboseDiagnostics: false,
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

    expect(events).toEqual(['filters', 'graph']);
    expect(handlers.sendMessage.mock.calls.filter(([message]) =>
      (message as { type?: string }).type === 'FILTER_PATTERNS_UPDATED'
    )).toHaveLength(1);
  });

  it('replays plugin filters that become available while loading graph data', async () => {
    const handlers = createHandlers();
    let pluginPatterns: string[] = [];
    let pluginPatternGroups: Array<{ pluginId: string; pluginName: string; patterns: string[] }> = [];
    handlers.getPluginFilterPatterns.mockImplementation(() => pluginPatterns);
    handlers.getPluginFilterGroups = vi.fn(() => pluginPatternGroups);
    handlers.loadAndSendData.mockImplementation(() => {
      pluginPatterns = ['**/*.meta'];
      pluginPatternGroups = [
        { pluginId: 'codegraphy.unity', pluginName: 'Unity', patterns: ['**/*.meta'] },
      ];
    });

    await applyWebviewReady(
      {
        maxFiles: 500,
        verboseDiagnostics: false,
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

    expect(handlers.sendMessage).toHaveBeenLastCalledWith({
      type: 'APP_BOOTSTRAP_COMPLETE',
    });
    expect(handlers.sendMessage).toHaveBeenCalledWith({
      type: 'FILTER_PATTERNS_UPDATED',
      payload: {
        patterns: ['dist/**'],
        pluginPatterns: ['**/*.meta'],
        pluginPatternGroups: [
          { pluginId: 'codegraphy.unity', pluginName: 'Unity', patterns: ['**/*.meta'] },
        ],
        disabledCustomPatterns: [],
        disabledPluginPatterns: [],
      },
    });
  });

  it('keeps bootstrap pending until slow graph loading settles', async () => {
    const events: string[] = [];
    const handlers = createHandlers();
    let finishGraphLoad: (() => void) | undefined;
    handlers.loadAndSendData.mockImplementation(async () => {
      events.push('graph:start');
      await new Promise<void>(resolve => {
        finishGraphLoad = resolve;
      });
      events.push('graph:end');
    });
    handlers.sendPluginStatuses.mockImplementation(() => {
      events.push('plugins');
    });
    handlers.sendMessage.mockImplementation((message: { type: string }) => {
      if (message.type === 'APP_BOOTSTRAP_COMPLETE') {
        events.push('bootstrap');
      }
      if (message.type === 'GRAPH_DATA_UPDATED') {
        events.push('graph:snapshot');
      }
    });

    const ready = applyWebviewReady(
      {
        maxFiles: 500,
        verboseDiagnostics: false,
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

    await Promise.resolve();

    expect(events).toEqual(['graph:start']);

    finishGraphLoad?.();
    await ready;

    expect(events).toEqual(['graph:start', 'graph:end', 'plugins', 'bootstrap']);
  });

  it('hydrates settings again after initial workspace graph loading before bootstrap', async () => {
    const events: string[] = [];
    const handlers = createHandlers();
    handlers.sendSettings.mockImplementation(() => events.push('settings'));
    handlers.sendGroupsUpdated.mockImplementation(() => events.push('legends'));
    handlers.loadAndSendData.mockImplementation(() => {
      events.push('graph');
    });
    handlers.sendMessage.mockImplementation((message: { type: string }) => {
      if (message.type === 'APP_BOOTSTRAP_COMPLETE') {
        events.push('bootstrap');
      }
    });

    await applyWebviewReady(
      {
        maxFiles: 500,
        verboseDiagnostics: false,
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

    expect(events).toEqual([
      'settings',
      'legends',
      'graph',
      'settings',
      'legends',
      'bootstrap',
    ]);
  });

  it('does not block bootstrap on first workspace-ready plugin notifications', async () => {
    const events: string[] = [];
    const handlers = createHandlers();
    handlers.sendGraphViewContributionStatuses.mockImplementation(() => {
      events.push('contributions');
    });
    handlers.sendMessage.mockImplementation((message: { type: string }) => {
      if (message.type === 'APP_BOOTSTRAP_COMPLETE') {
        events.push('bootstrap');
      }
    });

    await applyWebviewReady(
      {
        maxFiles: 500,
        verboseDiagnostics: false,
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

    expect(handlers.waitForFirstWorkspaceReady).not.toHaveBeenCalled();
    expect(events).toEqual(['contributions', 'bootstrap']);
  });

  it('skips workspace readiness waiting outside the initial workspace pass', async () => {
    const handlers = createHandlers();

    await applyWebviewReady(
      {
        maxFiles: 500,
        verboseDiagnostics: false,
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
        verboseDiagnostics: false,
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

  it('does not resend full graph data for duplicate ready after bootstrap', async () => {
    const handlers = createHandlers();

    await replayDuplicateWebviewReady(
      {
        maxFiles: 500,
        verboseDiagnostics: false,
        playbackSpeed: 1,
        dagMode: null,
        nodeSizeMode: 'connections',
        focusedFile: undefined,
        hasWorkspace: true,
        firstAnalysis: false,
        readyNotified: true,
      },
      handlers,
    );

    expect(handlers.getGraphData).not.toHaveBeenCalled();
    expect(handlers.sendMessage).not.toHaveBeenCalledWith({
      type: 'GRAPH_DATA_UPDATED',
      payload: {
        nodes: [{ id: 'cached.ts', label: 'cached.ts', color: '#ffffff' }],
        edges: [],
      },
    });
    expect(handlers.sendMessage).toHaveBeenCalledWith({
      type: 'APP_BOOTSTRAP_COMPLETE',
    });
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
        verboseDiagnostics: false,
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
