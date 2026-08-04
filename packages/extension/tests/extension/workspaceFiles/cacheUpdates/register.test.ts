import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createWorkspaceCacheUpdateScheduler,
  type WorkspaceCacheUpdateSchedulerOptions,
  type WorkspaceCacheUpdateStatus,
} from '../../../../src/extension/workspaceFiles/cacheUpdates/model';
import {
  registerWorkspaceCacheUpdates,
  type WorkspaceCacheUpdateRegistrationDependencies,
} from '../../../../src/extension/workspaceFiles/cacheUpdates/register';

interface FileUri {
  fsPath: string;
  scheme: string;
}

function fileUri(fsPath: string): FileUri {
  return { fsPath, scheme: 'file' };
}

function createHarness() {
  let saveListener: ((document: { uri: FileUri }) => void) | undefined;
  let createListener: ((event: { files: readonly FileUri[] }) => void) | undefined;
  let deleteListener: ((event: { files: readonly FileUri[] }) => void) | undefined;
  let renameListener: (
    (event: { files: ReadonlyArray<{ oldUri: FileUri; newUri: FileUri }> }) => void
  ) | undefined;
  let watcherCreateListener: ((uri: FileUri) => void) | undefined;
  let watcherChangeListener: ((uri: FileUri) => void) | undefined;
  let watcherDeleteListener: ((uri: FileUri) => void) | undefined;
  let schedulerOptions: WorkspaceCacheUpdateSchedulerOptions | undefined;
  const notify = vi.fn();
  const statusBarItem = {
    text: '',
    tooltip: '',
    show: vi.fn(),
    hide: vi.fn(),
    dispose: vi.fn(),
  };
  const disposable = { dispose: vi.fn() };
  const dependencies: WorkspaceCacheUpdateRegistrationDependencies = {
    createScheduler: vi.fn((options) => {
      schedulerOptions = options;
      return { dispose: vi.fn(), notify };
    }),
    createStatusBarItem: vi.fn(() => statusBarItem),
    createFileSystemWatcher: vi.fn(() => ({
      dispose: vi.fn(),
      onDidChange: vi.fn((listener) => {
        watcherChangeListener = listener;
        return disposable;
      }),
      onDidCreate: vi.fn((listener) => {
        watcherCreateListener = listener;
        return disposable;
      }),
      onDidDelete: vi.fn((listener) => {
        watcherDeleteListener = listener;
        return disposable;
      }),
    })),
    hasGraphCache: vi.fn(() => true),
    markGraphCacheStale: vi.fn(),
    onDidCreateFiles: vi.fn((listener) => {
      createListener = listener;
      return disposable;
    }),
    onDidDeleteFiles: vi.fn((listener) => {
      deleteListener = listener;
      return disposable;
    }),
    onDidRenameFiles: vi.fn((listener) => {
      renameListener = listener;
      return disposable;
    }),
    onDidSaveTextDocument: vi.fn((listener) => {
      saveListener = listener;
      return disposable;
    }),
    workspaceRoot: vi.fn(() => '/workspace'),
  };

  return {
    dependencies,
    listeners: {
      create: () => createListener,
      delete: () => deleteListener,
      rename: () => renameListener,
      save: () => saveListener,
      watcherChange: () => watcherChangeListener,
      watcherCreate: () => watcherCreateListener,
      watcherDelete: () => watcherDeleteListener,
    },
    notify,
    schedulerOptions: () => schedulerOptions,
    statusBarItem,
  };
}

describe('workspaceFiles/cacheUpdates/register', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('maps VS Code save, create, delete, and rename events to workspace cache paths', () => {
    const harness = createHarness();
    const context = { subscriptions: [] as Array<{ dispose(): void }> };

    registerWorkspaceCacheUpdates(
      context,
      {
        refreshIndexStatus: vi.fn(),
        updateWorkspaceFiles: vi.fn(async () => undefined),
      },
      harness.dependencies,
    );

    harness.listeners.save()?.({ uri: fileUri('/workspace/src/saved.ts') });
    harness.listeners.save()?.({ uri: fileUri('/workspace/.codegraphy/graph.sqlite') });
    harness.listeners.create()?.({
      files: [fileUri('/workspace/src/created.ts')],
    });
    harness.listeners.delete()?.({
      files: [fileUri('/workspace/src/deleted.ts')],
    });
    harness.listeners.rename()?.({
      files: [{
        oldUri: fileUri('/workspace/src/old.ts'),
        newUri: fileUri('/workspace/src/new.ts'),
      }],
    });
    harness.listeners.watcherCreate()?.(fileUri('/workspace/src/terminal-created.ts'));
    harness.listeners.watcherChange()?.(fileUri('/workspace/src/terminal-changed.ts'));
    harness.listeners.watcherDelete()?.(fileUri('/workspace/src/terminal-deleted.ts'));

    expect(harness.notify.mock.calls).toEqual([
      [['/workspace/src/saved.ts']],
      [['/workspace/src/created.ts']],
      [['/workspace/src/deleted.ts']],
      [['/workspace/src/old.ts', '/workspace/src/new.ts']],
      [['/workspace/src/terminal-created.ts']],
      [['/workspace/src/terminal-changed.ts']],
      [['/workspace/src/terminal-deleted.ts']],
    ]);
    expect(context.subscriptions).toHaveLength(10);
  });

  it('shows queued, updating, and failed cache state in the VS Code status bar', () => {
    const harness = createHarness();

    registerWorkspaceCacheUpdates(
      { subscriptions: [] },
      {
        refreshIndexStatus: vi.fn(),
        updateWorkspaceFiles: vi.fn(async () => undefined),
      },
      harness.dependencies,
    );

    const report = (status: WorkspaceCacheUpdateStatus): void => {
      harness.schedulerOptions()?.onStatus(status);
    };
    report({
      state: 'queued',
      fileCount: 2,
      detail: '2 files queued.',
    });
    expect(harness.statusBarItem.text).toBe('$(clock) CodeGraphy: 2 changes queued');
    expect(harness.statusBarItem.tooltip).toBe('2 files queued.');
    expect(harness.statusBarItem.show).toHaveBeenCalledOnce();

    report({
      state: 'updating',
      fileCount: 2,
      detail: 'Updating 2 files.',
    });
    expect(harness.statusBarItem.text).toBe('$(sync~spin) CodeGraphy: Updating 2 files');

    report({
      state: 'error',
      fileCount: 2,
      detail: 'Graph Cache update failed.',
    });
    expect(harness.statusBarItem.text).toBe('$(error) CodeGraphy: Cache update failed');

    report({
      state: 'idle',
      fileCount: 0,
      detail: 'Graph Cache is current.',
    });
    expect(harness.statusBarItem.hide).toHaveBeenCalledOnce();
  });

  it('marks the Graph Cache stale when a targeted update cannot complete', () => {
    const harness = createHarness();
    const refreshIndexStatus = vi.fn();

    registerWorkspaceCacheUpdates(
      { subscriptions: [] },
      {
        refreshIndexStatus,
        updateWorkspaceFiles: vi.fn(async () => undefined),
      },
      harness.dependencies,
    );

    harness.schedulerOptions()?.onError?.(
      new Error('requires explicit Re-index'),
      ['/workspace/src/app.ts'],
    );

    expect(harness.dependencies.markGraphCacheStale).toHaveBeenCalledWith(
      '/workspace',
      ['/workspace/src/app.ts'],
    );
    expect(refreshIndexStatus).toHaveBeenCalledOnce();
  });

  it('marks the index stale when the real scheduler receives an update failure', async () => {
    vi.useFakeTimers();
    const harness = createHarness();
    const refreshIndexStatus = vi.fn();
    harness.dependencies.createScheduler = createWorkspaceCacheUpdateScheduler;

    registerWorkspaceCacheUpdates(
      { subscriptions: [] },
      {
        refreshIndexStatus,
        updateWorkspaceFiles: vi.fn(async () => {
          throw new Error('plugin requires explicit Re-index');
        }),
      },
      harness.dependencies,
    );

    harness.listeners.watcherChange()?.(fileUri('/workspace/src/app.ts'));
    await vi.advanceTimersByTimeAsync(250);

    expect(harness.dependencies.markGraphCacheStale).toHaveBeenCalledWith(
      '/workspace',
      ['/workspace/src/app.ts'],
    );
    expect(refreshIndexStatus).toHaveBeenCalledOnce();
  });

  it('passes scheduler cancellation to the graph update', async () => {
    const harness = createHarness();
    const updateWorkspaceFiles = vi.fn(async () => undefined);
    const controller = new AbortController();

    registerWorkspaceCacheUpdates(
      { subscriptions: [] },
      { refreshIndexStatus: vi.fn(), updateWorkspaceFiles },
      harness.dependencies,
    );

    await harness.schedulerOptions()?.update(
      ['/workspace/src/saved.ts'],
      controller.signal,
      vi.fn(),
    );

    expect(updateWorkspaceFiles).toHaveBeenCalledWith(
      ['/workspace/src/saved.ts'],
      controller.signal,
    );
  });
});
