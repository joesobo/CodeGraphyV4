import { describe, expect, it, vi } from 'vitest';
import * as vscode from 'vscode';
import { createGraphViewProviderWebviewMethods } from '../../../../../src/extension/graphView/provider/webview/host';

describe('graphView/provider/webview/host', () => {
  it('forwards direct webview messaging helpers', () => {
    const sendWebviewMessage = vi.fn();
    const notifyExtensionMessage = vi.fn();
    const disposable = { dispose: vi.fn() };
    const onWebviewMessage = vi.fn(() => disposable);
    const source = {
      _extensionUri: vscode.Uri.file('/test/extension'),
      _view: { kind: 'graph-view' } as unknown as vscode.WebviewView,
      _panels: [{ kind: 'panel' } as unknown as vscode.WebviewPanel],
      _notifyExtensionMessage: notifyExtensionMessage,
      _analyzeAndSendData: vi.fn(async () => undefined),
      _getLocalResourceRoots: vi.fn(() => []),
    };
    const methods = createGraphViewProviderWebviewMethods(source as never, {
      viewType: 'codegraphy.graphView',
      createHtml: vi.fn(() => '<html />'),
      resolveWebviewView: vi.fn(),
      openInEditor: vi.fn(),
      sendWebviewMessage,
      onWebviewMessage,
      setWebviewMessageListener: vi.fn(),
      executeCommand: vi.fn(() => Promise.resolve()),
      createPanel: vi.fn() as never,
    });
    const handler = vi.fn();

    methods._sendMessage({ type: 'PING' });
    methods.sendToWebview({ type: 'PONG' });
    const result = methods.onWebviewMessage(handler);

    expect(sendWebviewMessage).toHaveBeenNthCalledWith(
      1,
      [source._view],
      source._panels,
      { type: 'PING' },
    );
    expect(sendWebviewMessage).toHaveBeenNthCalledWith(
      2,
      [source._view],
      source._panels,
      { type: 'PONG' },
    );
    expect(onWebviewMessage).toHaveBeenCalledWith(source._view, handler);
    expect(notifyExtensionMessage).toHaveBeenNthCalledWith(1, { type: 'PING' });
    expect(notifyExtensionMessage).toHaveBeenNthCalledWith(2, { type: 'PONG' });
    expect(result).toBe(disposable);
  });

  it('delegates listener wiring and html generation helpers', () => {
    const setWebviewMessageListener = vi.fn();
    const createHtml = vi.fn(() => '<html />');
    const source = {
      _extensionUri: vscode.Uri.file('/test/extension'),
      _view: undefined,
      _panels: [],
      _analyzeAndSendData: vi.fn(async () => undefined),
      _getLocalResourceRoots: vi.fn(() => []),
    };
    const methods = createGraphViewProviderWebviewMethods(source as never, {
      viewType: 'codegraphy.graphView',
      createHtml,
      resolveWebviewView: vi.fn(),
      openInEditor: vi.fn(),
      sendWebviewMessage: vi.fn(),
      onWebviewMessage: vi.fn(() => ({ dispose: () => {} })),
      setWebviewMessageListener,
      executeCommand: vi.fn(() => Promise.resolve()),
      createPanel: vi.fn() as never,
    });
    const webview = { kind: 'webview' } as unknown as vscode.Webview;

    methods._setWebviewMessageListener(webview);
    const html = methods._getHtmlForWebview(webview);

    expect(setWebviewMessageListener).toHaveBeenCalledWith(webview, source);
    expect(createHtml).toHaveBeenCalledWith(source._extensionUri, webview);
    expect(html).toBe('<html />');
  });
});
