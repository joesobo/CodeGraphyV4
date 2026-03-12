/**
 * Tests for GraphViewProvider - specifically for bug fixes.
 * Bug #39: Rename dialog dismisses on mouse move
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as vscode from 'vscode';
import type { WorkspaceAnalyzer } from '../../src/extension/WorkspaceAnalyzer';
import type { IGraphData } from '../../src/shared/types';

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
    it('returns plugin default groups with isPluginDefault flag', async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const providerAny = provider as any;
      providerAny._userGroups = [];
      await providerAny._analyzer.initialize();

      const pluginGroups = providerAny._getPluginDefaultGroups() as Array<{ id: string; pattern: string; color: string; isPluginDefault?: boolean }>;
      expect(pluginGroups.length).toBeGreaterThan(0);
      expect(pluginGroups.some(g => g.id === 'plugin:codegraphy.typescript:*.ts' && g.color === '#3178C6')).toBe(true);
      expect(pluginGroups.some(g => g.id === 'plugin:codegraphy.python:*.py' && g.color === '#3776AB')).toBe(true);
      expect(pluginGroups.every(g => g.isPluginDefault === true)).toBe(true);
    });

    it('computeMergedGroups combines user groups with visible plugin defaults', async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const providerAny = provider as any;
      providerAny._userGroups = [
        { id: 'user-group-1', pattern: 'src/**', color: '#FF0000' },
      ];
      providerAny._hiddenPluginGroupIds = new Set<string>();
      await providerAny._analyzer.initialize();

      providerAny._computeMergedGroups();

      const groups = providerAny._groups as Array<{ id: string; pattern: string; color: string; isPluginDefault?: boolean }>;
      // User group should be preserved
      expect(groups.some(g => g.id === 'user-group-1')).toBe(true);
      // Plugin groups should be added
      expect(groups.some(g => g.id === 'plugin:codegraphy.typescript:*.ts')).toBe(true);
      // Stale plugin groups are not included (they come from _getPluginDefaultGroups fresh)
      expect(groups.some(g => g.id === 'plugin:codegraphy.typescript:.ts')).toBe(false);
    });

    it('computeMergedGroups marks disabled plugin groups but keeps them in list', async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const providerAny = provider as any;
      providerAny._userGroups = [];
      providerAny._hiddenPluginGroupIds = new Set(['plugin:codegraphy.typescript:*.ts']);
      await providerAny._analyzer.initialize();

      providerAny._computeMergedGroups();

      const groups = providerAny._groups as Array<{ id: string; disabled?: boolean }>;
      // Disabled groups are still present but marked
      const tsGroup = groups.find((g: { id: string }) => g.id === 'plugin:codegraphy.typescript:*.ts');
      expect(tsGroup).toBeDefined();
      expect(tsGroup!.disabled).toBe(true);
      // Other plugin groups should not be disabled
      const pyGroup = groups.find((g: { id: string }) => g.id === 'plugin:codegraphy.python:*.py');
      expect(pyGroup).toBeDefined();
      expect(pyGroup!.disabled).toBeUndefined();
    });

    it('computeMergedGroups includes built-in default groups', async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const providerAny = provider as any;
      providerAny._userGroups = [];
      providerAny._hiddenPluginGroupIds = new Set<string>();
      await providerAny._analyzer.initialize();

      providerAny._computeMergedGroups();

      const groups = providerAny._groups as Array<{ id: string; pluginName?: string; isPluginDefault?: boolean }>;
      // Built-in defaults should be present with "default:" prefix
      const jsonGroup = groups.find((g: { id: string }) => g.id === 'default:*.json');
      expect(jsonGroup).toBeDefined();
      expect(jsonGroup!.pluginName).toBe('CodeGraphy');
      expect(jsonGroup!.isPluginDefault).toBe(true);
      // Other built-in defaults
      expect(groups.some((g: { id: string }) => g.id === 'default:.gitignore')).toBe(true);
      expect(groups.some((g: { id: string }) => g.id === 'default:*.png')).toBe(true);
      expect(groups.some((g: { id: string }) => g.id === 'default:*.md')).toBe(true);
      expect(groups.some((g: { id: string }) => g.id === 'default:.vscode/settings.json')).toBe(true);
    });

    it('computeMergedGroups marks built-in defaults as disabled when section is disabled', async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const providerAny = provider as any;
      providerAny._userGroups = [];
      providerAny._hiddenPluginGroupIds = new Set(['default']);
      await providerAny._analyzer.initialize();

      providerAny._computeMergedGroups();

      const groups = providerAny._groups as Array<{ id: string; disabled?: boolean }>;
      const builtInGroups = groups.filter((g: { id: string }) => g.id.startsWith('default:'));
      expect(builtInGroups.length).toBeGreaterThan(0);
      for (const g of builtInGroups) {
        expect(g.disabled).toBe(true);
      }
    });

    it('getPluginDefaultGroups excludes disabled plugins', async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const providerAny = provider as any;
      providerAny._disabledPlugins = new Set(['codegraphy.typescript']);
      await providerAny._analyzer.initialize();

      const pluginGroups = providerAny._getPluginDefaultGroups() as Array<{ id: string }>;
      // TypeScript plugin groups should not appear
      expect(pluginGroups.some((g: { id: string }) => g.id.startsWith('plugin:codegraphy.typescript:'))).toBe(false);
      // Python plugin groups should still appear
      expect(pluginGroups.some((g: { id: string }) => g.id.startsWith('plugin:codegraphy.python:'))).toBe(true);

      // Clean up
      providerAny._disabledPlugins = new Set<string>();
    });
  });

  describe('TOGGLE_PLUGIN_GROUP_DISABLED and TOGGLE_PLUGIN_SECTION_DISABLED', () => {
    const createResolvedWebview = () => {
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

      return {
        mockWebview,
        getMessageHandler: () => {
          expect(messageHandler).not.toBeNull();
          return messageHandler!;
        },
      };
    };

    it('disables a plugin group when TOGGLE_PLUGIN_GROUP_DISABLED is received', async () => {
      const { getMessageHandler } = createResolvedWebview();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const providerAny = provider as any;
      providerAny._userGroups = [];
      providerAny._hiddenPluginGroupIds = new Set<string>();
      await providerAny._analyzer.initialize();

      const handler = getMessageHandler();
      await handler({ type: 'TOGGLE_PLUGIN_GROUP_DISABLED', payload: { groupId: 'plugin:codegraphy.typescript:*.ts', disabled: true } });

      expect(providerAny._hiddenPluginGroupIds.has('plugin:codegraphy.typescript:*.ts')).toBe(true);
      const groups = providerAny._groups as Array<{ id: string; disabled?: boolean }>;
      const tsGroup = groups.find((g: { id: string }) => g.id === 'plugin:codegraphy.typescript:*.ts');
      expect(tsGroup).toBeDefined();
      expect(tsGroup!.disabled).toBe(true);
    });

    it('re-enables a plugin group when TOGGLE_PLUGIN_GROUP_DISABLED is received with disabled=false', async () => {
      const { getMessageHandler } = createResolvedWebview();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const providerAny = provider as any;
      providerAny._userGroups = [];
      providerAny._hiddenPluginGroupIds = new Set(['plugin:codegraphy.typescript:*.ts']);
      await providerAny._analyzer.initialize();

      const handler = getMessageHandler();
      await handler({ type: 'TOGGLE_PLUGIN_GROUP_DISABLED', payload: { groupId: 'plugin:codegraphy.typescript:*.ts', disabled: false } });

      expect(providerAny._hiddenPluginGroupIds.has('plugin:codegraphy.typescript:*.ts')).toBe(false);
      const groups = providerAny._groups as Array<{ id: string; disabled?: boolean }>;
      const tsGroup = groups.find((g: { id: string }) => g.id === 'plugin:codegraphy.typescript:*.ts');
      expect(tsGroup).toBeDefined();
      expect(tsGroup!.disabled).toBeUndefined();
    });

    it('disables all groups in a plugin section with a single section-level entry', async () => {
      const { getMessageHandler } = createResolvedWebview();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const providerAny = provider as any;
      providerAny._userGroups = [];
      providerAny._hiddenPluginGroupIds = new Set<string>();
      await providerAny._analyzer.initialize();

      const handler = getMessageHandler();
      await handler({ type: 'TOGGLE_PLUGIN_SECTION_DISABLED', payload: { pluginId: 'codegraphy.typescript', disabled: true } });

      // Only the section key is stored, not individual group IDs
      expect(providerAny._hiddenPluginGroupIds.has('plugin:codegraphy.typescript')).toBe(true);
      expect(providerAny._hiddenPluginGroupIds.size).toBe(1);

      // All typescript plugin groups should be disabled via the section key
      const groups = providerAny._groups as Array<{ id: string; disabled?: boolean }>;
      const tsGroups = groups.filter((g: { id: string }) => g.id.startsWith('plugin:codegraphy.typescript:'));
      expect(tsGroups.length).toBeGreaterThan(0);
      for (const g of tsGroups) {
        expect(g.disabled).toBe(true);
      }
      // Python groups should not be disabled
      const pyGroup = groups.find((g: { id: string }) => g.id === 'plugin:codegraphy.python:*.py');
      expect(pyGroup?.disabled).toBeUndefined();
    });

    it('re-enabling a section also clears individual group entries under it', async () => {
      const { getMessageHandler } = createResolvedWebview();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const providerAny = provider as any;
      providerAny._userGroups = [];
      // Section key + one individual entry
      providerAny._hiddenPluginGroupIds = new Set([
        'plugin:codegraphy.typescript',
        'plugin:codegraphy.typescript:*.ts',
      ]);
      await providerAny._analyzer.initialize();

      const handler = getMessageHandler();
      await handler({ type: 'TOGGLE_PLUGIN_SECTION_DISABLED', payload: { pluginId: 'codegraphy.typescript', disabled: false } });

      // Both section key and individual entries should be cleared
      expect(providerAny._hiddenPluginGroupIds.size).toBe(0);
      const groups = providerAny._groups as Array<{ id: string; disabled?: boolean }>;
      const tsGroup = groups.find((g: { id: string }) => g.id === 'plugin:codegraphy.typescript:*.ts');
      expect(tsGroup?.disabled).toBeUndefined();
    });
  });

  describe('DAG mode', () => {
    const createResolvedWebview = () => {
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

      return {
        mockWebview,
        getMessageHandler: () => {
          expect(messageHandler).not.toBeNull();
          return messageHandler!;
        },
      };
    };

    it('sends DAG_MODE_UPDATED on WEBVIEW_READY', async () => {
      const { mockWebview, getMessageHandler } = createResolvedWebview();

      await getMessageHandler()({ type: 'WEBVIEW_READY', payload: null });
      await new Promise(resolve => setTimeout(resolve, 20));

      const dagModeCall = mockWebview.postMessage.mock.calls.find(
        (call: unknown[]) => (call[0] as { type?: string }).type === 'DAG_MODE_UPDATED'
      );
      expect(dagModeCall).toBeDefined();
      expect((dagModeCall[0] as { payload: { dagMode: unknown } }).payload.dagMode).toBeNull();
    });

    it('handles UPDATE_DAG_MODE and echoes back DAG_MODE_UPDATED', async () => {
      const { mockWebview, getMessageHandler } = createResolvedWebview();

      await getMessageHandler()({ type: 'WEBVIEW_READY', payload: null });
      await new Promise(resolve => setTimeout(resolve, 20));

      mockWebview.postMessage.mockClear();

      await getMessageHandler()({ type: 'UPDATE_DAG_MODE', payload: { dagMode: 'td' } });

      const dagModeCall = mockWebview.postMessage.mock.calls.find(
        (call: unknown[]) => (call[0] as { type?: string }).type === 'DAG_MODE_UPDATED'
      );
      expect(dagModeCall).toBeDefined();
      expect((dagModeCall[0] as { payload: { dagMode: string } }).payload.dagMode).toBe('td');
    });

    it('persists dagMode to workspace state on UPDATE_DAG_MODE', async () => {
      const updateSpy = vi.fn().mockResolvedValue(undefined);
      mockContext.workspaceState.update = updateSpy;

      // Re-create provider with spy-equipped context
      provider = new GraphViewProvider(
        mockContext.extensionUri,
        mockContext as unknown as vscode.ExtensionContext
      );

      const { getMessageHandler } = createResolvedWebview();

      await getMessageHandler()({ type: 'WEBVIEW_READY', payload: null });
      await new Promise(resolve => setTimeout(resolve, 20));

      await getMessageHandler()({ type: 'UPDATE_DAG_MODE', payload: { dagMode: 'lr' } });

      expect(updateSpy).toHaveBeenCalledWith('codegraphy.dagMode', 'lr');
    });
  });

  describe('plugin API v2 webview bridge', () => {
    const createResolvedWebview = () => {
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

      return {
        mockWebview,
        getMessageHandler: () => {
          expect(messageHandler).not.toBeNull();
          return messageHandler!;
        },
      };
    };

    it('routes plugin-scoped GRAPH_INTERACTION messages to onWebviewMessage handlers', async () => {
      const pluginWebviewHandler = vi.fn();
      const { getMessageHandler } = createResolvedWebview();

      provider.registerExternalPlugin({
        id: 'test.plugin',
        name: 'Test Plugin',
        version: '1.0.0',
        apiVersion: '^2.0.0',
        supportedExtensions: ['.ts'],
        detectConnections: async () => [],
        onLoad: (api: { onWebviewMessage: (handler: (msg: { type: string; data: unknown }) => void) => void }) => {
          api.onWebviewMessage(pluginWebviewHandler);
        },
      });

      await getMessageHandler()({
        type: 'GRAPH_INTERACTION',
        payload: {
          event: 'plugin:test.plugin:ping',
          data: { ok: true },
        },
      });

      expect(pluginWebviewHandler).toHaveBeenCalledWith({ type: 'ping', data: { ok: true } });
    });

    it('sends PLUGIN_WEBVIEW_INJECT when a plugin declares webviewContributions', async () => {
      const { mockWebview, getMessageHandler } = createResolvedWebview();

      provider.registerExternalPlugin({
        id: 'test.webview-plugin',
        name: 'Webview Plugin',
        version: '1.0.0',
        apiVersion: '^2.0.0',
        supportedExtensions: ['.ts'],
        detectConnections: async () => [],
        webviewContributions: {
          scripts: ['dist/webview/plugins/test-plugin.js'],
          styles: ['dist/webview/plugins/test-plugin.css'],
        },
      });

      await getMessageHandler()({ type: 'WEBVIEW_READY', payload: null });
      await new Promise(resolve => setTimeout(resolve, 20));

      const injectCall = mockWebview.postMessage.mock.calls.find(
        (call: unknown[]) => (call[0] as { type?: string }).type === 'PLUGIN_WEBVIEW_INJECT'
      );
      expect(injectCall).toBeDefined();
      expect(injectCall[0]).toMatchObject({
        type: 'PLUGIN_WEBVIEW_INJECT',
        payload: {
          pluginId: 'test.webview-plugin',
        },
      });
      expect((injectCall[0] as { payload: { scripts: string[] } }).payload.scripts[0]).toContain('test-plugin.js');
      expect((injectCall[0] as { payload: { styles: string[] } }).payload.styles[0]).toContain('test-plugin.css');
    });

    it('fires onWebviewReady once even if WEBVIEW_READY is received multiple times', async () => {
      const onWebviewReady = vi.fn();
      const { getMessageHandler } = createResolvedWebview();

      provider.registerExternalPlugin({
        id: 'test.webview-ready-once',
        name: 'Webview Ready Once',
        version: '1.0.0',
        apiVersion: '^2.0.0',
        supportedExtensions: ['.ts'],
        detectConnections: async () => [],
        onWebviewReady,
      });

      const handler = getMessageHandler();
      await handler({ type: 'WEBVIEW_READY', payload: null });
      await handler({ type: 'WEBVIEW_READY', payload: null });

      expect(onWebviewReady).toHaveBeenCalledTimes(1);
    });

    it('calls onWorkspaceReady before onWebviewReady on initial load', async () => {
      const onWorkspaceReady = vi.fn();
      const onWebviewReady = vi.fn();
      const { getMessageHandler } = createResolvedWebview();

      provider.registerExternalPlugin({
        id: 'test.initial-order',
        name: 'Initial Order',
        version: '1.0.0',
        apiVersion: '^2.0.0',
        supportedExtensions: ['.ts'],
        detectConnections: async () => [],
        onWorkspaceReady,
        onWebviewReady,
      });

      await getMessageHandler()({ type: 'WEBVIEW_READY', payload: null });
      await new Promise(resolve => setTimeout(resolve, 20));

      expect(onWorkspaceReady).toHaveBeenCalledTimes(1);
      expect(onWebviewReady).toHaveBeenCalledTimes(1);
      expect(onWorkspaceReady.mock.invocationCallOrder[0]).toBeLessThan(onWebviewReady.mock.invocationCallOrder[0]);
    });

    it('keeps workspace->webview lifecycle order for plugins registered during first analysis', async () => {
      const onWorkspaceReady = vi.fn();
      const onWebviewReady = vi.fn();
      const firstAnalyze = deferredPromise<IGraphData>();
      let analyzeCalls = 0;

      const analyzer = (provider as unknown as { _analyzer: WorkspaceAnalyzer })._analyzer;
      vi.spyOn(analyzer, 'analyze').mockImplementation(async () => {
        analyzeCalls += 1;
        if (analyzeCalls === 1) {
          return firstAnalyze.promise;
        }
        return { nodes: [], edges: [] };
      });
      const { getMessageHandler } = createResolvedWebview();

      const readyPromise = getMessageHandler()({ type: 'WEBVIEW_READY', payload: null });
      await new Promise(resolve => setTimeout(resolve, 0));

      provider.registerExternalPlugin({
        id: 'test.mid-first-analysis',
        name: 'Mid First Analysis',
        version: '1.0.0',
        apiVersion: '^2.0.0',
        supportedExtensions: ['.ts'],
        detectConnections: async () => [],
        onWorkspaceReady,
        onWebviewReady,
      });

      firstAnalyze.resolve({ nodes: [], edges: [] });
      await readyPromise;
      await new Promise(resolve => setTimeout(resolve, 20));

      expect(onWorkspaceReady).toHaveBeenCalledTimes(1);
      expect(onWebviewReady).toHaveBeenCalledTimes(1);
      expect(onWorkspaceReady.mock.invocationCallOrder[0]).toBeLessThan(onWebviewReady.mock.invocationCallOrder[0]);
    });

    it('replays workspace->webview lifecycle order for plugins registered after both phases', async () => {
      const onWorkspaceReady = vi.fn();
      const onWebviewReady = vi.fn();
      const { getMessageHandler } = createResolvedWebview();

      await getMessageHandler()({ type: 'WEBVIEW_READY', payload: null });
      await new Promise(resolve => setTimeout(resolve, 20));

      provider.registerExternalPlugin({
        id: 'test.late-both-order',
        name: 'Late Both Order',
        version: '1.0.0',
        apiVersion: '^2.0.0',
        supportedExtensions: ['.ts'],
        detectConnections: async () => [],
        onWorkspaceReady,
        onWebviewReady,
      });

      await new Promise(resolve => setTimeout(resolve, 20));

      expect(onWorkspaceReady).toHaveBeenCalledTimes(1);
      expect(onWebviewReady).toHaveBeenCalledTimes(1);
      expect(onWorkspaceReady.mock.invocationCallOrder[0]).toBeLessThan(onWebviewReady.mock.invocationCallOrder[0]);
    });

    it('replays late onWebviewReady after Tier-2 injection dispatch', async () => {
      const onWebviewReady = vi.fn();
      const initialize = vi.fn().mockResolvedValue(undefined);
      const { mockWebview, getMessageHandler } = createResolvedWebview();

      await getMessageHandler()({ type: 'WEBVIEW_READY', payload: null });
      await new Promise(resolve => setTimeout(resolve, 20));

      mockWebview.postMessage.mockClear();

      provider.registerExternalPlugin({
        id: 'test.late-webview-order',
        name: 'Late Webview Order',
        version: '1.0.0',
        apiVersion: '^2.0.0',
        supportedExtensions: ['.ts'],
        detectConnections: async () => [],
        initialize,
        onWebviewReady,
        webviewContributions: {
          scripts: ['dist/webview/plugins/late-order.js'],
        },
      });

      await new Promise(resolve => setTimeout(resolve, 20));

      const postedMessages = mockWebview.postMessage.mock.calls.map(
        (call: unknown[]) => call[0] as { type?: string; payload?: { pluginId?: string } }
      );
      const firstInjectIndex = postedMessages.findIndex(
        (msg) => msg.type === 'PLUGIN_WEBVIEW_INJECT' && msg.payload?.pluginId === 'test.late-webview-order'
      );
      expect(firstInjectIndex).toBeGreaterThanOrEqual(0);

      const injectOrder = mockWebview.postMessage.mock.invocationCallOrder[firstInjectIndex];
      expect(onWebviewReady).toHaveBeenCalledTimes(1);
      const onWebviewReadyOrder = onWebviewReady.mock.invocationCallOrder[0];
      expect(injectOrder).toBeLessThan(onWebviewReadyOrder);
      expect(initialize).toHaveBeenCalledTimes(1);
    });

    it('resolves Tier-2 relative assets against the registering extension root', async () => {
      const { mockWebview, getMessageHandler } = createResolvedWebview();

      provider.registerExternalPlugin(
        {
          id: 'test.external-webview-plugin',
          name: 'External Webview Plugin',
          version: '1.0.0',
          apiVersion: '^2.0.0',
          supportedExtensions: ['.ts'],
          detectConnections: async () => [],
          webviewContributions: {
            scripts: ['dist/webview/plugins/external.js'],
          },
        },
        {
          extensionUri: vscode.Uri.file('/test/external-extension'),
        }
      );

      await getMessageHandler()({ type: 'WEBVIEW_READY', payload: null });
      await new Promise(resolve => setTimeout(resolve, 20));

      const injectCall = mockWebview.postMessage.mock.calls.find(
        (call: unknown[]) => (call[0] as { type?: string }).type === 'PLUGIN_WEBVIEW_INJECT'
      );
      expect(injectCall).toBeDefined();

      const payload = (injectCall[0] as { payload: { scripts: string[] } }).payload;
      expect(payload.scripts[0]).toContain('/test/external-extension/dist/webview/plugins/external.js');

      const roots = (mockWebview.options as { localResourceRoots?: Array<{ path?: string; fsPath?: string }> }).localResourceRoots;
      expect(roots?.some((r) => r.fsPath === '/test/extension')).toBe(true);
      expect(roots?.some((r) => r.fsPath === '/test/external-extension')).toBe(true);
    });
  });
});
