import { describe, expect, it, vi } from 'vitest';
import * as vscode from 'vscode';
import { sendGraphViewProviderWebviewMessage } from '../../../../../src/extension/graphView/provider/webview/messages';

describe('graphView/provider/webview/messages', () => {
  it('sends messages to sidebar views and editor panels and notifies the extension', () => {
    const graphView = { webview: { postMessage: vi.fn(() => true) } } as unknown as vscode.WebviewView;
    const timelineView = { webview: { postMessage: vi.fn(() => true) } } as unknown as vscode.WebviewView;
    const panel = { webview: { postMessage: vi.fn(() => true) } } as unknown as vscode.WebviewPanel;
    const notifyExtensionMessage = vi.fn();
    const sendWebviewMessage = vi.fn();

    sendGraphViewProviderWebviewMessage(
      {
        _view: graphView,
        _timelineView: timelineView,
        _panels: [panel],
        _notifyExtensionMessage: notifyExtensionMessage,
      },
      {
        sendWebviewMessage,
      },
      { type: 'PING' },
    );

    expect(sendWebviewMessage).toHaveBeenCalledWith([graphView, timelineView], [panel], {
      type: 'PING',
    });
    expect(notifyExtensionMessage).toHaveBeenCalledWith({ type: 'PING' });
  });

  it('assigns increasing revisions to full graph payloads before publishing them', () => {
    const notifyExtensionMessage = vi.fn();
    const sendWebviewMessage = vi.fn();
    const source = {
      _view: undefined,
      _timelineView: undefined,
      _panels: [],
      _notifyExtensionMessage: notifyExtensionMessage,
    };

    sendGraphViewProviderWebviewMessage(source, { sendWebviewMessage }, {
      type: 'GRAPH_DATA_UPDATED',
      payload: { nodes: [], edges: [] },
    });
    sendGraphViewProviderWebviewMessage(source, { sendWebviewMessage }, {
      type: 'GRAPH_DATA_UPDATED',
      payload: { nodes: [], edges: [] },
    });

    expect(sendWebviewMessage).toHaveBeenNthCalledWith(1, [], [], {
      type: 'GRAPH_DATA_UPDATED',
      graphRevision: 1,
      payload: { nodes: [], edges: [] },
    });
    expect(sendWebviewMessage).toHaveBeenNthCalledWith(2, [], [], {
      type: 'GRAPH_DATA_UPDATED',
      graphRevision: 2,
      payload: { nodes: [], edges: [] },
    });
    expect(notifyExtensionMessage).toHaveBeenLastCalledWith({
      type: 'GRAPH_DATA_UPDATED',
      graphRevision: 2,
      payload: { nodes: [], edges: [] },
    });
  });

  it('assigns a graph revision to patch payloads', () => {
    const notifyExtensionMessage = vi.fn();
    const sendWebviewMessage = vi.fn();
    const message = {
      type: 'GRAPH_DATA_PATCHED',
      nodeCount: 1,
      edgeCount: 0,
      payload: {
        addedNodes: [],
        removedNodeIds: [],
        updatedNodes: [],
        addedLinks: [],
        removedLinkIds: [],
      },
    };

    sendGraphViewProviderWebviewMessage(
      {
        _view: undefined,
        _timelineView: undefined,
        _panels: [],
        _notifyExtensionMessage: notifyExtensionMessage,
      },
      { sendWebviewMessage },
      message,
    );

    expect(sendWebviewMessage).toHaveBeenCalledWith([], [], {
      ...message,
      baseGraphRevision: 0,
      graphRevision: 1,
    });
  });
});
