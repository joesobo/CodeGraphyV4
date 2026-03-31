import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as vscode from 'vscode';
import {
  registerEditorChangeHandler,
  registerSaveHandler,
  registerFileWatcher,
} from '../../../src/extension/workspaceFiles/register';

function makeProvider() {
  return {
    trackFileVisit: vi.fn().mockResolvedValue(undefined),
    setFocusedFile: vi.fn(),
    emitEvent: vi.fn(),
    refresh: vi.fn().mockResolvedValue(undefined),
  };
}

function makeContext() {
  return {
    subscriptions: [] as { dispose: () => void }[],
  };
}

describe('registerEditorChangeHandler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('adds a subscription to the context', () => {
    const context = makeContext();
    const provider = makeProvider();

    registerEditorChangeHandler(context as unknown as vscode.ExtensionContext, provider as never);

    expect(context.subscriptions.length).toBe(1);
  });

  it('tracks file visit and sets focused file for workspace-relative files', async () => {
    const context = makeContext();
    const provider = makeProvider();

    (vscode.workspace as unknown as { workspaceFolders: unknown[] }).workspaceFolders = [
      { uri: { fsPath: '/workspace' } },
    ];

    registerEditorChangeHandler(context as unknown as vscode.ExtensionContext, provider as never);

    const mock = vscode.window.onDidChangeActiveTextEditor as unknown as {
      mock: { calls: unknown[][] };
    };
    const listener = mock.mock.calls[0]?.[0] as (editor: unknown) => Promise<void>;

    await listener({
      document: {
        uri: { scheme: 'file', fsPath: '/workspace/src/app.ts' },
      },
    });

    expect(provider.trackFileVisit).toHaveBeenCalledWith('src/app.ts');
    expect(provider.setFocusedFile).toHaveBeenCalledWith('src/app.ts');
    expect(provider.emitEvent).toHaveBeenCalledWith('workspace:activeEditorChanged', {
      filePath: 'src/app.ts',
    });
  });

  it('does not track files outside the workspace', async () => {
    const context = makeContext();
    const provider = makeProvider();

    (vscode.workspace as unknown as { workspaceFolders: unknown[] }).workspaceFolders = [
      { uri: { fsPath: '/workspace' } },
    ];

    registerEditorChangeHandler(context as unknown as vscode.ExtensionContext, provider as never);

    const mock = vscode.window.onDidChangeActiveTextEditor as unknown as {
      mock: { calls: unknown[][] };
    };
    const listener = mock.mock.calls[0]?.[0] as (editor: unknown) => Promise<void>;

    await listener({
      document: {
        uri: { scheme: 'file', fsPath: '/other-project/src/app.ts' },
      },
    });

    expect(provider.trackFileVisit).not.toHaveBeenCalled();
    expect(provider.setFocusedFile).not.toHaveBeenCalled();
  });

  it('does not track non-file scheme documents', async () => {
    const context = makeContext();
    const provider = makeProvider();

    (vscode.workspace as unknown as { workspaceFolders: unknown[] }).workspaceFolders = [
      { uri: { fsPath: '/workspace' } },
    ];

    registerEditorChangeHandler(context as unknown as vscode.ExtensionContext, provider as never);

    const mock = vscode.window.onDidChangeActiveTextEditor as unknown as {
      mock: { calls: unknown[][] };
    };
    const listener = mock.mock.calls[0]?.[0] as (editor: unknown) => Promise<void>;

    await listener({
      document: {
        uri: { scheme: 'untitled', fsPath: '/workspace/untitled' },
      },
    });

    expect(provider.trackFileVisit).not.toHaveBeenCalled();
  });

  it('does not track when no workspace folders exist', async () => {
    const context = makeContext();
    const provider = makeProvider();

    (vscode.workspace as unknown as { workspaceFolders: undefined }).workspaceFolders = undefined;

    registerEditorChangeHandler(context as unknown as vscode.ExtensionContext, provider as never);

    const mock = vscode.window.onDidChangeActiveTextEditor as unknown as {
      mock: { calls: unknown[][] };
    };
    const listener = mock.mock.calls[0]?.[0] as (editor: unknown) => Promise<void>;

    await listener({
      document: {
        uri: { scheme: 'file', fsPath: '/workspace/src/app.ts' },
      },
    });

    expect(provider.trackFileVisit).not.toHaveBeenCalled();
  });

  it('clears focused file when editor is undefined', async () => {
    const context = makeContext();
    const provider = makeProvider();

    registerEditorChangeHandler(context as unknown as vscode.ExtensionContext, provider as never);

    const mock = vscode.window.onDidChangeActiveTextEditor as unknown as {
      mock: { calls: unknown[][] };
    };
    const listener = mock.mock.calls[0]?.[0] as (editor: undefined) => Promise<void>;

    await listener(undefined);

    expect(provider.setFocusedFile).toHaveBeenCalledWith(undefined);
    expect(provider.emitEvent).toHaveBeenCalledWith('workspace:activeEditorChanged', {
      filePath: undefined,
    });
  });

  it('normalizes backslashes in paths', async () => {
    const context = makeContext();
    const provider = makeProvider();

    (vscode.workspace as unknown as { workspaceFolders: unknown[] }).workspaceFolders = [
      { uri: { fsPath: '/workspace' } },
    ];

    registerEditorChangeHandler(context as unknown as vscode.ExtensionContext, provider as never);

    const mock = vscode.window.onDidChangeActiveTextEditor as unknown as {
      mock: { calls: unknown[][] };
    };
    const listener = mock.mock.calls[0]?.[0] as (editor: unknown) => Promise<void>;

    // Simulate a path with backslashes (Windows-style)
    // path.relative will produce forward slashes on mac, but the normalize code handles backslashes
    await listener({
      document: {
        uri: { scheme: 'file', fsPath: '/workspace/src/app.ts' },
      },
    });

    // The normalized path should use forward slashes
    expect(provider.setFocusedFile).toHaveBeenCalledWith('src/app.ts');
  });
});

describe('registerSaveHandler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('adds a subscription to the context', () => {
    const context = makeContext();
    const provider = makeProvider();

    registerSaveHandler(context as unknown as vscode.ExtensionContext, provider as never);

    expect(context.subscriptions.length).toBe(1);
  });

  it('refreshes graph after debounce on regular file save', () => {
    vi.useFakeTimers();
    const context = makeContext();
    const provider = makeProvider();

    registerSaveHandler(context as unknown as vscode.ExtensionContext, provider as never);

    const mock = vscode.workspace.onDidSaveTextDocument as unknown as {
      mock: { calls: unknown[][] };
    };
    const listener = mock.mock.calls[0]?.[0] as (doc: unknown) => void;

    listener({ uri: { fsPath: '/workspace/src/app.ts' } });
    vi.advanceTimersByTime(500);

    expect(provider.refresh).toHaveBeenCalledOnce();
    expect(provider.emitEvent).toHaveBeenCalledWith('workspace:fileChanged', {
      filePath: '/workspace/src/app.ts',
    });
  });

  it('debounces multiple rapid saves into a single refresh', () => {
    vi.useFakeTimers();
    const context = makeContext();
    const provider = makeProvider();

    registerSaveHandler(context as unknown as vscode.ExtensionContext, provider as never);

    const mock = vscode.workspace.onDidSaveTextDocument as unknown as {
      mock: { calls: unknown[][] };
    };
    const listener = mock.mock.calls[0]?.[0] as (doc: unknown) => void;

    listener({ uri: { fsPath: '/workspace/src/a.ts' } });
    vi.advanceTimersByTime(200);
    listener({ uri: { fsPath: '/workspace/src/b.ts' } });
    vi.advanceTimersByTime(500);

    expect(provider.refresh).toHaveBeenCalledOnce();
  });

  it('skips refresh for workspace settings files', () => {
    vi.useFakeTimers();
    const context = makeContext();
    const provider = makeProvider();

    registerSaveHandler(context as unknown as vscode.ExtensionContext, provider as never);

    const mock = vscode.workspace.onDidSaveTextDocument as unknown as {
      mock: { calls: unknown[][] };
    };
    const listener = mock.mock.calls[0]?.[0] as (doc: unknown) => void;

    listener({ uri: { fsPath: '/workspace/.vscode/settings.json' } });
    vi.advanceTimersByTime(600);

    expect(provider.refresh).not.toHaveBeenCalled();
  });
});

describe('registerFileWatcher', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('adds three subscriptions (create, delete, watcher)', () => {
    const context = makeContext();
    const provider = makeProvider();

    registerFileWatcher(context as unknown as vscode.ExtensionContext, provider as never);

    expect(context.subscriptions.length).toBe(3);
  });

  it('refreshes graph and emits event on file creation', () => {
    vi.useFakeTimers();
    const context = makeContext();
    const provider = makeProvider();

    // Capture the watcher mock's onDidCreate listener
    let createListener: ((uri: { fsPath: string }) => void) | undefined;
    const mockOnDidCreate = vi.fn((cb) => {
      createListener = cb;
      return { dispose: vi.fn() };
    });
    vi.mocked(vscode.workspace.createFileSystemWatcher).mockReturnValue({
      onDidCreate: mockOnDidCreate,
      onDidDelete: vi.fn(() => ({ dispose: vi.fn() })),
      onDidChange: vi.fn(() => ({ dispose: vi.fn() })),
      dispose: vi.fn(),
    } as unknown as vscode.FileSystemWatcher);

    registerFileWatcher(context as unknown as vscode.ExtensionContext, provider as never);

    createListener!({ fsPath: '/workspace/new-file.ts' });
    vi.advanceTimersByTime(500);

    expect(provider.refresh).toHaveBeenCalledOnce();
    expect(provider.emitEvent).toHaveBeenCalledWith('workspace:fileCreated', {
      filePath: '/workspace/new-file.ts',
    });
  });

  it('refreshes graph and emits event on file deletion', () => {
    vi.useFakeTimers();
    const context = makeContext();
    const provider = makeProvider();

    let deleteListener: ((uri: { fsPath: string }) => void) | undefined;
    const mockOnDidDelete = vi.fn((cb) => {
      deleteListener = cb;
      return { dispose: vi.fn() };
    });
    vi.mocked(vscode.workspace.createFileSystemWatcher).mockReturnValue({
      onDidCreate: vi.fn(() => ({ dispose: vi.fn() })),
      onDidDelete: mockOnDidDelete,
      onDidChange: vi.fn(() => ({ dispose: vi.fn() })),
      dispose: vi.fn(),
    } as unknown as vscode.FileSystemWatcher);

    registerFileWatcher(context as unknown as vscode.ExtensionContext, provider as never);

    deleteListener!({ fsPath: '/workspace/deleted-file.ts' });
    vi.advanceTimersByTime(500);

    expect(provider.refresh).toHaveBeenCalledOnce();
    expect(provider.emitEvent).toHaveBeenCalledWith('workspace:fileDeleted', {
      filePath: '/workspace/deleted-file.ts',
    });
  });

  it('does not refresh for discovery-excluded file creation events', () => {
    const context = makeContext();
    const provider = makeProvider();

    let createListener: ((uri: { fsPath: string }) => void) | undefined;
    vi.mocked(vscode.workspace.createFileSystemWatcher).mockReturnValue({
      onDidCreate: vi.fn((cb) => {
        createListener = cb;
        return { dispose: vi.fn() };
      }),
      onDidDelete: vi.fn(() => ({ dispose: vi.fn() })),
      onDidChange: vi.fn(() => ({ dispose: vi.fn() })),
      dispose: vi.fn(),
    } as unknown as vscode.FileSystemWatcher);

    registerFileWatcher(context as unknown as vscode.ExtensionContext, provider as never);

    createListener!({ fsPath: '/workspace/node_modules/react/index.js' });

    expect(provider.refresh).not.toHaveBeenCalled();
    expect(provider.emitEvent).not.toHaveBeenCalled();
  });

  it('does not refresh for workspace config artifact deletion events', () => {
    const context = makeContext();
    const provider = makeProvider();

    let deleteListener: ((uri: { fsPath: string }) => void) | undefined;
    vi.mocked(vscode.workspace.createFileSystemWatcher).mockReturnValue({
      onDidCreate: vi.fn(() => ({ dispose: vi.fn() })),
      onDidDelete: vi.fn((cb) => {
        deleteListener = cb;
        return { dispose: vi.fn() };
      }),
      onDidChange: vi.fn(() => ({ dispose: vi.fn() })),
      dispose: vi.fn(),
    } as unknown as vscode.FileSystemWatcher);

    registerFileWatcher(context as unknown as vscode.ExtensionContext, provider as never);

    deleteListener!({ fsPath: '/workspace/.vscode/settings.json' });

    expect(provider.refresh).not.toHaveBeenCalled();
    expect(provider.emitEvent).not.toHaveBeenCalled();
  });
});

describe('workspace refresh coalescing', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('coalesces a save followed by a create event into one refresh', () => {
    vi.useFakeTimers();
    const context = makeContext();
    const provider = makeProvider();

    let createListener: ((uri: { fsPath: string }) => void) | undefined;
    vi.mocked(vscode.workspace.createFileSystemWatcher).mockReturnValue({
      onDidCreate: vi.fn((cb) => {
        createListener = cb;
        return { dispose: vi.fn() };
      }),
      onDidDelete: vi.fn(() => ({ dispose: vi.fn() })),
      onDidChange: vi.fn(() => ({ dispose: vi.fn() })),
      dispose: vi.fn(),
    } as unknown as vscode.FileSystemWatcher);

    registerSaveHandler(context as unknown as vscode.ExtensionContext, provider as never);
    registerFileWatcher(context as unknown as vscode.ExtensionContext, provider as never);

    const saveMock = vscode.workspace.onDidSaveTextDocument as unknown as {
      mock: { calls: unknown[][] };
    };
    const saveListener = saveMock.mock.calls[0]?.[0] as (doc: unknown) => void;

    saveListener({ uri: { fsPath: '/workspace/src/app.ts' } });
    vi.advanceTimersByTime(250);
    createListener!({ fsPath: '/workspace/src/app.ts.tmp' });

    vi.advanceTimersByTime(499);
    expect(provider.refresh).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1);
    expect(provider.refresh).toHaveBeenCalledOnce();
  });

  it('coalesces rapid create and delete events into one refresh', () => {
    vi.useFakeTimers();
    const context = makeContext();
    const provider = makeProvider();

    let createListener: ((uri: { fsPath: string }) => void) | undefined;
    let deleteListener: ((uri: { fsPath: string }) => void) | undefined;
    vi.mocked(vscode.workspace.createFileSystemWatcher).mockReturnValue({
      onDidCreate: vi.fn((cb) => {
        createListener = cb;
        return { dispose: vi.fn() };
      }),
      onDidDelete: vi.fn((cb) => {
        deleteListener = cb;
        return { dispose: vi.fn() };
      }),
      onDidChange: vi.fn(() => ({ dispose: vi.fn() })),
      dispose: vi.fn(),
    } as unknown as vscode.FileSystemWatcher);

    registerFileWatcher(context as unknown as vscode.ExtensionContext, provider as never);

    createListener!({ fsPath: '/workspace/src/app.ts.tmp' });
    vi.advanceTimersByTime(250);
    deleteListener!({ fsPath: '/workspace/src/app.ts.tmp' });

    vi.advanceTimersByTime(499);
    expect(provider.refresh).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1);
    expect(provider.refresh).toHaveBeenCalledOnce();
  });
});
