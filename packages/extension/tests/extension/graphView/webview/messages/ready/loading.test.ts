import { describe, expect, it } from 'vitest';
import { applyWebviewReady } from '../../../../../../src/extension/graphView/webview/messages/ready';
import { createHandlers } from './fixture';

describe('graph view ready loading sequence', () => {
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

});
