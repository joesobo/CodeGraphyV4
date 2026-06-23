import { describe, expect, it, vi } from 'vitest';
import * as vscode from 'vscode';
import { sendGraphViewProviderWebviewMessage } from '../../../../../src/extension/graphView/provider/webview/messages';

describe('graphView/provider/webview/messages', () => {
  it('sends messages to sidebar views and editor panels and notifies the extension', () => {
    const graphView = { webview: { postMessage: vi.fn(() => true) } } as unknown as vscode.WebviewView;
    const timelineView = { webview: { postMessage: vi.fn(() => true) } } as unknown as vscode.WebviewView;
    const panel = { webview: { postMessage: vi.fn(() => true) } } as unknown as vscode.WebviewPanel;
    const notifyExtensionMessage = vi.fn();
    const recordPerformanceEvent = vi.fn();
    const sendWebviewMessage = vi.fn();

    sendGraphViewProviderWebviewMessage(
      {
        _view: graphView,
        _timelineView: timelineView,
        _panels: [panel],
        _notifyExtensionMessage: notifyExtensionMessage,
      },
      {
        recordPerformanceEvent,
        sendWebviewMessage,
      },
      { type: 'PING' },
    );

    expect(sendWebviewMessage).toHaveBeenCalledWith([graphView, timelineView], [panel], {
      type: 'PING',
    });
    expect(recordPerformanceEvent).toHaveBeenCalledWith('graphWebview.message.send', {
      panelCount: 1,
      sidebarViewCount: 2,
      type: 'PING',
    });
    expect(notifyExtensionMessage).toHaveBeenCalledWith({ type: 'PING' });
  });
});
