import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as vscode from 'vscode';
import { GraphViewProvider } from '../../src/extension/graphViewProvider';

interface MockExtensionContext {
  subscriptions: { dispose: () => void }[];
  extensionUri: vscode.Uri;
  workspaceState: {
    get: <T>(key: string) => T | undefined;
    update: (key: string, value: unknown) => Thenable<void>;
  };
}

describe('GraphViewProvider settings persistence', () => {
  let workspaceStateGet: ReturnType<typeof vi.fn>;
  let workspaceStateUpdate: ReturnType<typeof vi.fn>;
  let configGet: ReturnType<typeof vi.fn>;
  let configInspect: ReturnType<typeof vi.fn>;
  let configUpdate: ReturnType<typeof vi.fn>;
  let mockContext: MockExtensionContext;

  beforeEach(() => {
    vi.clearAllMocks();

    workspaceStateGet = vi.fn(() => undefined);
    workspaceStateUpdate = vi.fn(() => Promise.resolve());
    configGet = vi.fn(<T>(_: string, defaultValue: T): T => defaultValue);
    configInspect = vi.fn(() => undefined);
    configUpdate = vi.fn(() => Promise.resolve());

    vi.mocked(vscode.workspace.getConfiguration).mockReturnValue({
      get: configGet,
      inspect: configInspect,
      update: configUpdate,
    } as unknown as vscode.WorkspaceConfiguration);

    Object.defineProperty(vscode.workspace, 'workspaceFolders', {
      get: () => [{ uri: vscode.Uri.file('/test/workspace'), name: 'workspace', index: 0 }],
      configurable: true,
    });

    mockContext = {
      subscriptions: [],
      extensionUri: vscode.Uri.file('/test/extension'),
      workspaceState: {
        get: workspaceStateGet,
        update: workspaceStateUpdate,
      },
    };
  });

  it('prefers repo-local disabled toggles over workspaceState', () => {
    const configuredPlugins = ['codegraphy.python'];
    const legacyWorkspacePlugins = ['legacy.plugin'];

    configGet.mockImplementation(<T>(key: string, defaultValue: T): T => {
      if (key === 'disabledPlugins') {
        return configuredPlugins as T;
      }

      return defaultValue;
    });
    configInspect.mockImplementation((key: string) => {
      if (key === 'disabledPlugins') {
        return { workspaceValue: configuredPlugins };
      }

      return undefined;
    });

    workspaceStateGet.mockImplementation((key: string) => {
      if (key === 'codegraphy.disabledPlugins') return legacyWorkspacePlugins;
      return undefined;
    });

    const provider = new GraphViewProvider(
      mockContext.extensionUri,
      mockContext as unknown as vscode.ExtensionContext
    );

    const providerState = provider as unknown as {
      _disabledPlugins: Set<string>;
    };

    expect([...providerState._disabledPlugins]).toEqual(configuredPlugins);
    expect([...providerState._disabledPlugins]).not.toEqual(legacyWorkspacePlugins);
  });

  it('persists edge visibility and plugin toggles to the repo settings store', async () => {
    const provider = new GraphViewProvider(
      mockContext.extensionUri,
      mockContext as unknown as vscode.ExtensionContext
    );

    let messageHandler: ((message: unknown) => Promise<void>) | null = null;
    const mockWebview = {
      options: {},
      html: '',
      onDidReceiveMessage: vi.fn((handler: (message: unknown) => Promise<void>) => {
        messageHandler = handler;
        return { dispose: () => {} };
      }),
      postMessage: vi.fn(),
      asWebviewUri: vi.fn((uri: vscode.Uri) => uri),
      cspSource: 'test-csp',
    };
    const mockView = {
      webview: mockWebview,
      visible: true,
      onDidChangeVisibility: vi.fn(() => ({ dispose: () => {} })),
      onDidDispose: vi.fn(() => ({ dispose: () => {} })),
      show: vi.fn(),
    };

    provider.resolveWebviewView(
      mockView as unknown as vscode.WebviewView,
      {} as vscode.WebviewViewResolveContext,
      { isCancellationRequested: false, onCancellationRequested: vi.fn() } as unknown as vscode.CancellationToken
    );

    expect(messageHandler).not.toBeNull();

    await messageHandler!({
      type: 'UPDATE_EDGE_VISIBILITY',
      payload: {
        edgeKind: 'IMPORTS',
        visible: false,
      },
    });
    await messageHandler!({
      type: 'TOGGLE_PLUGIN',
      payload: {
        pluginId: 'codegraphy.python',
        enabled: false,
      },
    });

    const edgeVisibilityUpdateCall = configUpdate.mock.calls.find(([key]) => key === 'edgeVisibility');
    const pluginsUpdateCall = configUpdate.mock.calls.find(([key]) => key === 'disabledPlugins');

    expect(edgeVisibilityUpdateCall).toBeDefined();
    expect(edgeVisibilityUpdateCall?.[1]).toEqual({ IMPORTS: false });
    expect(pluginsUpdateCall).toBeDefined();
    expect(pluginsUpdateCall?.[1]).toEqual(['codegraphy.python']);

    expect(
      workspaceStateUpdate.mock.calls.some(
        ([key]) => key === 'codegraphy.edgeVisibility' || key === 'codegraphy.disabledPlugins'
      )
    ).toBe(false);
  });
});
