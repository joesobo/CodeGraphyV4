import * as vscode from 'vscode';
import {
  CodeGraphyRepoSettingsStore,
  type ICodeGraphyConfigurationLike,
  type ICodeGraphySettingsChangeEvent,
} from './store';
import { readCodeGraphyRepoMeta, writeCodeGraphyRepoMeta } from './meta';

let currentCodeGraphySettingsStore: CodeGraphyRepoSettingsStore | undefined;

function normalizeLegacySettingsKey(key: string): string;
function normalizeLegacySettingsKey(key: symbol): symbol;
function normalizeLegacySettingsKey(key: string | symbol): string | symbol {
  if (typeof key !== 'string') {
    return key;
  }

  if (key === 'legend') {
    return 'groups';
  }

  if (key.startsWith('legend.')) {
    return `groups.${key.slice('legend.'.length)}`;
  }

  if (key === 'exclude') {
    return 'filterPatterns';
  }

  return key;
}

function createLegacyWorkspaceConfiguration(): ICodeGraphyConfigurationLike {
  const configuration = vscode.workspace.getConfiguration('codegraphy');

  return {
    get: <T>(key: string, defaultValue: T): T =>
      configuration.get<T>(normalizeLegacySettingsKey(key), defaultValue),
    inspect: <T>(key: string) =>
      configuration.inspect<T>(normalizeLegacySettingsKey(key)) as unknown as
        | import('./store').ICodeGraphySettingsInspect<T>
        | undefined,
    update: (key: string, value: unknown, target?: unknown) =>
      Promise.resolve(configuration.update(
        normalizeLegacySettingsKey(key),
        value,
        target as vscode.ConfigurationTarget | undefined,
      )),
  };
}

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
    ?? createLegacyWorkspaceConfiguration();
}

export async function updateCodeGraphyConfigurationSilently(
  key: string,
  value: unknown,
): Promise<void> {
  if (currentCodeGraphySettingsStore?.updateSilently) {
    await currentCodeGraphySettingsStore.updateSilently(key, value);
    return;
  }

  await createLegacyWorkspaceConfiguration().update(key, value);
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
