import { describe, expect, it, vi } from 'vitest';
import * as vscode from 'vscode';
import { createGraphViewProviderWebviewMethods } from '../../../../../src/extension/graphView/provider/webview/host';

describe('graphView/provider/webview/host', () => {
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

});
