import * as path from 'node:path';
import * as vscode from 'vscode';
import {
  createWorkspaceCacheUpdateScheduler,
  type WorkspaceCacheUpdateProgress,
  type WorkspaceCacheUpdateScheduler,
  type WorkspaceCacheUpdateSchedulerOptions,
} from './model';
import {
  WorkspaceCacheUpdateHandledError,
  WorkspaceCacheUpdateUnrecordedError,
} from './error';
import {
  createFingerprintingWorkspaceCacheUpdate,
  createPathSignature,
} from './fingerprint';
import { collectWorkspaceCacheUpdatePaths } from './paths';
import { markWorkspaceCacheUpdateStale } from './stale';
import {
  renderWorkspaceCacheUpdateStatus,
  type WorkspaceCacheUpdateStatusBarItem,
} from './statusBar';

const CACHE_UPDATE_DEBOUNCE_MS = 250;
const CACHE_UPDATE_MAX_BATCH_AGE_MS = 2_000;

interface FileUri {
  fsPath: string;
  scheme: string;
}

interface Disposable {
  dispose(): void;
}

interface FileSystemWatcher extends Disposable {
  onDidChange(listener: (uri: FileUri) => void): Disposable;
  onDidCreate(listener: (uri: FileUri) => void): Disposable;
  onDidDelete(listener: (uri: FileUri) => void): Disposable;
}

interface StatusBarItem extends Disposable, WorkspaceCacheUpdateStatusBarItem {}

interface WorkspaceCacheUpdateContext {
  subscriptions: Disposable[];
}

interface WorkspaceCacheUpdateProvider {
  canUpdateWorkspaceFiles?(): boolean;
  refreshIndexStatus(): void;
  shouldObserveWorkspacePath?(filePath: string): boolean;
  setWorkspaceFileUpdateHandler?(
    handler: (filePaths: readonly string[]) => Promise<void>,
  ): void;
  updateWorkspaceFiles(
    filePaths: readonly string[],
    signal?: AbortSignal,
    onProgress?: (progress: WorkspaceCacheUpdateProgress) => void,
  ): Promise<void>;
}

export interface WorkspaceCacheUpdateRegistrationDependencies {
  createScheduler(
    options: WorkspaceCacheUpdateSchedulerOptions,
  ): WorkspaceCacheUpdateScheduler;
  createStatusBarItem(): StatusBarItem;
  createFileSystemWatcher(pattern: string): FileSystemWatcher;
  markGraphCacheStale(workspaceRoot: string, filePaths: readonly string[]): Promise<void>;
  pathSignature(filePath: string): Promise<string>;
  onDidCreateFiles(
    listener: (event: { files: readonly FileUri[] }) => void,
  ): Disposable;
  onDidDeleteFiles(
    listener: (event: { files: readonly FileUri[] }) => void,
  ): Disposable;
  onDidRenameFiles(
    listener: (
      event: {
        files: ReadonlyArray<{ oldUri: FileUri; newUri: FileUri }>;
      },
    ) => void,
  ): Disposable;
  onDidSaveTextDocument(
    listener: (document: { uri: FileUri }) => void,
  ): Disposable;
  workspaceRoot(): string | undefined;
}

const defaultDependencies: WorkspaceCacheUpdateRegistrationDependencies = {
  createScheduler: createWorkspaceCacheUpdateScheduler,
  createStatusBarItem: () =>
    vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 20),
  createFileSystemWatcher: pattern => vscode.workspace.createFileSystemWatcher(pattern),
  markGraphCacheStale: markWorkspaceCacheUpdateStale,
  pathSignature: createPathSignature,
  onDidCreateFiles: listener => vscode.workspace.onDidCreateFiles(listener),
  onDidDeleteFiles: listener => vscode.workspace.onDidDeleteFiles(listener),
  onDidRenameFiles: listener => vscode.workspace.onDidRenameFiles(listener),
  onDidSaveTextDocument: listener =>
    vscode.workspace.onDidSaveTextDocument(listener),
  workspaceRoot: () => vscode.workspace.workspaceFolders?.[0]?.uri.fsPath,
};

export function registerWorkspaceCacheUpdates(
  context: WorkspaceCacheUpdateContext,
  provider: WorkspaceCacheUpdateProvider,
  dependencies: WorkspaceCacheUpdateRegistrationDependencies = defaultDependencies,
): void {
  const statusBarItem = dependencies.createStatusBarItem();
  const scheduler = dependencies.createScheduler({
    debounceMs: CACHE_UPDATE_DEBOUNCE_MS,
    canUpdate: () => provider.canUpdateWorkspaceFiles?.() ?? true,
    maxBatchAgeMs: CACHE_UPDATE_MAX_BATCH_AGE_MS,
    onError: async (_error, filePaths) => {
      const workspaceRoot = dependencies.workspaceRoot();
      if (!workspaceRoot) return;
      await dependencies.markGraphCacheStale(workspaceRoot, filePaths);
      provider.refreshIndexStatus();
    },
    onStatus: status => renderWorkspaceCacheUpdateStatus(statusBarItem, status),
    update: createFingerprintingWorkspaceCacheUpdate({
      pathSignature: filePath => dependencies.pathSignature(filePath),
      update: (filePaths, signal, onProgress) =>
        provider.updateWorkspaceFiles(filePaths, signal, onProgress),
    }),
  });

  provider.setWorkspaceFileUpdateHandler?.(async filePaths => {
    const workspaceRoot = dependencies.workspaceRoot();
    if (!workspaceRoot) return;
    const absolutePaths = filePaths.map(filePath => (
      path.isAbsolute(filePath) ? filePath : path.resolve(workspaceRoot, filePath)
    ));
    const updatePaths = collectWorkspaceCacheUpdatePaths(workspaceRoot, absolutePaths);
    try {
      await scheduler.notifyImmediately(updatePaths);
    } catch (error) {
      if (error instanceof WorkspaceCacheUpdateUnrecordedError) throw error;
      throw new WorkspaceCacheUpdateHandledError(error);
    }
  });

  const notify = (uris: readonly FileUri[]): void => {
    const workspaceRoot = dependencies.workspaceRoot();
    if (!workspaceRoot) {
      return;
    }
    const filePaths: string[] = collectWorkspaceCacheUpdatePaths(
      workspaceRoot,
      uris
        .filter(uri => uri.scheme === 'file')
        .map(uri => uri.fsPath)
        .filter(filePath => provider.shouldObserveWorkspacePath?.(filePath) ?? true),
    );
    if (filePaths.length > 0) {
      scheduler.notify(filePaths);
    }
  };

  const fileSystemWatcher = dependencies.createFileSystemWatcher('**/*');
  const eventDisposables: Disposable[] = [
    dependencies.onDidSaveTextDocument(document => notify([document.uri])),
    dependencies.onDidCreateFiles(event => notify(event.files)),
    dependencies.onDidDeleteFiles(event => notify(event.files)),
    dependencies.onDidRenameFiles(event =>
      notify(event.files.flatMap(file => [file.oldUri, file.newUri]))),
    fileSystemWatcher.onDidCreate(uri => notify([uri])),
    fileSystemWatcher.onDidChange(uri => notify([uri])),
    fileSystemWatcher.onDidDelete(uri => notify([uri])),
  ];
  context.subscriptions.push(
    ...eventDisposables,
    fileSystemWatcher,
    scheduler,
    statusBarItem,
  );
}
