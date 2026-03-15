import { describe, expect, it, vi } from 'vitest';
import * as vscode from 'vscode';
import { createGraphViewProviderWebviewMethods } from '../../../src/extension/graphView/providerWebviewMethods';

describe('graphView/providerWebviewMethods', () => {
  it('resolves the sidebar webview and delegates to the shared resolve helper', () => {
    const resolveWebviewView = vi.fn();
    const source = {
      _extensionUri: vscode.Uri.file('/test/extension'),
      _view: undefined,
      _panels: [],
      _analyzeAndSendData: vi.fn(async () => undefined),
      _getLocalResourceRoots: vi.fn(() => [vscode.Uri.file('/test/root')]),
    };
    const webviewView = { webview: {}, visible: true } as unknown as vscode.WebviewView;
    const methods = createGraphViewProviderWebviewMethods(source as never, {
      viewType: 'codegraphy.graphView',
      createHtml: vi.fn(() => '<html />'),
      resolveWebviewView,
      openInEditor: vi.fn(),
      sendWebviewMessage: vi.fn(),
      onWebviewMessage: vi.fn(() => ({ dispose: () => {} })),
      setWebviewMessageListener: vi.fn(),
      executeCommand: vi.fn(() => Promise.resolve()),
      createPanel: vi.fn() as never,
      log: vi.fn(),
    });

    methods.resolveWebviewView(
      webviewView,
      {} as vscode.WebviewViewResolveContext,
      {} as vscode.CancellationToken,
    );

    expect(source._view).toBe(webviewView);
    expect(resolveWebviewView).toHaveBeenCalledWith(
      webviewView,
      expect.objectContaining({
        getLocalResourceRoots: expect.any(Function),
        setWebviewMessageListener: expect.any(Function),
        getHtml: expect.any(Function),
        executeCommand: expect.any(Function),
        analyzeAndSendData: expect.any(Function),
        log: expect.any(Function),
      }),
    );
  });

  it('opens an editor panel and keeps panel registration in sync', () => {
    const panel = { id: 'panel-1' } as unknown as vscode.WebviewPanel;
    const openInEditor = vi.fn(options => {
      options.registerPanel(panel);
      options.unregisterPanel(panel);
    });
    const setWebviewMessageListener = vi.fn();
    const createHtml = vi.fn(() => '<html />');
    const source = {
      _extensionUri: vscode.Uri.file('/test/extension'),
      _view: undefined,
      _panels: [] as vscode.WebviewPanel[],
      _analyzeAndSendData: vi.fn(async () => undefined),
      _getLocalResourceRoots: vi.fn(() => [vscode.Uri.file('/test/root')]),
    };
    const methods = createGraphViewProviderWebviewMethods(source as never, {
      viewType: 'codegraphy.graphView',
      createHtml,
      resolveWebviewView: vi.fn(),
      openInEditor,
      sendWebviewMessage: vi.fn(),
      onWebviewMessage: vi.fn(() => ({ dispose: () => {} })),
      setWebviewMessageListener,
      executeCommand: vi.fn(() => Promise.resolve()),
      createPanel: vi.fn() as never,
      log: vi.fn(),
    });

    methods.openInEditor();

    expect(openInEditor).toHaveBeenCalledWith(
      expect.objectContaining({
        viewType: 'codegraphy.graphView',
        extensionUri: source._extensionUri,
        getLocalResourceRoots: expect.any(Function),
        createPanel: expect.any(Function),
        setWebviewMessageListener: expect.any(Function),
        getHtmlForWebview: expect.any(Function),
        registerPanel: expect.any(Function),
        unregisterPanel: expect.any(Function),
      }),
    );
    expect(setWebviewMessageListener).not.toHaveBeenCalled();
    expect(createHtml).not.toHaveBeenCalled();
    expect(source._panels).toEqual([]);
  });

  it('forwards direct webview messaging helpers', () => {
    const sendWebviewMessage = vi.fn();
    const disposable = { dispose: vi.fn() };
    const onWebviewMessage = vi.fn(() => disposable);
    const source = {
      _extensionUri: vscode.Uri.file('/test/extension'),
      _view: { kind: 'view' } as unknown as vscode.WebviewView,
      _panels: [{ kind: 'panel' } as unknown as vscode.WebviewPanel],
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
      log: vi.fn(),
    });
    const handler = vi.fn();

    methods._sendMessage({ type: 'PING' });
    methods.sendToWebview({ type: 'PONG' });
    const result = methods.onWebviewMessage(handler);

    expect(sendWebviewMessage).toHaveBeenNthCalledWith(
      1,
      source._view,
      source._panels,
      { type: 'PING' },
    );
    expect(sendWebviewMessage).toHaveBeenNthCalledWith(
      2,
      source._view,
      source._panels,
      { type: 'PONG' },
    );
    expect(onWebviewMessage).toHaveBeenCalledWith(source._view, handler);
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
      log: vi.fn(),
    });
    const webview = { kind: 'webview' } as unknown as vscode.Webview;

    methods._setWebviewMessageListener(webview);
    const html = methods._getHtmlForWebview(webview);

    expect(setWebviewMessageListener).toHaveBeenCalledWith(webview, source);
    expect(createHtml).toHaveBeenCalledWith(source._extensionUri, webview);
    expect(html).toBe('<html />');
  });
});
