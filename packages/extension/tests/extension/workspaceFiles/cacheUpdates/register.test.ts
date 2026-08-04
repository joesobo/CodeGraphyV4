import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createWorkspaceCacheUpdateScheduler,
  type WorkspaceCacheUpdateSchedulerOptions,
  type WorkspaceCacheUpdateStatus,
} from '../../../../src/extension/workspaceFiles/cacheUpdates/model';
import {
  createPathSignature,
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
  const notifyImmediately = vi.fn(() => Promise.resolve());
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
      return { dispose: vi.fn(), notify, notifyImmediately };
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
    pathSignature: vi.fn(async () => 'signature-1'),
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
    notifyImmediately,
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

  it('routes immediate Graph View paths through the shared normalized scheduler', async () => {
    const harness = createHarness();
    let immediateUpdate: ((filePaths: readonly string[]) => Promise<void>) | undefined;

    registerWorkspaceCacheUpdates(
      { subscriptions: [] },
      {
        refreshIndexStatus: vi.fn(),
        setWorkspaceFileUpdateHandler: handler => {
          immediateUpdate = handler;
        },
        updateWorkspaceFiles: vi.fn(async () => undefined),
      },
      harness.dependencies,
    );

    await immediateUpdate?.(['src/new.ts']);

    expect(harness.notifyImmediately).toHaveBeenCalledWith(['/workspace/src/new.ts']);
  });

  it('coalesces unchanged duplicate events but retains a real same-path change', async () => {
    const harness = createHarness();
    const updateWorkspaceFiles = vi.fn(async () => undefined);
    registerWorkspaceCacheUpdates(
      { subscriptions: [] },
      { refreshIndexStatus: vi.fn(), updateWorkspaceFiles },
      harness.dependencies,
    );
    const update = harness.schedulerOptions()?.update;
    const signal = new AbortController().signal;
    const reportProgress = vi.fn();

    await update?.(['/workspace/src/new.ts'], signal, reportProgress);
    await update?.(['/workspace/src/new.ts'], signal, reportProgress);
    expect(updateWorkspaceFiles).toHaveBeenCalledOnce();

    vi.mocked(harness.dependencies.pathSignature).mockResolvedValue('signature-2');
    await update?.(['/workspace/src/new.ts'], signal, reportProgress);
    expect(updateWorkspaceFiles).toHaveBeenCalledTimes(2);
  });

  it('bounds signature reads for large workspace-event batches', async () => {
    const harness = createHarness();
    let activeReads = 0;
    let maxActiveReads = 0;
    vi.mocked(harness.dependencies.pathSignature).mockImplementation(async filePath => {
      activeReads += 1;
      maxActiveReads = Math.max(maxActiveReads, activeReads);
      await new Promise<void>(resolve => setImmediate(resolve));
      activeReads -= 1;
      return `signature:${filePath}`;
    });
    const updateWorkspaceFiles = vi.fn(async () => undefined);
    registerWorkspaceCacheUpdates(
      { subscriptions: [] },
      { refreshIndexStatus: vi.fn(), updateWorkspaceFiles },
      harness.dependencies,
    );

    const paths = Array.from(
      { length: 40 },
      (_, index) => `/workspace/src/file-${index}.ts`,
    );
    await harness.schedulerOptions()?.update(
      paths,
      new AbortController().signal,
      vi.fn(),
    );

    expect(maxActiveReads).toBe(8);
    expect(updateWorkspaceFiles).toHaveBeenCalledWith(
      paths,
      expect.any(AbortSignal),
    );
  });

  it('does not coalesce paths whose signature read failed', async () => {
    const harness = createHarness();
    const signatureError = Object.assign(new Error('too many open files'), { code: 'EMFILE' });
    vi.mocked(harness.dependencies.pathSignature)
      .mockRejectedValueOnce(signatureError)
      .mockResolvedValueOnce('recovered-signature');
    const updateWorkspaceFiles = vi.fn(async () => undefined);
    registerWorkspaceCacheUpdates(
      { subscriptions: [] },
      { refreshIndexStatus: vi.fn(), updateWorkspaceFiles },
      harness.dependencies,
    );
    const update = harness.schedulerOptions()?.update;
    const signal = new AbortController().signal;

    await expect(update?.(['/workspace/src/app.ts'], signal, vi.fn()))
      .rejects.toBe(signatureError);
    expect(updateWorkspaceFiles).not.toHaveBeenCalled();

    await update?.(['/workspace/src/app.ts'], signal, vi.fn());
    expect(updateWorkspaceFiles).toHaveBeenCalledOnce();
  });

  it('distinguishes same-size content changes when timestamps are preserved', async () => {
    const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'codegraphy-cache-signature-'));
    try {
      const filePath = path.join(tempRoot, 'same-size.ts');
      fs.writeFileSync(filePath, 'aaaa');
      const modifiedAt = fs.statSync(filePath).mtime;
      const firstSignature = await createPathSignature(filePath);

      fs.writeFileSync(filePath, 'bbbb');
      fs.utimesSync(filePath, modifiedAt, modifiedAt);
      const secondSignature = await createPathSignature(filePath);

      expect(secondSignature).not.toBe(firstSignature);
    } finally {
      fs.rmSync(tempRoot, { recursive: true, force: true });
    }
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
