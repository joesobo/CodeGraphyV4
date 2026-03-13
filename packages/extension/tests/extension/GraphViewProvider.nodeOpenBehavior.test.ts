import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as vscode from 'vscode';
import { GraphViewProvider } from '../../src/extension/GraphViewProvider';

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

    Object.defineProperty(vscode.workspace, 'workspaceFolders', {
      get: () => [{ uri: vscode.Uri.file('/test/workspace'), name: 'workspace', index: 0 }],
      configurable: true,
    });

    openTextDocumentMock = vi.fn().mockResolvedValue(mockDocument);
    showTextDocumentMock = vi.fn().mockResolvedValue(undefined);

    (vscode.workspace as Record<string, unknown>).openTextDocument = openTextDocumentMock;
    (vscode.window as Record<string, unknown>).showTextDocument = showTextDocumentMock;
    (vscode.workspace.fs as Record<string, unknown>).stat = vi.fn().mockResolvedValue({
      type: 1,
      ctime: 0,
      mtime: 0,
      size: 1,
    });
    (vscode.Uri as Record<string, unknown>).parse = vi.fn((value: string) => ({
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
      preserveFocus: true,
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
