import { describe, expect, it, vi } from 'vitest';
import type { IPluginStatus } from '../../../../../src/shared/plugins/status';
import {
  sendGraphViewDecorations,
  sendGraphViewPluginStatuses,
} from '../../../../../src/extension/graphView/webview/plugins/updates';

describe('graphView/webview/plugins/updates', () => {
  function createPluginStatus(id: string, enabled: boolean): IPluginStatus {
    return {
      id,
      name: id,
      version: '1.0.0',
      supportedExtensions: [],
      status: enabled ? 'active' : 'inactive',
      enabled,
      connectionCount: 0,
    };
  }

  it('sends plugin status updates when an analyzer exists', () => {
    const sendMessage = vi.fn();

    sendGraphViewPluginStatuses(
      {
        getPluginStatuses: vi.fn(() => [createPluginStatus('plugin.test', true)]),
      },
      new Set(['plugin.disabled']),
      sendMessage,
    );

    expect(sendMessage).toHaveBeenCalledWith({
      type: 'PLUGINS_UPDATED',
      payload: {
        plugins: [
          {
            id: 'plugin.test',
            name: 'plugin.test',
            version: '1.0.0',
            supportedExtensions: [],
            status: 'active',
            enabled: true,
            connectionCount: 0,
          },
        ],
      },
    });
  });

  it('skips plugin status updates when no analyzer is available', () => {
    const sendMessage = vi.fn();
    sendGraphViewPluginStatuses(undefined, new Set(), sendMessage);
    expect(sendMessage).not.toHaveBeenCalled();
  });

  it('sends merged decoration payloads', () => {
    const sendMessage = vi.fn();

    sendGraphViewDecorations(
      {
        getMergedNodeDecorations: () =>
          new Map([['src/app.ts', { color: '#ffffff', priority: 1 }]]),
        getMergedEdgeDecorations: () =>
          new Map([['src/app.ts->src/lib.ts', { color: '#000000', priority: 1 }]]),
      },
      sendMessage,
    );

    expect(sendMessage).toHaveBeenCalledWith({
      type: 'DECORATIONS_UPDATED',
      payload: {
        nodeDecorations: {
          'src/app.ts': { color: '#ffffff' },
        },
        edgeDecorations: {
          'src/app.ts->src/lib.ts': { color: '#000000' },
        },
      },
    });
  });
});
