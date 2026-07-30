import { readCodeGraphyWorkspaceStatus } from '@codegraphy-dev/core';
import * as vscode from 'vscode';
import {
  createWorkspaceCacheUpdateScheduler,
  type WorkspaceCacheUpdateScheduler,
  type WorkspaceCacheUpdateSchedulerOptions,
  type WorkspaceCacheUpdateStatus,
} from './model';
import { collectWorkspaceCacheUpdatePaths } from './paths';

const CACHE_UPDATE_DEBOUNCE_MS = 500;
const CACHE_UPDATE_MAX_BATCH_AGE_MS = 2_000;

interface FileUri {
  fsPath: string;
  scheme: string;
}

interface Disposable {
  dispose(): void;
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
  updateWorkspaceFiles(filePaths: readonly string[]): Promise<void>;
}

export interface WorkspaceCacheUpdateRegistrationDependencies {
  createScheduler(
    options: WorkspaceCacheUpdateSchedulerOptions,
  ): WorkspaceCacheUpdateScheduler;
  createStatusBarItem(): StatusBarItem;
  hasGraphCache(workspaceRoot: string): boolean;
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
  hasGraphCache: workspaceRoot =>
    readCodeGraphyWorkspaceStatus(workspaceRoot).hasGraphCache,
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
    onStatus: status => renderStatus(statusBarItem, status),
    update: async (filePaths, signal) => {
      if (!signal.aborted) {
        await provider.updateWorkspaceFiles(filePaths);
      }
    },
  });

  const notify = (uris: readonly FileUri[]): void => {
    const workspaceRoot = dependencies.workspaceRoot();
    if (!workspaceRoot) {
      return;
    }
    const filePaths: string[] = collectWorkspaceCacheUpdatePaths(
      workspaceRoot,
      uris.filter(uri => uri.scheme === 'file').map(uri => uri.fsPath),
    );
    if (filePaths.length > 0) {
      scheduler.notify(filePaths);
    }
  };

  const eventDisposables: Disposable[] = [
    dependencies.onDidSaveTextDocument(document => notify([document.uri])),
    dependencies.onDidCreateFiles(event => notify(event.files)),
    dependencies.onDidDeleteFiles(event => notify(event.files)),
    dependencies.onDidRenameFiles(event =>
      notify(event.files.flatMap(file => [file.oldUri, file.newUri]))),
  ];
  context.subscriptions.push(...eventDisposables, scheduler, statusBarItem);
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
