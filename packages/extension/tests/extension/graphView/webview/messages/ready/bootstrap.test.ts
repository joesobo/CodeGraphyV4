import { describe, expect, it, vi } from 'vitest';
import { applyWebviewReady } from '../../../../../../src/extension/graphView/webview/messages/ready';
import { createHandlers } from './fixture';

describe('graph view ready bootstrap payloads', () => {
  it('sends the initial webview payloads and notifies readiness', async () => {
    const handlers = createHandlers();
    const log = vi.spyOn(console, 'log').mockImplementation(() => undefined);

    const readyNotified = await applyWebviewReady(
      {
        maxFiles: 500,
        showFps: true,
        verboseDiagnostics: true,
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
      type: 'SHOW_FPS_UPDATED',
      payload: { showFps: true },
    });
    expect(handlers.sendMessage).toHaveBeenCalledWith({
      type: 'VERBOSE_DIAGNOSTICS_UPDATED',
      payload: { verboseDiagnostics: true },
    });
    expect(handlers.sendMessage).toHaveBeenCalledWith({
      type: 'NODE_SIZE_MODE_UPDATED',
      payload: { nodeSizeMode: 'connections' },
    });
    expect(handlers.notifyWebviewReady).toHaveBeenCalledOnce();
    expect(readyNotified).toBe(true);
    expect(log.mock.calls.map(call => call[0])).toContain(
      '[CodeGraphy] Ready replayed: area=extension.webview, hasWorkspace=false, firstAnalysis=false, readyNotified=false, maxFiles=500',
    );
    expect(log.mock.calls.map(call => call[0])).toContain(
      '[CodeGraphy] Bootstrap completed: area=extension.webview, hasWorkspace=false, firstAnalysis=false, readyNotified=false',
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
});
