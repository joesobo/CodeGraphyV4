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

interface MockConfigInspect<T> {
  workspaceValue?: T;
  globalValue?: T;
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

  it('prefers disabled toggles from VS Code settings over workspaceState', () => {
    const configuredRules = ['codegraphy.typescript:dynamic-import'];
    const configuredPlugins = ['codegraphy.python'];
    const legacyWorkspaceRules = ['legacy:rule'];
    const legacyWorkspacePlugins = ['legacy.plugin'];

    configInspect.mockImplementation((key: string) => {
      if (key === 'disabledRules') {
        return { workspaceValue: configuredRules } satisfies MockConfigInspect<string[]>;
      }
      if (key === 'disabledPlugins') {
        return { workspaceValue: configuredPlugins } satisfies MockConfigInspect<string[]>;
      }
      return undefined;
    });

    workspaceStateGet.mockImplementation((key: string) => {
      if (key === 'codegraphy.disabledRules') return legacyWorkspaceRules;
      if (key === 'codegraphy.disabledPlugins') return legacyWorkspacePlugins;
      return undefined;
    });

    const provider = new GraphViewProvider(
      mockContext.extensionUri,
      mockContext as unknown as vscode.ExtensionContext
    );

    const providerState = provider as unknown as {
      _disabledRules: Set<string>;
      _disabledPlugins: Set<string>;
    };

    expect([...providerState._disabledRules]).toEqual(configuredRules);
    expect([...providerState._disabledPlugins]).toEqual(configuredPlugins);
    expect([...providerState._disabledRules]).not.toEqual(legacyWorkspaceRules);
    expect([...providerState._disabledPlugins]).not.toEqual(legacyWorkspacePlugins);
  });

  it('persists TOGGLE_RULE and TOGGLE_PLUGIN changes to VS Code settings', async () => {
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
      type: 'TOGGLE_RULE',
      payload: {
        qualifiedId: 'codegraphy.typescript:dynamic-import',
        enabled: false,
      },
    });
    await messageHandler!({
      type: 'TOGGLE_PLUGIN',
      payload: {
        pluginId: 'codegraphy.python',
        enabled: false,
      },
    });

    const rulesUpdateCall = configUpdate.mock.calls.find(([key]) => key === 'disabledRules');
    const pluginsUpdateCall = configUpdate.mock.calls.find(([key]) => key === 'disabledPlugins');

    expect(rulesUpdateCall).toBeDefined();
    expect(rulesUpdateCall?.[1]).toEqual(['codegraphy.typescript:dynamic-import']);
    expect(pluginsUpdateCall).toBeDefined();
    expect(pluginsUpdateCall?.[1]).toEqual(['codegraphy.python']);

    expect(
      workspaceStateUpdate.mock.calls.some(
        ([key]) => key === 'codegraphy.disabledRules' || key === 'codegraphy.disabledPlugins'
      )
    ).toBe(false);
  });
});
