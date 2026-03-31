import { describe, expect, it, vi } from 'vitest';
import * as vscode from 'vscode';
import { createGraphViewProviderWebviewMethods } from '../../../../../src/extension/graphView/provider/webview/host';

describe('graphView/provider/webview/host', () => {
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

  it('exposes live resource, listener, and html callbacks to the sidebar resolver', () => {
    const resolveWebviewView = vi.fn();
    const setWebviewMessageListener = vi.fn();
    const createHtml = vi.fn(() => '<html />');
    const resourceRoots = [vscode.Uri.file('/test/root')];
    const source = {
      _extensionUri: vscode.Uri.file('/test/extension'),
      _view: undefined,
      _panels: [],
      _analyzeAndSendData: vi.fn(async () => undefined),
      _getLocalResourceRoots: vi.fn(() => resourceRoots),
    };
    const webviewView = { webview: {}, visible: true } as unknown as vscode.WebviewView;
    const methods = createGraphViewProviderWebviewMethods(source as never, {
      viewType: 'codegraphy.graphView',
      createHtml,
      resolveWebviewView,
      openInEditor: vi.fn(),
      sendWebviewMessage: vi.fn(),
      onWebviewMessage: vi.fn(() => ({ dispose: () => {} })),
      setWebviewMessageListener,
      executeCommand: vi.fn(() => Promise.resolve()),
      createPanel: vi.fn() as never,
      log: vi.fn(),
    });
    const nextWebview = { kind: 'next-webview' } as unknown as vscode.Webview;

    methods.resolveWebviewView(
      webviewView,
      {} as vscode.WebviewViewResolveContext,
      {} as vscode.CancellationToken,
    );

    const options = resolveWebviewView.mock.calls[0]?.[1] as {
      getLocalResourceRoots(): vscode.Uri[];
      setWebviewMessageListener(webview: vscode.Webview): void;
      getHtml(webview: vscode.Webview): string;
    };

    expect(options.getLocalResourceRoots()).toBe(resourceRoots);

    options.setWebviewMessageListener(nextWebview);
    expect(setWebviewMessageListener).toHaveBeenCalledWith(nextWebview, source);

    expect(options.getHtml(nextWebview)).toBe('<html />');
    expect(createHtml).toHaveBeenCalledWith(source._extensionUri, nextWebview);
  });

  it('exposes live command, settings-sync, analysis, and log callbacks to the sidebar resolver', async () => {
    const resolveWebviewView = vi.fn();
    const executeCommand = vi.fn(() => Promise.resolve('executed'));
    const log = vi.fn();
    const sendAllSettings = vi.fn();
    const analyzeAndSendData = vi.fn(async () => undefined);
    const source = {
      _extensionUri: vscode.Uri.file('/test/extension'),
      _view: undefined,
      _panels: [],
      _sendAllSettings: sendAllSettings,
      _analyzeAndSendData: analyzeAndSendData,
      _getLocalResourceRoots: vi.fn(() => []),
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
      executeCommand,
      createPanel: vi.fn() as never,
      log,
    });

    methods.resolveWebviewView(
      webviewView,
      {} as vscode.WebviewViewResolveContext,
      {} as vscode.CancellationToken,
    );

    const options = resolveWebviewView.mock.calls[0]?.[1] as {
      executeCommand(command: string, key: string, value: boolean): Promise<unknown>;
      sendAllSettings(): void;
      analyzeAndSendData(): Promise<void>;
      log(message: string): void;
    };

    await expect(options.executeCommand('setContext', 'codegraphy.graphViewVisible', true)).resolves.toBe(
      'executed',
    );
    options.sendAllSettings();
    await options.analyzeAndSendData();
    options.log('sidebar ready');

    expect(executeCommand).toHaveBeenCalledWith(
      'setContext',
      'codegraphy.graphViewVisible',
      true,
    );
    expect(sendAllSettings).toHaveBeenCalledOnce();
    expect(analyzeAndSendData).toHaveBeenCalledOnce();
    expect(log).toHaveBeenCalledWith('sidebar ready');
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

  it('exposes live panel and webview callbacks to the editor opener', () => {
    const panel = { id: 'panel-1' } as unknown as vscode.WebviewPanel;
    const webview = { kind: 'panel-webview' } as unknown as vscode.Webview;
    const openInEditor = vi.fn();
    const createPanel = vi.fn(() => panel);
    const setWebviewMessageListener = vi.fn();
    const createHtml = vi.fn(() => '<html />');
    const resourceRoots = [vscode.Uri.file('/test/root')];
    const source = {
      _extensionUri: vscode.Uri.file('/test/extension'),
      _view: undefined,
      _panels: [] as vscode.WebviewPanel[],
      _analyzeAndSendData: vi.fn(async () => undefined),
      _getLocalResourceRoots: vi.fn(() => resourceRoots),
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
      createPanel: createPanel as never,
      log: vi.fn(),
    });

    methods.openInEditor();

    const options = openInEditor.mock.calls[0]?.[0] as {
      getLocalResourceRoots(): vscode.Uri[];
      createPanel(
        viewType: string,
        title: string,
        column: vscode.ViewColumn,
        options: vscode.WebviewPanelOptions & vscode.WebviewOptions,
      ): vscode.WebviewPanel;
      setWebviewMessageListener(webview: vscode.Webview): void;
      getHtmlForWebview(webview: vscode.Webview): string;
    };

    expect(options.getLocalResourceRoots()).toBe(resourceRoots);
    expect(
      options.createPanel(
        'codegraphy.graphView',
        'CodeGraphy',
        vscode.ViewColumn.Beside,
        { enableScripts: true },
      ),
    ).toBe(panel);
    options.setWebviewMessageListener(webview);
    expect(options.getHtmlForWebview(webview)).toBe('<html />');

    expect(createPanel).toHaveBeenCalledWith(
      'codegraphy.graphView',
      'CodeGraphy',
      vscode.ViewColumn.Beside,
      { enableScripts: true },
    );
    expect(setWebviewMessageListener).toHaveBeenCalledWith(webview, source);
    expect(createHtml).toHaveBeenCalledWith(source._extensionUri, webview);
  });

  it('keeps panel registration state live across editor opener callbacks', () => {
    const openInEditor = vi.fn();
    const source = {
      _extensionUri: vscode.Uri.file('/test/extension'),
      _view: undefined,
      _panels: [] as vscode.WebviewPanel[],
      _analyzeAndSendData: vi.fn(async () => undefined),
      _getLocalResourceRoots: vi.fn(() => []),
    };
    const methods = createGraphViewProviderWebviewMethods(source as never, {
      viewType: 'codegraphy.graphView',
      createHtml: vi.fn(() => '<html />'),
      resolveWebviewView: vi.fn(),
      openInEditor,
      sendWebviewMessage: vi.fn(),
      onWebviewMessage: vi.fn(() => ({ dispose: () => {} })),
      setWebviewMessageListener: vi.fn(),
      executeCommand: vi.fn(() => Promise.resolve()),
      createPanel: vi.fn() as never,
      log: vi.fn(),
    });
    const panelA = { id: 'panel-a' } as unknown as vscode.WebviewPanel;
    const panelB = { id: 'panel-b' } as unknown as vscode.WebviewPanel;

    methods.openInEditor();

    const options = openInEditor.mock.calls[0]?.[0] as {
      registerPanel(panel: vscode.WebviewPanel): void;
      unregisterPanel(panel: vscode.WebviewPanel): void;
    };

    options.registerPanel(panelA);
    expect(source._panels).toEqual([panelA]);

    options.registerPanel(panelB);
    expect(source._panels).toEqual([panelA, panelB]);

    options.unregisterPanel(panelA);
    expect(source._panels).toEqual([panelB]);

    options.unregisterPanel(panelB);
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
