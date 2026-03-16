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

function createContext(visits: Record<string, number> = {}) {
  return {
    subscriptions: [],
    extensionUri: vscode.Uri.file('/test/extension'),
    workspaceState: {
      get: vi.fn((key: string) => {
        if (key === 'codegraphy.fileVisits') {
          return visits;
        }
        return undefined;
      }),
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

describe('GraphViewProvider file info and visits', () => {
  beforeEach(() => {
    workspaceFoldersValue = [
      { uri: vscode.Uri.file('/test/workspace'), name: 'workspace', index: 0 },
    ];
    vi.clearAllMocks();
  });

  it('reports connection counts, visits, and plugin names for GET_FILE_INFO', async () => {
    const context = createContext({ 'src/main.py': 4 });
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
        { id: 'src/main.py->src/config.py', from: 'src/main.py', to: 'src/config.py' },
        { id: 'src/input.py->src/main.py', from: 'src/input.py', to: 'src/main.py' },
        { id: 'src/main.py->src/other.py', from: 'src/main.py', to: 'src/other.py' },
        { id: 'src/other.py->src/config.py', from: 'src/other.py', to: 'src/config.py' },
      ],
    });

    const initialize = vi.fn().mockResolvedValue(undefined);
    (provider as unknown as {
      _analyzerInitialized: boolean;
      _analyzer: {
        initialize: () => Promise<void>;
        getPluginNameForFile: (filePath: string) => string;
      };
    })._analyzerInitialized = false;
    (provider as unknown as {
      _analyzer: {
        initialize: () => Promise<void>;
        getPluginNameForFile: (filePath: string) => string;
      };
    })._analyzer = {
      initialize,
      getPluginNameForFile: vi.fn(() => 'Python'),
    };

    (vscode.workspace.fs as Record<string, unknown>).stat = vi.fn().mockResolvedValue({
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
      visits: 4,
    });
  });

  it('tracks file visits for visible graph nodes and sends access-count updates', async () => {
    const context = createContext({ 'src/main.py': 2 });
    const provider = new GraphViewProvider(
      vscode.Uri.file('/test/extension'),
      context as unknown as vscode.ExtensionContext
    );
    const sendMessageSpy = vi.spyOn(
      provider as unknown as { _sendMessage: (message: unknown) => void },
      '_sendMessage'
    ).mockImplementation(() => {});

    provider.updateGraphData({
      nodes: [
        { id: 'src/main.py', label: 'main.py', color: '#ffffff' },
        { id: 'src/other.py', label: 'other.py', color: '#ffffff' },
      ],
      edges: [],
    });

    await provider.trackFileVisit('src/main.py');

    expect(context.workspaceState.update).toHaveBeenCalledWith('codegraphy.fileVisits', {
      'src/main.py': 3,
    });
    expect(sendMessageSpy).toHaveBeenCalledWith({
      type: 'NODE_ACCESS_COUNT_UPDATED',
      payload: { nodeId: 'src/main.py', accessCount: 3 },
    });
  });

  it('ignores tracked file visits for nodes outside the current graph', async () => {
    const context = createContext({ 'src/main.py': 2 });
    const provider = new GraphViewProvider(
      vscode.Uri.file('/test/extension'),
      context as unknown as vscode.ExtensionContext
    );
    const sendMessageSpy = vi.spyOn(
      provider as unknown as { _sendMessage: (message: unknown) => void },
      '_sendMessage'
    ).mockImplementation(() => {});

    provider.updateGraphData({
      nodes: [{ id: 'src/other.py', label: 'other.py', color: '#ffffff' }],
      edges: [],
    });

    await provider.trackFileVisit('src/main.py');

    expect(context.workspaceState.update).not.toHaveBeenCalledWith(
      'codegraphy.fileVisits',
      expect.anything()
    );
    expect(sendMessageSpy).not.toHaveBeenCalledWith(
      expect.objectContaining({ type: 'NODE_ACCESS_COUNT_UPDATED' })
    );
  });
});
