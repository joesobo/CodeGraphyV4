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
      flushPendingWorkspaceRefresh: vi.fn(),
    };
    const webviewView = {
      viewType: 'codegraphy.graphView',
      webview: {},
      visible: true,
      onDidChangeVisibility: vi.fn(() => ({ dispose: vi.fn() })),
      onDidDispose: vi.fn(() => ({ dispose: vi.fn() })),
    } as unknown as vscode.WebviewView;
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
      flushPendingWorkspaceRefresh: vi.fn(),
    };
    const webviewView = {
      viewType: 'codegraphy.graphView',
      webview: {},
      visible: true,
      onDidChangeVisibility: vi.fn(() => ({ dispose: vi.fn() })),
      onDidDispose: vi.fn(() => ({ dispose: vi.fn() })),
    } as unknown as vscode.WebviewView;
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

  it('exposes live command callbacks to the sidebar resolver', async () => {
    const resolveWebviewView = vi.fn();
    const executeCommand = vi.fn(() => Promise.resolve('executed'));
    const source = {
      _extensionUri: vscode.Uri.file('/test/extension'),
      _view: undefined,
      _panels: [],
      _sendAllSettings: vi.fn(),
      _analyzeAndSendData: vi.fn(async () => undefined),
      _getLocalResourceRoots: vi.fn(() => []),
      flushPendingWorkspaceRefresh: vi.fn(),
    };
    const webviewView = {
      viewType: 'codegraphy.graphView',
      webview: {},
      visible: true,
      onDidChangeVisibility: vi.fn(() => ({ dispose: vi.fn() })),
      onDidDispose: vi.fn(() => ({ dispose: vi.fn() })),
    } as unknown as vscode.WebviewView;
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
    });

    methods.resolveWebviewView(
      webviewView,
      {} as vscode.WebviewViewResolveContext,
      {} as vscode.CancellationToken,
    );

    const options = resolveWebviewView.mock.calls[0]?.[1] as {
      executeCommand(command: string, key: string, value: boolean): Promise<unknown>;
    };

    await expect(options.executeCommand('setContext', 'codegraphy.graphViewVisible', true)).resolves.toBe(
      'executed',
    );

    expect(executeCommand).toHaveBeenCalledWith(
      'setContext',
      'codegraphy.graphViewVisible',
      true,
    );
  });

});
