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
});
