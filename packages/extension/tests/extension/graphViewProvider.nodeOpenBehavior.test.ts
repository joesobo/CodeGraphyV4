import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as vscode from 'vscode';
import type { IGraphData } from '../../src/shared/graph/types';
import { GraphViewProvider } from '../../src/extension/graphViewProvider';

type MessageHandler = (message: unknown) => Promise<void>;

function resolveWebview(provider: GraphViewProvider): {
  messageHandler: MessageHandler;
  mockWebview: {
    postMessage: ReturnType<typeof vi.fn>;
  };
} {
  let messageHandler: MessageHandler | null = null;

  const mockWebview = {
    options: {},
    html: '',
    onDidReceiveMessage: vi.fn((handler: MessageHandler) => {
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
  return { messageHandler: messageHandler!, mockWebview };
}

describe('GraphViewProvider node open behavior', () => {
  let provider: GraphViewProvider;
  let messageHandler: MessageHandler;
  let mockWebview: { postMessage: ReturnType<typeof vi.fn> };
  let openTextDocumentMock: ReturnType<typeof vi.fn>;
  let showTextDocumentMock: ReturnType<typeof vi.fn>;
  const mockDocument = { uri: vscode.Uri.file('/test/workspace/src/app.ts') } as unknown as vscode.TextDocument;

  beforeEach(() => {
    vi.clearAllMocks();
    const mutableWorkspace = vscode.workspace as unknown as Record<string, unknown>;
    const mutableWindow = vscode.window as unknown as Record<string, unknown>;
    const mutableWorkspaceFs = vscode.workspace.fs as unknown as Record<string, unknown>;
    const mutableUri = vscode.Uri as unknown as Record<string, unknown>;

    Object.defineProperty(vscode.workspace, 'workspaceFolders', {
      get: () => [{ uri: vscode.Uri.file('/test/workspace'), name: 'workspace', index: 0 }],
      configurable: true,
    });

    openTextDocumentMock = vi.fn().mockResolvedValue(mockDocument);
    showTextDocumentMock = vi.fn().mockResolvedValue(undefined);

    mutableWorkspace.openTextDocument = openTextDocumentMock;
    mutableWindow.showTextDocument = showTextDocumentMock;
    mutableWorkspaceFs.stat = vi.fn().mockResolvedValue({
      type: 1,
      ctime: 0,
      mtime: 0,
      size: 1,
    });
    mutableUri.parse = vi.fn((value: string) => ({
      fsPath: value,
      path: value,
      toString: () => value,
    }));

    const mockContext = {
      subscriptions: [],
      extensionUri: vscode.Uri.file('/test/extension'),
      workspaceState: {
        get: () => undefined,
        update: () => Promise.resolve(),
      },
    };

    provider = new GraphViewProvider(
      mockContext.extensionUri,
      mockContext as unknown as vscode.ExtensionContext
    );
    ({ messageHandler, mockWebview } = resolveWebview(provider));
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('opens NODE_SELECTED as temporary preview in normal mode', async () => {
    await messageHandler({ type: 'NODE_SELECTED', payload: { nodeId: 'src/app.ts' } });
    await new Promise(resolve => setTimeout(resolve, 0));

    expect(openTextDocumentMock).toHaveBeenCalledWith({
      fsPath: '/test/workspace/src/app.ts',
      path: '/test/workspace/src/app.ts',
    });
    expect(showTextDocumentMock).toHaveBeenCalledWith(mockDocument, {
      preview: true,
      preserveFocus: true,
    });
  });

  it('posts filtered graph data and depth state after selecting a node in depth view', async () => {
    (provider as unknown as { _rawGraphData: IGraphData })._rawGraphData = {
      nodes: [
        { id: 'src/app.ts', label: 'app.ts', color: '#ffffff' },
        { id: 'src/lib.ts', label: 'lib.ts', color: '#ffffff' },
        { id: 'src/deep.ts', label: 'deep.ts', color: '#ffffff' },
      ],
      edges: [
        { id: 'src/app.ts->src/lib.ts', from: 'src/app.ts', to: 'src/lib.ts' },
        { id: 'src/lib.ts->src/deep.ts', from: 'src/lib.ts', to: 'src/deep.ts' },
      ],
    };

    await provider.changeView('codegraphy.depth-graph');
    mockWebview.postMessage.mockClear();
    await messageHandler({ type: 'NODE_SELECTED', payload: { nodeId: 'src/app.ts' } });
    await new Promise(resolve => setTimeout(resolve, 0));

    expect((provider as unknown as { _viewContext: { focusedFile?: string } })._viewContext.focusedFile).toBe(
      'src/app.ts',
    );
    expect(
      (provider as unknown as { _graphData: IGraphData })._graphData.nodes.map(
        (node: { id: string }) => node.id,
      ),
    ).toEqual(['src/app.ts', 'src/lib.ts']);

    const postedMessages = mockWebview.postMessage.mock.calls.map(([message]) => message);
    expect(postedMessages).toContainEqual({
      type: 'DEPTH_LIMIT_UPDATED',
      payload: { depthLimit: 1, maxDepthLimit: 2 },
    });
    expect(postedMessages).toContainEqual({
      type: 'GRAPH_DATA_UPDATED',
      payload: {
        nodes: [
          { id: 'src/app.ts', label: 'app.ts', color: '#ffffff', depthLevel: 0 },
          { id: 'src/lib.ts', label: 'lib.ts', color: '#ffffff', depthLevel: 1 },
        ],
        edges: [{ id: 'src/app.ts->src/lib.ts', from: 'src/app.ts', to: 'src/lib.ts' }],
      },
    });
  });

  it('opens NODE_DOUBLE_CLICKED as permanent in normal mode', async () => {
    await messageHandler({ type: 'NODE_DOUBLE_CLICKED', payload: { nodeId: 'src/app.ts' } });
    await new Promise(resolve => setTimeout(resolve, 0));

    expect(openTextDocumentMock).toHaveBeenCalledWith({
      fsPath: '/test/workspace/src/app.ts',
      path: '/test/workspace/src/app.ts',
    });
    expect(showTextDocumentMock).toHaveBeenCalledWith(mockDocument, {
      preview: false,
      preserveFocus: false,
    });
  });

  it('opens NODE_SELECTED as temporary preview in timeline mode', async () => {
    const providerAny = provider as unknown as { _timelineActive: boolean; _currentCommitSha?: string };
    providerAny._timelineActive = true;
    providerAny._currentCommitSha = 'abc123';

    await messageHandler({ type: 'NODE_SELECTED', payload: { nodeId: 'src/app.ts' } });
    await new Promise(resolve => setTimeout(resolve, 0));

    expect(openTextDocumentMock).toHaveBeenCalledTimes(1);
    const timelineUri = openTextDocumentMock.mock.calls[0][0] as { path: string };
    expect(timelineUri.path).toContain('git:/test/workspace/src/app.ts?');
    expect(timelineUri.path).toContain('"ref":"abc123"');
    expect(showTextDocumentMock).toHaveBeenCalledWith(mockDocument, {
      preview: true,
      preserveFocus: true,
    });
  });

  it('opens NODE_DOUBLE_CLICKED as permanent in timeline mode', async () => {
    const providerAny = provider as unknown as { _timelineActive: boolean; _currentCommitSha?: string };
    providerAny._timelineActive = true;
    providerAny._currentCommitSha = 'abc123';

    await messageHandler({ type: 'NODE_DOUBLE_CLICKED', payload: { nodeId: 'src/app.ts' } });
    await new Promise(resolve => setTimeout(resolve, 0));

    expect(openTextDocumentMock).toHaveBeenCalledTimes(1);
    const timelineUri = openTextDocumentMock.mock.calls[0][0] as { path: string };
    expect(timelineUri.path).toContain('git:/test/workspace/src/app.ts?');
    expect(timelineUri.path).toContain('"ref":"abc123"');
    expect(showTextDocumentMock).toHaveBeenCalledWith(mockDocument, {
      preview: false,
      preserveFocus: false,
    });
  });
});
