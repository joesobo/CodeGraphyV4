import { existsSync } from 'node:fs';
import * as path from 'node:path';
import { getGraphCachePath } from '@codegraphy-dev/core';
import * as vscode from 'vscode';
import {
  createWorkspaceCacheUpdateScheduler,
  type WorkspaceCacheUpdateScheduler,
  type WorkspaceCacheUpdateSchedulerOptions,
  type WorkspaceCacheUpdateStatus,
} from './model';
import { WorkspaceCacheUpdateHandledError } from './error';
import { collectWorkspaceCacheUpdatePaths } from './paths';
import { markWorkspaceCacheUpdateStale } from './stale';

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

interface StatusBarItem extends Disposable {
  text: string;
  tooltip: unknown;
  hide(): void;
  show(): void;
}

interface WorkspaceCacheUpdateContext {
  subscriptions: Disposable[];
}

interface WorkspaceCacheUpdateProvider {
  refreshIndexStatus(): void;
  shouldObserveWorkspacePath?(filePath: string): boolean;
  setWorkspaceFileUpdateHandler?(
    handler: (filePaths: readonly string[]) => Promise<void>,
  ): void;
  updateWorkspaceFiles(
    filePaths: readonly string[],
    signal?: AbortSignal,
  ): Promise<void>;
}

export interface WorkspaceCacheUpdateRegistrationDependencies {
  createScheduler(
    options: WorkspaceCacheUpdateSchedulerOptions,
  ): WorkspaceCacheUpdateScheduler;
  createStatusBarItem(): StatusBarItem;
  createFileSystemWatcher(pattern: string): FileSystemWatcher;
  hasGraphCache(workspaceRoot: string): boolean;
  markGraphCacheStale(workspaceRoot: string, filePaths: readonly string[]): void;
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
  hasGraphCache: workspaceRoot => existsSync(getGraphCachePath(workspaceRoot)),
  markGraphCacheStale: markWorkspaceCacheUpdateStale,
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
    hasGraphCache: () => {
      const workspaceRoot = dependencies.workspaceRoot();
      return workspaceRoot !== undefined
        && dependencies.hasGraphCache(workspaceRoot);
    },
    maxBatchAgeMs: CACHE_UPDATE_MAX_BATCH_AGE_MS,
    onError: (_error, filePaths) => {
      const workspaceRoot = dependencies.workspaceRoot();
      if (!workspaceRoot) return;
      dependencies.markGraphCacheStale(workspaceRoot, filePaths);
      provider.refreshIndexStatus();
    },
    onStatus: status => renderStatus(statusBarItem, status),
    update: async (filePaths, signal) => {
      if (!signal.aborted) {
        await provider.updateWorkspaceFiles(filePaths, signal);
      }
    },
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

function renderStatus(
  statusBarItem: StatusBarItem,
  status: WorkspaceCacheUpdateStatus,
): void {
  if (status.state === 'idle') {
    statusBarItem.hide();
    return;
  }

  statusBarItem.text = statusBarText(status);
  statusBarItem.tooltip = status.detail;
  statusBarItem.show();
}

function statusBarText(status: Exclude<WorkspaceCacheUpdateStatus, { state: 'idle' }>): string {
  switch (status.state) {
    case 'queued':
      return status.fileCount === 1
        ? '$(clock) CodeGraphy: 1 change queued'
        : `$(clock) CodeGraphy: ${status.fileCount} changes queued`;
    case 'updating':
      return status.fileCount === 1
        ? '$(sync~spin) CodeGraphy: Updating 1 file'
        : `$(sync~spin) CodeGraphy: Updating ${status.fileCount} files`;
    case 'error':
      return '$(error) CodeGraphy: Cache update failed';
  }
}
