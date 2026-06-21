import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as vscode from 'vscode';
import { GraphViewProvider } from '../../src/extension/graphViewProvider';

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

function resolveMessageHandler(provider: GraphViewProvider) {
  let messageHandler: ((message: unknown) => Promise<void>) | null = null;
  const postMessage = vi.fn();
  const mockWebview = {
    options: {},
    html: '',
    onDidReceiveMessage: vi.fn((handler: (message: unknown) => Promise<void>) => {
      messageHandler = handler;
      return { dispose: () => {} };
    }),
    postMessage,
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
  return { messageHandler: messageHandler!, postMessage };
}

describe('GraphViewProvider file info', () => {
  beforeEach(() => {
    workspaceFoldersValue = [
      { uri: vscode.Uri.file('/test/workspace'), name: 'workspace', index: 0 },
    ];
    vi.clearAllMocks();
  });

  it('reports connection counts and plugin names for GET_FILE_INFO', async () => {
    const context = createContext();
    const provider = new GraphViewProvider(
      vscode.Uri.file('/test/extension'),
      context as unknown as vscode.ExtensionContext
    );
    const { messageHandler, postMessage } = resolveMessageHandler(provider);

    provider.updateGraphData({
      nodes: [
        { id: 'src/main.py', label: 'main.py', color: '#ffffff' },
        { id: 'src/config.py', label: 'config.py', color: '#ffffff' },
        { id: 'src/input.py', label: 'input.py', color: '#ffffff' },
        { id: 'src/other.py', label: 'other.py', color: '#ffffff' },
      ],
      edges: [
        {
          id: 'src/main.py->src/config.py',
          from: 'src/main.py',
          to: 'src/config.py',
          kind: 'import',
          sources: [
            {
              id: 'codegraphy.vue:import',
              pluginId: 'codegraphy.vue',
              sourceId: 'import',
              label: 'Python import',
            },
          ],
        },
        { id: 'src/input.py->src/main.py', from: 'src/input.py', to: 'src/main.py' , kind: 'import', sources: [] },
        { id: 'src/main.py->src/other.py', from: 'src/main.py', to: 'src/other.py' , kind: 'import', sources: [] },
        { id: 'src/other.py->src/config.py', from: 'src/other.py', to: 'src/config.py' , kind: 'import', sources: [] },
      ],
    });

    const initialize = vi.fn().mockResolvedValue(undefined);
    (provider as unknown as {
      _analyzerInitialized: boolean;
      _analyzer: {
        initialize: () => Promise<void>;
        getPluginNameForFile: (filePath: string) => string;
        getPluginNamesForIds: (pluginIds: readonly string[]) => string[];
      };
    })._analyzerInitialized = false;
    (provider as unknown as {
      _analyzer: {
        initialize: () => Promise<void>;
        getPluginNameForFile: (filePath: string) => string;
        getPluginNamesForIds: (pluginIds: readonly string[]) => string[];
      };
    })._analyzer = {
      initialize,
      getPluginNameForFile: vi.fn(() => 'Python'),
      getPluginNamesForIds: vi.fn(() => ['Python']),
    };

    const mutableWorkspaceFs = vscode.workspace.fs as unknown as Record<string, unknown>;
    mutableWorkspaceFs.stat = vi.fn().mockResolvedValue({
      mtime: 123,
      size: 456,
    });

    await messageHandler({ type: 'GET_FILE_INFO', payload: { path: 'src/main.py' } });
    await new Promise((resolve) => setTimeout(resolve, 0));

    const fileInfoMessage = postMessage.mock.calls.find(
      (call: unknown[]) => (call[0] as { type?: string }).type === 'FILE_INFO'
    )?.[0] as { payload: Record<string, unknown> } | undefined;

    expect(initialize).toHaveBeenCalledTimes(1);
    expect(fileInfoMessage?.payload).toMatchObject({
      path: 'src/main.py',
      size: 456,
      lastModified: 123,
      incomingCount: 1,
      outgoingCount: 2,
      plugin: 'Python',
    });
    expect(fileInfoMessage?.payload).not.toHaveProperty('visits');
  });
});
