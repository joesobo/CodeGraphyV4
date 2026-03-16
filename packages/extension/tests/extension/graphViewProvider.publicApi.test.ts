import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as vscode from 'vscode';
import { GraphViewProvider } from '../../src/extension/GraphViewProvider';

let workspaceFoldersValue:
  | Array<{ uri: { fsPath: string; path: string }; name: string; index: number }>
  | undefined;

Object.defineProperty(vscode.workspace, 'workspaceFolders', {
  get: () => workspaceFoldersValue,
  configurable: true,
});

function createContext() {
  return {
    subscriptions: [],
    extensionUri: vscode.Uri.file('/test/extension'),
    workspaceState: {
      get: vi.fn(() => undefined),
      update: vi.fn(() => Promise.resolve()),
    },
  };
}

describe('GraphViewProvider public API', () => {
  beforeEach(() => {
    workspaceFoldersValue = [
      { uri: vscode.Uri.file('/test/workspace'), name: 'workspace', index: 0 },
    ];
    vi.clearAllMocks();
  });

  it('exposes the internal view registry through the public getter', () => {
    const provider = new GraphViewProvider(
      vscode.Uri.file('/test/extension'),
      createContext() as unknown as vscode.ExtensionContext
    );

    expect(provider.viewRegistry).toBe(
      (provider as unknown as { _viewRegistry: unknown })._viewRegistry
    );
  });

  it('updates and returns graph data through the public graph accessors', () => {
    const provider = new GraphViewProvider(
      vscode.Uri.file('/test/extension'),
      createContext() as unknown as vscode.ExtensionContext
    );
    const sendMessageSpy = vi.spyOn(
      provider as unknown as { _sendMessage: (message: unknown) => void },
      '_sendMessage'
    ).mockImplementation(() => {});
    const graphData = {
      nodes: [{ id: 'src/app.ts', label: 'app.ts', color: '#ffffff' }],
      edges: [],
    };

    provider.updateGraphData(graphData);

    expect(provider.getGraphData()).toEqual(graphData);
    expect(sendMessageSpy).toHaveBeenCalledWith({
      type: 'GRAPH_DATA_UPDATED',
      payload: graphData,
    });
  });

  it('refreshPhysicsSettings delegates to the physics message sender', () => {
    const provider = new GraphViewProvider(
      vscode.Uri.file('/test/extension'),
      createContext() as unknown as vscode.ExtensionContext
    );
    const sendPhysicsSpy = vi.spyOn(
      provider as unknown as { _sendPhysicsSettings: () => void },
      '_sendPhysicsSettings'
    ).mockImplementation(() => {});

    provider.refreshPhysicsSettings();

    expect(sendPhysicsSpy).toHaveBeenCalledTimes(1);
  });

  it('refreshSettings delegates to the settings message sender', () => {
    const provider = new GraphViewProvider(
      vscode.Uri.file('/test/extension'),
      createContext() as unknown as vscode.ExtensionContext
    );
    const sendSettingsSpy = vi.spyOn(
      provider as unknown as { _sendSettings: () => void },
      '_sendSettings'
    ).mockImplementation(() => {});

    provider.refreshSettings();

    expect(sendSettingsSpy).toHaveBeenCalledTimes(1);
  });

  it('re-analyzes when a resolved webview becomes visible', () => {
    const executeCommandMock = vi.fn(() => Promise.resolve());
    (vscode.commands as Record<string, unknown>).executeCommand = executeCommandMock;

    const provider = new GraphViewProvider(
      vscode.Uri.file('/test/extension'),
      createContext() as unknown as vscode.ExtensionContext
    );
    const analyzeSpy = vi.spyOn(
      provider as unknown as { _analyzeAndSendData: () => Promise<void> },
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
    visibilityHandler?.();

    expect(executeCommandMock).toHaveBeenCalledWith('setContext', 'codegraphy.viewVisible', true);
    expect(analyzeSpy).toHaveBeenCalledTimes(1);
  });

  it('does not re-analyze when a resolved webview stays hidden', () => {
    const executeCommandMock = vi.fn(() => Promise.resolve());
    (vscode.commands as Record<string, unknown>).executeCommand = executeCommandMock;

    const provider = new GraphViewProvider(
      vscode.Uri.file('/test/extension'),
      createContext() as unknown as vscode.ExtensionContext
    );
    const analyzeSpy = vi.spyOn(
      provider as unknown as { _analyzeAndSendData: () => Promise<void> },
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

  it('registers plugin commands through the shared command registrar', () => {
    const context = createContext();
    const disposable = { dispose: vi.fn() };
    const registerCommandMock = vi.fn(() => disposable);
    (vscode.commands as Record<string, unknown>).registerCommand = registerCommandMock;

    const provider = new GraphViewProvider(
      vscode.Uri.file('/test/extension'),
      context as unknown as vscode.ExtensionContext
    );

    provider.registerExternalPlugin({
      id: 'plugin.commands',
      name: 'Commands',
      version: '1.0.0',
      apiVersion: '^2.0.0',
      supportedExtensions: ['.ts'],
      detectConnections: async () => [],
      onLoad: (api: { registerCommand: (command: { id: string; action: () => void }) => void }) => {
        api.registerCommand({
          id: 'plugin.commands.run',
          action: vi.fn(),
        });
      },
    });

    expect(registerCommandMock).toHaveBeenCalledWith(
      'plugin.commands.run',
      expect.any(Function)
    );
    expect(context.subscriptions).toContain(disposable);
  });
});
