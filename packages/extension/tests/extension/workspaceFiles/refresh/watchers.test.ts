import * as vscode from 'vscode';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  registerFileWatcher,
  registerSaveHandler,
} from '../../../../src/extension/workspaceFiles/refresh/watchers';

function makeProvider() {
  return {
    emitEvent: vi.fn(),
    refreshGitignoreMetadata: vi.fn().mockResolvedValue(undefined),
    refreshIndex: vi.fn().mockResolvedValue(undefined),
    refresh: vi.fn().mockResolvedValue(undefined),
    invalidateWorkspaceFiles: vi.fn(() => []),
    isGraphOpen: vi.fn(() => true),
    markWorkspaceRefreshPending: vi.fn(),
  };
}

function makeContext() {
  return {
    subscriptions: [] as { dispose: () => void }[],
  };
}

let watcherListeners: {
  change?: (uri: vscode.Uri) => void;
  create?: (uri: vscode.Uri) => void;
  delete?: (uri: vscode.Uri) => void;
};
let gitignoreWatcherListeners: {
  change?: (uri: vscode.Uri) => void;
  create?: (uri: vscode.Uri) => void;
  delete?: (uri: vscode.Uri) => void;
};

function makeWatcher(listenerTarget: typeof watcherListeners): vscode.FileSystemWatcher {
  return {
    onDidCreate: vi.fn((callback) => {
      listenerTarget.create = callback;
      return { dispose: vi.fn() };
    }),
    onDidDelete: vi.fn((callback) => {
      listenerTarget.delete = callback;
      return { dispose: vi.fn() };
    }),
    onDidChange: vi.fn((callback) => {
      listenerTarget.change = callback;
      return { dispose: vi.fn() };
    }),
    dispose: vi.fn(),
  } as unknown as vscode.FileSystemWatcher;
}

function installFileSystemWatcher(): void {
  watcherListeners = {};
  gitignoreWatcherListeners = {};
  vi.mocked(vscode.workspace.createFileSystemWatcher).mockImplementation((globPattern) =>
    globPattern === '**/.gitignore'
      ? makeWatcher(gitignoreWatcherListeners)
      : makeWatcher(watcherListeners),
  );
}

function captureSaveListener(): (document: vscode.TextDocument) => void {
  let listener: ((document: vscode.TextDocument) => void) | undefined;
  vi.mocked(vscode.workspace.onDidSaveTextDocument).mockImplementation((callback) => {
    listener = callback;
    return { dispose: vi.fn() } as unknown as vscode.Disposable;
  });

  return (document: vscode.TextDocument) => {
    if (!listener) {
      throw new Error('missing save listener');
    }
    listener(document);
  };
}

function captureCreateFilesListener(): (event: vscode.FileCreateEvent) => void {
  let listener: ((event: vscode.FileCreateEvent) => void) | undefined;
  vi.mocked(vscode.workspace.onDidCreateFiles).mockImplementation((callback) => {
    listener = callback;
    return { dispose: vi.fn() } as unknown as vscode.Disposable;
  });

  return (event: vscode.FileCreateEvent) => {
    if (!listener) {
      throw new Error('missing create-files listener');
    }
    listener(event);
  };
}

function captureDeleteFilesListener(): (event: vscode.FileDeleteEvent) => void {
  let listener: ((event: vscode.FileDeleteEvent) => void) | undefined;
  vi.mocked(vscode.workspace.onDidDeleteFiles).mockImplementation((callback) => {
    listener = callback;
    return { dispose: vi.fn() } as unknown as vscode.Disposable;
  });

  return (event: vscode.FileDeleteEvent) => {
    if (!listener) {
      throw new Error('missing delete-files listener');
    }
    listener(event);
  };
}

function captureRenameListener(): (event: vscode.FileRenameEvent) => void {
  let listener: ((event: vscode.FileRenameEvent) => void) | undefined;
  vi.mocked(vscode.workspace.onDidRenameFiles).mockImplementation((callback) => {
    listener = callback;
    return { dispose: vi.fn() } as unknown as vscode.Disposable;
  });

  return (event: vscode.FileRenameEvent) => {
    if (!listener) {
      throw new Error('missing rename listener');
    }
    listener(event);
  };
}

function uri(filePath: string): vscode.Uri {
  return { fsPath: filePath } as vscode.Uri;
}

describe('workspaceFiles/refresh/watchers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    installFileSystemWatcher();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('refreshes old and new paths and emits rename events', () => {
    vi.useFakeTimers();
    const context = makeContext();
    const provider = makeProvider();
    const triggerRename = captureRenameListener();

    registerFileWatcher(context as unknown as vscode.ExtensionContext, provider as never);
    triggerRename({
      files: [
        {
          oldUri: uri('/workspace/src/old.ts'),
          newUri: uri('/workspace/src/new.ts'),
        },
      ],
    });
    vi.advanceTimersByTime(500);

    expect(provider.invalidateWorkspaceFiles).toHaveBeenCalledWith([
      '/workspace/src/old.ts',
      '/workspace/src/new.ts',
    ]);
    expect(provider.refresh).toHaveBeenCalledOnce();
    expect(provider.refreshGitignoreMetadata).not.toHaveBeenCalled();
    expect(provider.refreshIndex).not.toHaveBeenCalled();
    expect(provider.emitEvent).toHaveBeenCalledWith('workspace:fileRenamed', {
      oldPath: '/workspace/src/old.ts',
      newPath: '/workspace/src/new.ts',
    });
  });

  it('registers file watchers with the workspace glob', () => {
    const context = makeContext();
    const provider = makeProvider();

    registerFileWatcher(context as unknown as vscode.ExtensionContext, provider as never);

    expect(vscode.workspace.createFileSystemWatcher).toHaveBeenCalledWith('**/*');
    expect(vscode.workspace.createFileSystemWatcher).toHaveBeenCalledWith('**/.gitignore');
    expect(context.subscriptions).toHaveLength(11);
  });

  it('wires saved documents to file-changed refreshes', () => {
    vi.useFakeTimers();
    const context = makeContext();
    const provider = makeProvider();
    const triggerSave = captureSaveListener();

    registerSaveHandler(context as unknown as vscode.ExtensionContext, provider as never);
    triggerSave({ uri: uri('/workspace/src/app.ts') } as vscode.TextDocument);
    vi.advanceTimersByTime(500);

    expect(provider.invalidateWorkspaceFiles).toHaveBeenCalledWith(['/workspace/src/app.ts']);
    expect(provider.emitEvent).toHaveBeenCalledWith('workspace:fileChanged', {
      filePath: '/workspace/src/app.ts',
    });
  });

  it('wires file-system create and delete watchers to workspace events', () => {
    vi.useFakeTimers();
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    const context = makeContext();
    const provider = makeProvider();

    registerFileWatcher(context as unknown as vscode.ExtensionContext, provider as never);
    watcherListeners.create?.(uri('/workspace/src/new.ts'));
    vi.advanceTimersByTime(500);
    watcherListeners.delete?.(uri('/workspace/src/old.ts'));
    vi.advanceTimersByTime(500);

    expect(provider.emitEvent).toHaveBeenCalledWith('workspace:fileCreated', {
      filePath: '/workspace/src/new.ts',
    });
    expect(provider.emitEvent).toHaveBeenCalledWith('workspace:fileDeleted', {
      filePath: '/workspace/src/old.ts',
    });
    expect(consoleSpy).toHaveBeenCalledWith('[CodeGraphy] File created, refreshing graph');
    expect(consoleSpy).toHaveBeenCalledWith('[CodeGraphy] File deleted, refreshing graph');
  });

  it('wires file-system change watchers to file-changed refreshes', () => {
    vi.useFakeTimers();
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    const context = makeContext();
    const provider = makeProvider();

    registerFileWatcher(context as unknown as vscode.ExtensionContext, provider as never);
    watcherListeners.change?.(uri('/workspace/src/app.ts'));
    vi.advanceTimersByTime(500);

    expect(provider.invalidateWorkspaceFiles).toHaveBeenCalledWith(['/workspace/src/app.ts']);
    expect(provider.refresh).toHaveBeenCalledOnce();
    expect(provider.refreshIndex).not.toHaveBeenCalled();
    expect(provider.emitEvent).toHaveBeenCalledWith('workspace:fileChanged', {
      filePath: '/workspace/src/app.ts',
    });
    expect(consoleSpy).toHaveBeenCalledWith('[CodeGraphy] File changed, refreshing graph');
  });

  it('runs a metadata-only graph refresh when gitignore changes on disk', () => {
    vi.useFakeTimers();
    const context = makeContext();
    const provider = makeProvider();

    registerFileWatcher(context as unknown as vscode.ExtensionContext, provider as never);
    watcherListeners.change?.(uri('/workspace/.gitignore'));
    vi.advanceTimersByTime(500);

    expect(provider.refreshGitignoreMetadata).toHaveBeenCalledOnce();
    expect(provider.refreshIndex).not.toHaveBeenCalled();
    expect(provider.refresh).not.toHaveBeenCalled();
    expect(provider.invalidateWorkspaceFiles).not.toHaveBeenCalled();
    expect(provider.emitEvent).toHaveBeenCalledWith('workspace:fileChanged', {
      filePath: '/workspace/.gitignore',
    });
  });

  it('runs a metadata-only graph refresh when the dedicated gitignore watcher sees a change', () => {
    vi.useFakeTimers();
    const context = makeContext();
    const provider = makeProvider();

    registerFileWatcher(context as unknown as vscode.ExtensionContext, provider as never);
    gitignoreWatcherListeners.change?.(uri('/workspace/.gitignore'));
    vi.advanceTimersByTime(500);

    expect(provider.refreshGitignoreMetadata).toHaveBeenCalledOnce();
    expect(provider.refreshIndex).not.toHaveBeenCalled();
    expect(provider.refresh).not.toHaveBeenCalled();
    expect(provider.invalidateWorkspaceFiles).not.toHaveBeenCalled();
    expect(provider.emitEvent).toHaveBeenCalledWith('workspace:fileChanged', {
      filePath: '/workspace/.gitignore',
    });
  });

  it('ignores file-system change events for graph cache writes', () => {
    vi.useFakeTimers();
    const context = makeContext();
    const provider = makeProvider();

    registerFileWatcher(context as unknown as vscode.ExtensionContext, provider as never);
    watcherListeners.change?.(uri('/workspace/.codegraphy/graph.lbug'));
    vi.advanceTimersByTime(500);

    expect(provider.refresh).not.toHaveBeenCalled();
    expect(provider.invalidateWorkspaceFiles).not.toHaveBeenCalled();
    expect(provider.emitEvent).not.toHaveBeenCalled();
  });

  it('wires workspace explorer create and delete events', () => {
    vi.useFakeTimers();
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    const context = makeContext();
    const provider = makeProvider();
    const triggerCreateFiles = captureCreateFilesListener();
    const triggerDeleteFiles = captureDeleteFilesListener();

    registerFileWatcher(context as unknown as vscode.ExtensionContext, provider as never);
    triggerCreateFiles({ files: [uri('/workspace/src/new.ts')] } as vscode.FileCreateEvent);
    vi.advanceTimersByTime(500);
    triggerDeleteFiles({ files: [uri('/workspace/src/old.ts')] } as vscode.FileDeleteEvent);
    vi.advanceTimersByTime(500);

    expect(provider.emitEvent).toHaveBeenCalledWith('workspace:fileCreated', {
      filePath: '/workspace/src/new.ts',
    });
    expect(provider.emitEvent).toHaveBeenCalledWith('workspace:fileDeleted', {
      filePath: '/workspace/src/old.ts',
    });
    expect(consoleSpy).toHaveBeenCalledWith('[CodeGraphy] File created, refreshing graph');
    expect(consoleSpy).toHaveBeenCalledWith('[CodeGraphy] File deleted, refreshing graph');
  });

  it('does not emit rename events when every renamed path is ignored', () => {
    const context = makeContext();
    const provider = makeProvider();
    const triggerRename = captureRenameListener();

    registerFileWatcher(context as unknown as vscode.ExtensionContext, provider as never);
    triggerRename({
      files: [
        {
          oldUri: uri('/workspace/.vscode/settings.json'),
          newUri: uri('/workspace/.vscode/tasks.json'),
        },
      ],
    });

    expect(provider.refresh).not.toHaveBeenCalled();
    expect(provider.emitEvent).not.toHaveBeenCalled();
  });
});
