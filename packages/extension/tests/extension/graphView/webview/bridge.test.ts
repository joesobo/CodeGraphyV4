import { describe, expect, it, vi } from 'vitest';
import {
  onGraphViewWebviewMessage,
  sendGraphViewWebviewMessage,
} from '../../../../src/extension/graphView/webview/bridge';

describe('graphView/webview/bridge', () => {
  it('sends messages to the sidebar view and every editor panel', () => {
    const viewWebview = { postMessage: vi.fn() };
    const panelWebview = { postMessage: vi.fn() };

    sendGraphViewWebviewMessage(
      { webview: viewWebview } as never,
      [{ webview: panelWebview }] as never,
      { type: 'GRAPH_DATA_UPDATED' },
    );

    expect(viewWebview.postMessage).toHaveBeenCalledWith({ type: 'GRAPH_DATA_UPDATED' });
    expect(panelWebview.postMessage).toHaveBeenCalledWith({ type: 'GRAPH_DATA_UPDATED' });
  });

  it('returns a no-op disposable when no sidebar view is available', () => {
    const disposable = onGraphViewWebviewMessage(undefined, vi.fn());

    expect(disposable).toEqual({ dispose: expect.any(Function) });
  });
});
