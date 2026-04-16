import { describe, expect, it, vi } from 'vitest';
import {
  onGraphViewWebviewMessage,
  sendGraphViewWebviewMessage,
} from '../../../../src/extension/graphView/webview/bridge';

describe('graphView/webview/bridge', () => {
  it('sends messages to every sidebar view and every editor panel', () => {
    const graphViewWebview = { postMessage: vi.fn() };
    const timelineViewWebview = { postMessage: vi.fn() };
    const panelWebview = { postMessage: vi.fn() };

    sendGraphViewWebviewMessage(
      [
        { webview: graphViewWebview } as never,
        { webview: timelineViewWebview } as never,
      ],
      [{ webview: panelWebview }] as never,
      { type: 'GRAPH_DATA_UPDATED' },
    );

    expect(graphViewWebview.postMessage).toHaveBeenCalledWith({ type: 'GRAPH_DATA_UPDATED' });
    expect(timelineViewWebview.postMessage).toHaveBeenCalledWith({ type: 'GRAPH_DATA_UPDATED' });
    expect(panelWebview.postMessage).toHaveBeenCalledWith({ type: 'GRAPH_DATA_UPDATED' });
  });

  it('skips missing sidebar views while still sending to remaining views and panels', () => {
    const graphViewWebview = { postMessage: vi.fn() };
    const panelWebview = { postMessage: vi.fn() };

    sendGraphViewWebviewMessage(
      [undefined, { webview: graphViewWebview } as never],
      [{ webview: panelWebview }] as never,
      { type: 'GRAPH_DATA_UPDATED' },
    );

    expect(graphViewWebview.postMessage).toHaveBeenCalledWith({ type: 'GRAPH_DATA_UPDATED' });
    expect(panelWebview.postMessage).toHaveBeenCalledWith({ type: 'GRAPH_DATA_UPDATED' });
  });

  it('returns a no-op disposable when no sidebar view is available', () => {
    const disposable = onGraphViewWebviewMessage(undefined, vi.fn());

    expect(disposable).toEqual({ dispose: expect.any(Function) });
  });

  it('subscribes to messages when a sidebar view is available', () => {
    const handler = vi.fn();
    const disposable = { dispose: vi.fn() };
    const onDidReceiveMessage = vi.fn(() => disposable);

    expect(
      onGraphViewWebviewMessage(
        { webview: { onDidReceiveMessage } } as never,
        handler,
      ),
    ).toBe(disposable);
    expect(onDidReceiveMessage).toHaveBeenCalledWith(handler);
  });
});
