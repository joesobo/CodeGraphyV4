import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as vscode from 'vscode';
import { GraphViewProvider } from '../../src/extension/graphViewProvider';

type MessageHandler = (message: unknown) => Promise<void>;

function resolveMessageHandler(provider: GraphViewProvider): MessageHandler {
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
  return messageHandler!;
}

describe('GraphViewProvider node open behavior', () => {
  let provider: GraphViewProvider;
  let messageHandler: MessageHandler;
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
    messageHandler = resolveMessageHandler(provider);
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
      preserveFocus: false,
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
      preserveFocus: false,
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

  it('does not open folder nodes through preview or activation messages', async () => {
    const providerAny = provider as unknown as {
      _graphData: { nodes: Array<{ id: string; nodeType?: string }>; edges: unknown[] };
    };
    providerAny._graphData = {
      nodes: [{ id: 'src', nodeType: 'folder' }],
      edges: [],
    };

    await messageHandler({ type: 'NODE_SELECTED', payload: { nodeId: 'src' } });
    await messageHandler({ type: 'NODE_DOUBLE_CLICKED', payload: { nodeId: 'src' } });
    await new Promise(resolve => setTimeout(resolve, 0));

    expect(openTextDocumentMock).not.toHaveBeenCalled();
    expect(showTextDocumentMock).not.toHaveBeenCalled();
  });

  it('does not open package nodes through preview or activation messages', async () => {
    const providerAny = provider as unknown as {
      _graphData: { nodes: Array<{ id: string; nodeType?: string }>; edges: unknown[] };
    };
    providerAny._graphData = {
      nodes: [{ id: 'pkg:react', nodeType: 'package' }],
      edges: [],
    };

    await messageHandler({ type: 'NODE_SELECTED', payload: { nodeId: 'pkg:react' } });
    await messageHandler({ type: 'NODE_DOUBLE_CLICKED', payload: { nodeId: 'pkg:react' } });
    await new Promise(resolve => setTimeout(resolve, 0));

    expect(openTextDocumentMock).not.toHaveBeenCalled();
    expect(showTextDocumentMock).not.toHaveBeenCalled();
  });

  it('does not open inferred folder nodes when only file nodes exist in provider graph data', async () => {
    const providerAny = provider as unknown as {
      _graphData: { nodes: Array<{ id: string; nodeType?: string }>; edges: unknown[] };
    };
    providerAny._graphData = {
      nodes: [{ id: 'src/lib/app.ts', nodeType: 'file' }],
      edges: [],
    };

    await messageHandler({ type: 'NODE_SELECTED', payload: { nodeId: 'src/lib' } });
    await messageHandler({ type: 'NODE_DOUBLE_CLICKED', payload: { nodeId: 'src/lib' } });
    await new Promise(resolve => setTimeout(resolve, 0));

    expect(openTextDocumentMock).not.toHaveBeenCalled();
    expect(showTextDocumentMock).not.toHaveBeenCalled();
  });

  it('does not open inferred folder paths through OPEN_FILE messages', async () => {
    const providerAny = provider as unknown as {
      _graphData: { nodes: Array<{ id: string; nodeType?: string }>; edges: unknown[] };
    };
    providerAny._graphData = {
      nodes: [{ id: 'src/lib/app.ts', nodeType: 'file' }],
      edges: [],
    };

    await messageHandler({ type: 'OPEN_FILE', payload: { path: 'src/lib' } });
    await new Promise(resolve => setTimeout(resolve, 0));

    expect(openTextDocumentMock).not.toHaveBeenCalled();
    expect(showTextDocumentMock).not.toHaveBeenCalled();
  });
});
