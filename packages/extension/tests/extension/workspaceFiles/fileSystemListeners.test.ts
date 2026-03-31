import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as vscode from 'vscode';
import {
  registerEditorChangeHandler,
  registerSaveHandler,
  registerFileWatcher,
} from '../../../src/extension/workspaceFiles/register';
import {
  shouldIgnoreSaveForGraphRefresh,
  shouldIgnoreWorkspaceFileWatcherRefresh,
} from '../../../src/extension/workspaceFiles/ignore';

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

function makeDocument(fsPath: string | undefined) {
  return {
    uri: { fsPath, scheme: 'file' },
  } as unknown as vscode.TextDocument;
}

describe('shouldIgnoreSaveForGraphRefresh', () => {
  it('ignores VS Code settings.json saves', () => {
    expect(shouldIgnoreSaveForGraphRefresh(makeDocument('/project/.vscode/settings.json'))).toBe(true);
  });

  it('ignores VS Code tasks.json saves', () => {
    expect(shouldIgnoreSaveForGraphRefresh(makeDocument('/project/.vscode/tasks.json'))).toBe(true);
  });

  it('ignores VS Code launch.json saves', () => {
    expect(shouldIgnoreSaveForGraphRefresh(makeDocument('/project/.vscode/launch.json'))).toBe(true);
  });

  it('ignores code-workspace saves', () => {
    expect(shouldIgnoreSaveForGraphRefresh(makeDocument('/project/my-project.code-workspace'))).toBe(true);
  });

  it('ignores discovery-excluded saves', () => {
    expect(shouldIgnoreSaveForGraphRefresh(makeDocument('/project/node_modules/react/index.js'))).toBe(true);
    expect(shouldIgnoreSaveForGraphRefresh(makeDocument('/project/dist/app.bundle.js'))).toBe(true);
  });

  it('does not ignore normal source file saves', () => {
    expect(shouldIgnoreSaveForGraphRefresh(makeDocument('/project/src/app.ts'))).toBe(false);
  });

  it('returns false when the document has no file path', () => {
    expect(shouldIgnoreSaveForGraphRefresh(makeDocument(undefined))).toBe(false);
  });
});

describe('shouldIgnoreWorkspaceFileWatcherRefresh', () => {
  it('ignores workspace config artifact paths', () => {
    expect(shouldIgnoreWorkspaceFileWatcherRefresh('/project/.vscode/settings.json')).toBe(true);
    expect(shouldIgnoreWorkspaceFileWatcherRefresh('/project/my-project.code-workspace')).toBe(true);
  });

  it('ignores discovery-excluded watcher paths', () => {
    expect(shouldIgnoreWorkspaceFileWatcherRefresh('/project/node_modules/react/index.js')).toBe(true);
    expect(shouldIgnoreWorkspaceFileWatcherRefresh('/project/.git/index.lock')).toBe(true);
  });

  it('keeps source file watcher paths refreshable', () => {
    expect(shouldIgnoreWorkspaceFileWatcherRefresh('/project/src/app.ts')).toBe(false);
  });
});

describe('registerEditorChangeHandler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('adds a subscription for the active editor change listener', () => {
    const context = makeContext();
    const provider = makeProvider();

    registerEditorChangeHandler(context as unknown as vscode.ExtensionContext, provider as never);

    expect(context.subscriptions.length).toBe(1);
  });

  it('clears the focused file when no editor is active', async () => {
    const context = makeContext();
    const provider = makeProvider();

    registerEditorChangeHandler(context as unknown as vscode.ExtensionContext, provider as never);

    const mock = vscode.window.onDidChangeActiveTextEditor as unknown as {
      mock: { calls: unknown[][] };
    };
    const listener = mock.mock.calls[0]?.[0] as (editor: undefined) => Promise<void>;
    await listener(undefined);

    expect(provider.setFocusedFile).toHaveBeenCalledWith(undefined);
    expect(provider.emitEvent).toHaveBeenCalledWith('workspace:activeEditorChanged', { filePath: undefined });
  });
});

describe('registerSaveHandler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('adds a subscription for the save listener', () => {
    const context = makeContext();
    const provider = makeProvider();

    registerSaveHandler(context as unknown as vscode.ExtensionContext, provider as never);

    expect(context.subscriptions.length).toBe(1);
  });

  it('skips graph refresh for workspace config saves', () => {
    vi.useFakeTimers();
    const context = makeContext();
    const provider = makeProvider();

    registerSaveHandler(context as unknown as vscode.ExtensionContext, provider as never);

    const mock = vscode.workspace.onDidSaveTextDocument as unknown as {
      mock: { calls: unknown[][] };
    };
    const listener = mock.mock.calls[0]?.[0] as (doc: vscode.TextDocument) => void;

    listener(makeDocument('/project/.vscode/settings.json'));
    vi.advanceTimersByTime(600);

    expect(provider.refresh).not.toHaveBeenCalled();
    vi.useRealTimers();
  });

  it('debounces graph refresh for regular file saves', () => {
    vi.useFakeTimers();
    const context = makeContext();
    const provider = makeProvider();

    registerSaveHandler(context as unknown as vscode.ExtensionContext, provider as never);

    const mock = vscode.workspace.onDidSaveTextDocument as unknown as {
      mock: { calls: unknown[][] };
    };
    const listener = mock.mock.calls[0]?.[0] as (doc: vscode.TextDocument) => void;

    listener(makeDocument('/project/src/app.ts'));
    vi.advanceTimersByTime(600);

    expect(provider.refresh).toHaveBeenCalledOnce();
    vi.useRealTimers();
  });
});

describe('registerFileWatcher', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('adds three subscriptions (create, delete, watcher itself)', () => {
    const context = makeContext();
    const provider = makeProvider();

    registerFileWatcher(context as unknown as vscode.ExtensionContext, provider as never);

    expect(context.subscriptions.length).toBe(3);
  });
});
