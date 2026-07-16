import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createContext,
  GraphViewProvider,
  getGraphViewProviderInternals,
  resetGraphViewProviderPublicApi,
  vscode,
} from './graphViewProvider.publicApi.fixture';

describe('GraphViewProvider public API', () => {
  beforeEach(resetGraphViewProviderPublicApi);

  it('openInEditor creates and initializes an editor panel', () => {
    const provider = new GraphViewProvider(
      vscode.Uri.file('/test/extension'),
      createContext() as unknown as vscode.ExtensionContext
    );
    const createWebviewPanelMock = vi.fn(() => ({
      webview: {
        html: '',
        onDidReceiveMessage: vi.fn(() => ({ dispose: () => {} })),
        asWebviewUri: vi.fn((uri: vscode.Uri) => uri),
        cspSource: 'test-csp',
      },
      onDidDispose: vi.fn(() => ({ dispose: () => {} })),
      reveal: vi.fn(),
      dispose: vi.fn(),
      title: 'CodeGraphy',
      viewColumn: vscode.ViewColumn.Active,
    }));
    (vscode.window as Record<string, unknown>).createWebviewPanel = createWebviewPanelMock;

    provider.openInEditor();

    expect(createWebviewPanelMock).toHaveBeenCalledWith(
      'codegraphy.graphView',
      'CodeGraphy',
      vscode.ViewColumn.Beside,
      expect.objectContaining({
        enableScripts: true,
        localResourceRoots: expect.arrayContaining([
          expect.objectContaining({ fsPath: '/test/extension' }),
          expect.objectContaining({ fsPath: '/test/workspace' }),
        ]),
        retainContextWhenHidden: true,
      })
    );
  });

  it('sendToWebview delegates the payload to the webview method container', () => {
    const provider = new GraphViewProvider(
      vscode.Uri.file('/test/extension'),
      createContext() as unknown as vscode.ExtensionContext
    );
    const internals = getGraphViewProviderInternals(provider);
    const sendToWebviewSpy = vi.spyOn(internals._webviewMethods, 'sendToWebview');
    const message = { type: 'PING', payload: { nodeId: 'src/app.ts' } };

    provider.sendToWebview(message);

    expect(sendToWebviewSpy).toHaveBeenCalledWith(message);
  });

  it('onWebviewMessage delegates handler registration to the webview method container', () => {
    const provider = new GraphViewProvider(
      vscode.Uri.file('/test/extension'),
      createContext() as unknown as vscode.ExtensionContext
    );
    const internals = getGraphViewProviderInternals(provider);
    const handler = vi.fn();
    const disposable = { dispose: vi.fn() };
    const onWebviewMessageSpy = vi
      .spyOn(internals._webviewMethods, 'onWebviewMessage')
      .mockReturnValue(disposable as unknown as vscode.Disposable);

    const result = provider.onWebviewMessage(handler);

    expect(onWebviewMessageSpy).toHaveBeenCalledWith(handler);
    expect(result).toBe(disposable);
  });

  it('does not re-analyze when a resolved webview becomes visible again', () => {
    const executeCommandMock = vi.fn(() => Promise.resolve());
    (vscode.commands as Record<string, unknown>).executeCommand = executeCommandMock;

    const provider = new GraphViewProvider(
      vscode.Uri.file('/test/extension'),
      createContext() as unknown as vscode.ExtensionContext
    );
    const internals = getGraphViewProviderInternals(provider);
    const analyzeSpy = vi.spyOn(
      internals._analysisMethods,
      '_analyzeAndSendData'
    ).mockResolvedValue();

    let visibilityHandler: (() => void) | undefined;
    const mockView = {
      webview: {
        options: {},
        html: '',
        onDidReceiveMessage: vi.fn(() => ({ dispose: () => {} })),
        postMessage: vi.fn(),
        asWebviewUri: vi.fn((uri: vscode.Uri) => uri),
        cspSource: 'test-csp',
      },
      visible: true,
      onDidChangeVisibility: vi.fn((handler: () => void) => {
        visibilityHandler = handler;
        return { dispose: () => {} };
      }),
      onDidDispose: vi.fn(() => ({ dispose: () => {} })),
      show: vi.fn(),
    };

    provider.resolveWebviewView(
      mockView as unknown as vscode.WebviewView,
      {} as vscode.WebviewViewResolveContext,
      { isCancellationRequested: false, onCancellationRequested: vi.fn() } as unknown as vscode.CancellationToken
    );

    expect(mockView.webview.html).toContain('<div id="root"></div>');
    expect(mockView.webview.options).toEqual(
      expect.objectContaining({
        retainContextWhenHidden: true,
      }),
    );
    visibilityHandler?.();

    expect(executeCommandMock).toHaveBeenCalledWith('setContext', 'codegraphy.viewVisible', true);
    expect(analyzeSpy).not.toHaveBeenCalled();
  });

  it('does not re-analyze when a resolved webview stays hidden', () => {
    const executeCommandMock = vi.fn(() => Promise.resolve());
    (vscode.commands as Record<string, unknown>).executeCommand = executeCommandMock;

    const provider = new GraphViewProvider(
      vscode.Uri.file('/test/extension'),
      createContext() as unknown as vscode.ExtensionContext
    );
    const internals = getGraphViewProviderInternals(provider);
    const analyzeSpy = vi.spyOn(
      internals._analysisMethods,
      '_analyzeAndSendData'
    ).mockResolvedValue();

    let visibilityHandler: (() => void) | undefined;
    const mockView = {
      webview: {
        options: {},
        html: '',
        onDidReceiveMessage: vi.fn(() => ({ dispose: () => {} })),
        postMessage: vi.fn(),
        asWebviewUri: vi.fn((uri: vscode.Uri) => uri),
        cspSource: 'test-csp',
      },
      visible: false,
      onDidChangeVisibility: vi.fn((handler: () => void) => {
        visibilityHandler = handler;
        return { dispose: () => {} };
      }),
      onDidDispose: vi.fn(() => ({ dispose: () => {} })),
      show: vi.fn(),
    };

    provider.resolveWebviewView(
      mockView as unknown as vscode.WebviewView,
      {} as vscode.WebviewViewResolveContext,
      { isCancellationRequested: false, onCancellationRequested: vi.fn() } as unknown as vscode.CancellationToken
    );

    visibilityHandler?.();

    expect(executeCommandMock).toHaveBeenCalledWith('setContext', 'codegraphy.viewVisible', false);
    expect(analyzeSpy).not.toHaveBeenCalled();
  });

});
