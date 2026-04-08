import * as vscode from 'vscode';
import {
  CodeGraphyRepoSettingsStore,
  type ICodeGraphyConfigurationLike,
  type ICodeGraphySettingsChangeEvent,
} from './store';
import { readCodeGraphyRepoMeta, writeCodeGraphyRepoMeta } from './meta';

let currentCodeGraphySettingsStore: CodeGraphyRepoSettingsStore | undefined;

function createWatcherDisposable(
  watcher: vscode.FileSystemWatcher,
  onChange: () => void,
): vscode.Disposable {
  const subscriptions = [
    watcher.onDidChange(onChange),
    watcher.onDidCreate(onChange),
    watcher.onDidDelete(onChange),
  ];

  return {
    dispose: () => {
      for (const subscription of subscriptions) {
        subscription.dispose();
      }
      watcher.dispose();
    },
  };
}

export function initializeCurrentCodeGraphyConfiguration(
  context: vscode.ExtensionContext,
): CodeGraphyRepoSettingsStore | undefined {
  const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
  if (!workspaceRoot) {
    return undefined;
  }

  currentCodeGraphySettingsStore = new CodeGraphyRepoSettingsStore(
    workspaceRoot,
    vscode.workspace.getConfiguration('codegraphy'),
  );
  writeCodeGraphyRepoMeta(workspaceRoot, readCodeGraphyRepoMeta(workspaceRoot));

  const watcher = vscode.workspace.createFileSystemWatcher('**/.codegraphy/settings.json');
  context.subscriptions.push(
    createWatcherDisposable(watcher, () => {
      currentCodeGraphySettingsStore?.reload();
    }),
    {
      dispose: () => {
        currentCodeGraphySettingsStore = undefined;
      },
    },
  );

  return currentCodeGraphySettingsStore;
}

export function getCodeGraphyConfiguration(): ICodeGraphyConfigurationLike {
  return currentCodeGraphySettingsStore
    ?? (vscode.workspace.getConfiguration('codegraphy') as unknown as ICodeGraphyConfigurationLike);
}

export function onDidChangeCodeGraphyConfiguration(
  listener: (event: { affectsConfiguration(section: string): boolean }) => void,
): vscode.Disposable {
  if (!currentCodeGraphySettingsStore) {
    return vscode.workspace.onDidChangeConfiguration(listener);
  }

  return currentCodeGraphySettingsStore.onDidChange(
    listener as (event: ICodeGraphySettingsChangeEvent) => void,
  );
}

export function resetCurrentCodeGraphyConfigurationForTest(): void {
  currentCodeGraphySettingsStore = undefined;
}
