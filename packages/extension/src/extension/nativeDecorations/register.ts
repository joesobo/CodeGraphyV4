import * as vscode from 'vscode';
import path from 'node:path';
import type { ExtensionToWebviewMessage } from '../../shared/protocol/extensionToWebview';
import { execGitCommand } from '../gitHistory/exec';
import {
  createNativeDecorationsController,
  type NativeDecorationsController,
} from './controller';
import { collectGitStatuses, type CollectGitStatusesDependencies } from './git';
import { collectWorkspaceProblems, type CollectWorkspaceProblemsInput } from './problems';

type NativeDecorationsMessage = Extract<
  ExtensionToWebviewMessage,
  { type: 'NATIVE_DECORATIONS_UPDATED' }
>;

interface NativeDecorationsHostDependencies {
  getWorkspaceRoots(): readonly string[];
  getGitExtension: CollectGitStatusesDependencies['getGitExtension'];
  execGitStatus(workspaceRoot: string): Promise<string>;
  getDiagnostics(): CollectWorkspaceProblemsInput['diagnostics'];
  onDidChangeDiagnostics(listener: () => void): vscode.Disposable;
  onDidChangeGit(listener: () => void): vscode.Disposable;
}

interface GitRepositoryEventsLike {
  state: { onDidChange(listener: () => void): vscode.Disposable };
}

interface GitApiEventsLike {
  repositories: readonly GitRepositoryEventsLike[];
  onDidOpenRepository?(listener: () => void): vscode.Disposable;
  onDidCloseRepository?(listener: () => void): vscode.Disposable;
}

interface GitExtensionEventsLike {
  isActive: boolean;
  exports?: { getAPI(version: 1): GitApiEventsLike };
  activate(): PromiseLike<{ getAPI(version: 1): GitApiEventsLike }>;
}

export function registerNativeDecorations(
  context: vscode.ExtensionContext,
  sendMessage: (message: NativeDecorationsMessage) => void,
  dependencies: NativeDecorationsHostDependencies = createDefaultHostDependencies(),
): NativeDecorationsController {
  const controller = createNativeDecorationsController({
    collectGitStatuses: async () => {
      const workspaceRoots = dependencies.getWorkspaceRoots();
      return normalizeForGraphNodeIds(await collectGitStatuses({
        workspaceRoots,
        getGitExtension: () => dependencies.getGitExtension(),
        execGitStatus: workspaceRoot => dependencies.execGitStatus(workspaceRoot),
      }), workspaceRoots[0]);
    },
    collectProblems: () => {
      const workspaceRoots = dependencies.getWorkspaceRoots();
      return normalizeForGraphNodeIds(collectWorkspaceProblems({
        diagnostics: dependencies.getDiagnostics(),
        workspaceRoots,
      }), workspaceRoots[0]);
    },
    onDidChangeGit: listener => dependencies.onDidChangeGit(listener),
    onDidChangeDiagnostics: listener => dependencies.onDidChangeDiagnostics(listener),
    sendMessage,
  });
  context.subscriptions.push(controller);
  return controller;
}

function normalizeForGraphNodeIds<T>(
  values: ReadonlyMap<string, T>,
  workspaceRoot: string | undefined,
): Map<string, T> {
  if (!workspaceRoot) return new Map();
  const normalized = new Map<string, T>();
  for (const [filePath, value] of values) {
    const relativePath = path.relative(workspaceRoot, filePath);
    if (relativePath.startsWith('..') || path.isAbsolute(relativePath)) continue;
    normalized.set(relativePath.split(path.sep).join('/'), value);
  }
  return normalized;
}

function createDefaultHostDependencies(): NativeDecorationsHostDependencies {
  return {
    getWorkspaceRoots: () =>
      vscode.workspace.workspaceFolders?.map(folder => folder.uri.fsPath) ?? [],
    getGitExtension: () =>
      vscode.extensions.getExtension('vscode.git') as unknown as ReturnType<
        CollectGitStatusesDependencies['getGitExtension']
      >,
    execGitStatus: workspaceRoot => execGitCommand(
      ['status', '--porcelain=v1', '-z', '--untracked-files=all'],
      { workspaceRoot },
    ),
    getDiagnostics: () => vscode.languages.getDiagnostics(),
    onDidChangeDiagnostics: listener => vscode.languages.onDidChangeDiagnostics(listener),
    onDidChangeGit: listener => registerGitChangeEvents(listener),
  };
}

export function registerGitChangeEvents(listener: () => void): vscode.Disposable {
  const subscriptions: vscode.Disposable[] = [];
  let repositorySubscriptions: vscode.Disposable[] = [];
  let disposed = false;
  let fallbackWatcherRegistered = false;

  const registerFallbackWatcher = (): void => {
    if (fallbackWatcherRegistered || disposed) return;
    fallbackWatcherRegistered = true;
    const watcher = vscode.workspace.createFileSystemWatcher('**/*');
    subscriptions.push(
      watcher,
      watcher.onDidCreate(listener),
      watcher.onDidChange(listener),
      watcher.onDidDelete(listener),
    );
  };

  const workspaceFolderEvent = (
    vscode.workspace as typeof vscode.workspace & {
      onDidChangeWorkspaceFolders?: (callback: () => void) => vscode.Disposable;
    }
  ).onDidChangeWorkspaceFolders;
  if (workspaceFolderEvent) subscriptions.push(workspaceFolderEvent(listener));

  const extension = vscode.extensions.getExtension('vscode.git') as unknown as
    GitExtensionEventsLike | undefined;
  if (extension) {
    void resolveGitApi(extension).then(api => {
      if (disposed) return;
      const bindRepositories = (): void => {
        for (const subscription of repositorySubscriptions) subscription.dispose();
        repositorySubscriptions = api.repositories.map(repository =>
          repository.state.onDidChange(listener));
      };
      bindRepositories();
      if (api.onDidOpenRepository) {
        subscriptions.push(api.onDidOpenRepository(() => {
          bindRepositories();
          listener();
        }));
      }
      if (api.onDidCloseRepository) {
        subscriptions.push(api.onDidCloseRepository(() => {
          bindRepositories();
          listener();
        }));
      }
    }).catch(registerFallbackWatcher);
  } else registerFallbackWatcher();

  return {
    dispose: () => {
      disposed = true;
      for (const subscription of repositorySubscriptions) subscription.dispose();
      for (const subscription of subscriptions) subscription.dispose();
    },
  };
}

async function resolveGitApi(extension: GitExtensionEventsLike): Promise<GitApiEventsLike> {
  const exports = extension.isActive && extension.exports
    ? extension.exports
    : await extension.activate();
  return exports.getAPI(1);
}
