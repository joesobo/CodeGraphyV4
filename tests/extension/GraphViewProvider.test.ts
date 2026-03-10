/**
 * Tests for GraphViewProvider - specifically for bug fixes.
 * Bug #39: Rename dialog dismisses on mouse move
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as vscode from 'vscode';

// Capture showInputBox calls to verify options
interface InputBoxCall {
  options?: vscode.InputBoxOptions;
  resolveValue?: string;
}
const inputBoxCalls: InputBoxCall[] = [];

// Add showInputBox mock to vscode.window
(vscode.window as Record<string, unknown>).showInputBox = vi.fn(async (options?: vscode.InputBoxOptions) => {
  inputBoxCalls.push({ options });
  return undefined; // User cancelled
});

// Add showWarningMessage mock
(vscode.window as Record<string, unknown>).showWarningMessage = vi.fn();

// Add clipboard mock
(vscode.env as Record<string, unknown>) = {
  clipboard: {
    writeText: vi.fn(),
  },
};

// Mock workspace.fs methods
(vscode.workspace.fs as Record<string, unknown>).rename = vi.fn();
(vscode.workspace.fs as Record<string, unknown>).delete = vi.fn();
(vscode.workspace.fs as Record<string, unknown>).writeFile = vi.fn();

// Import after mocks are set up
import { GraphViewProvider } from '../../src/extension/GraphViewProvider';

function deferredPromise<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

describe('GraphViewProvider', () => {
  let provider: GraphViewProvider;
  let mockContext: {
    subscriptions: { dispose: () => void }[];
    extensionUri: vscode.Uri;
    workspaceState: {
      get: <T>(_key: string) => T | undefined;
      update: (_key: string, _value: unknown) => Thenable<void>;
    };
  };

  beforeEach(() => {
    inputBoxCalls.length = 0;
    vi.clearAllMocks();

    mockContext = {
      subscriptions: [],
      extensionUri: vscode.Uri.file('/test/extension'),
      workspaceState: {
        get: () => undefined,
        update: () => Promise.resolve(),
      },
    };

    // Mock workspace folders
    Object.defineProperty(vscode.workspace, 'workspaceFolders', {
      get: () => [{ uri: vscode.Uri.file('/test/workspace'), name: 'workspace', index: 0 }],
      configurable: true,
    });

    provider = new GraphViewProvider(
      mockContext.extensionUri,
      mockContext as unknown as vscode.ExtensionContext
    );
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Bug #83: Depth Graph view not working - dropdown switches back', () => {
    it('should send VIEWS_UPDATED when focused file changes', async () => {
      const mockWebview = {
        options: {},
        html: '',
        onDidReceiveMessage: vi.fn(() => ({ dispose: () => {} })),
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

      // Resolve the webview view
      provider.resolveWebviewView(
        mockView as unknown as vscode.WebviewView,
        {} as vscode.WebviewViewResolveContext,
        { isCancellationRequested: false, onCancellationRequested: vi.fn() } as unknown as vscode.CancellationToken
      );

      // Wait for initial messages
      await new Promise(resolve => setTimeout(resolve, 50));

      // Clear the mock to only track new calls
      mockWebview.postMessage.mockClear();

      // Set focused file (simulating user opening a file)
      provider.setFocusedFile('src/app.ts');

      // Should have sent VIEWS_UPDATED to inform webview that depth-graph is now available
      const viewsUpdatedCalls = mockWebview.postMessage.mock.calls.filter(
        (call: unknown[]) => (call[0] as { type: string }).type === 'VIEWS_UPDATED'
      );
      expect(viewsUpdatedCalls.length).toBe(1);
    });

    it('should send VIEWS_UPDATED when focused file is cleared', async () => {
      const mockWebview = {
        options: {},
        html: '',
        onDidReceiveMessage: vi.fn(() => ({ dispose: () => {} })),
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

      await new Promise(resolve => setTimeout(resolve, 50));

      // Set focused file first
      provider.setFocusedFile('src/app.ts');
      
      mockWebview.postMessage.mockClear();

      // Clear focused file (simulating user closing all editors)
      provider.setFocusedFile(undefined);

      // Should have sent VIEWS_UPDATED to inform webview that depth-graph is no longer available
      const viewsUpdatedCalls = mockWebview.postMessage.mock.calls.filter(
        (call: unknown[]) => (call[0] as { type: string }).type === 'VIEWS_UPDATED'
      );
      expect(viewsUpdatedCalls.length).toBe(1);
    });

    it('should not send VIEWS_UPDATED when focused file does not change', async () => {
      const mockWebview = {
        options: {},
        html: '',
        onDidReceiveMessage: vi.fn(() => ({ dispose: () => {} })),
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

      await new Promise(resolve => setTimeout(resolve, 50));

      // Set focused file
      provider.setFocusedFile('src/app.ts');
      
      mockWebview.postMessage.mockClear();

      // Set same focused file again (no change)
      provider.setFocusedFile('src/app.ts');

      // Should NOT have sent VIEWS_UPDATED since nothing changed
      const viewsUpdatedCalls = mockWebview.postMessage.mock.calls.filter(
        (call: unknown[]) => (call[0] as { type: string }).type === 'VIEWS_UPDATED'
      );
      expect(viewsUpdatedCalls.length).toBe(0);
    });
  });

  describe('Bug #39: Rename dialog dismisses on mouse move', () => {
    it('should use ignoreFocusOut: true in rename input box to prevent dismissal', async () => {
      // Store the message handler when it's registered
      let messageHandler: ((message: unknown) => void) | null = null;

      const mockWebview = {
        options: {},
        html: '',
        onDidReceiveMessage: vi.fn((handler: (message: unknown) => void) => {
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

      // Resolve the webview view
      provider.resolveWebviewView(
        mockView as unknown as vscode.WebviewView,
        {} as vscode.WebviewViewResolveContext,
        { isCancellationRequested: false, onCancellationRequested: vi.fn() } as unknown as vscode.CancellationToken
      );

      // Ensure handler was registered
      expect(messageHandler).not.toBeNull();

      // Trigger the RENAME_FILE message
      await messageHandler!({ type: 'RENAME_FILE', payload: { path: 'src/test.ts' } });

      // Wait a tick for async operations
      await new Promise(resolve => setTimeout(resolve, 10));

      // Verify showInputBox was called with ignoreFocusOut: true
      expect(inputBoxCalls.length).toBeGreaterThan(0);
      const renameCall = inputBoxCalls[0];
      expect(renameCall.options).toBeDefined();
      expect(renameCall.options!.ignoreFocusOut).toBe(true);
    });

    it('should use ignoreFocusOut: true in create file input box', async () => {
      let messageHandler: ((message: unknown) => void) | null = null;

      const mockWebview = {
        options: {},
        html: '',
        onDidReceiveMessage: vi.fn((handler: (message: unknown) => void) => {
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

      // Trigger the CREATE_FILE message
      await messageHandler!({ type: 'CREATE_FILE', payload: { directory: '.' } });

      await new Promise(resolve => setTimeout(resolve, 10));

      expect(inputBoxCalls.length).toBeGreaterThan(0);
      const createCall = inputBoxCalls[0];
      expect(createCall.options).toBeDefined();
      expect(createCall.options!.ignoreFocusOut).toBe(true);
    });
  });

  describe('analysis refresh behavior', () => {
    it('aborts in-flight analysis when a newer refresh starts', async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const providerAny = provider as any;
      const firstRun = deferredPromise<void>();
      const seenSignals: AbortSignal[] = [];

      providerAny._doAnalyzeAndSendData = vi.fn((signal: AbortSignal) => {
        seenSignals.push(signal);
        if (seenSignals.length === 1) {
          return firstRun.promise;
        }
        return Promise.resolve();
      });

      const refresh1 = provider.refresh();
      await Promise.resolve();

      const refresh2 = provider.refresh();
      await Promise.resolve();

      expect(seenSignals.length).toBe(2);
      expect(seenSignals[0].aborted).toBe(true);
      expect(seenSignals[1].aborted).toBe(false);

      firstRun.resolve();
      await Promise.all([refresh1, refresh2]);
    });
  });

  describe('file info payload', () => {
    it('includes plugin name in FILE_INFO payload', async () => {
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

      // Seed graph data so incoming/outgoing counts can be computed
      provider.updateGraphData({
        nodes: [
          { id: 'src/main.py', label: 'main.py', color: '#A1A1AA' },
          { id: 'src/config.py', label: 'config.py', color: '#A1A1AA' },
        ],
        edges: [{ id: 'src/main.py->src/config.py', from: 'src/main.py', to: 'src/config.py' }],
      });

      // Mock fs stat for file info response
      (vscode.workspace.fs.stat as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        mtime: Date.now(),
        size: 123,
      });

      expect(messageHandler).not.toBeNull();
      await messageHandler!({ type: 'GET_FILE_INFO', payload: { path: 'src/main.py' } });
      await new Promise(resolve => setTimeout(resolve, 10));

      const fileInfoCall = mockWebview.postMessage.mock.calls.find(
        (call: unknown[]) => (call[0] as { type?: string }).type === 'FILE_INFO'
      );
      expect(fileInfoCall).toBeDefined();
      expect(fileInfoCall[0]).toMatchObject({
        type: 'FILE_INFO',
        payload: {
          path: 'src/main.py',
          plugin: 'Python',
        },
      });
    });
  });

  describe('plugin fileColors defaults', () => {
    it('merges plugin fileColors into groups with deterministic IDs', async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const providerAny = provider as any;
      providerAny._groups = [];
      await providerAny._analyzer.initialize();

      const changed = providerAny._mergePluginFileColorGroups();
      expect(changed).toBe(true);

      const groups = providerAny._groups as Array<{ id: string; pattern: string; color: string }>;
      expect(groups.some(g => g.id === 'plugin:codegraphy.typescript:.ts' && g.color === '#3178C6')).toBe(true);
      expect(groups.some(g => g.id === 'plugin:codegraphy.python:.py' && g.color === '#3776AB')).toBe(true);
    });
  });
});
