import { describe, expect, it } from 'vitest';
import {
  applyWebviewReady,
  replayDuplicateWebviewReady,
} from '../../../../../../src/extension/graphView/webview/messages/ready';
import { createHandlers } from './fixture';

describe('graph view ready notification and replay', () => {
  it('skips workspace readiness waiting outside the initial workspace pass', async () => {
    const handlers = createHandlers();

    await applyWebviewReady(
      {
        maxFiles: 500,
        verboseDiagnostics: false,
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
});
