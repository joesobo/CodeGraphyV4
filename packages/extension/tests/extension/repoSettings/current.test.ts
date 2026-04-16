import { beforeEach, describe, expect, it, vi } from 'vitest';

const currentHarness = vi.hoisted(() => {
  const watcherDisposables = {
    change: { dispose: vi.fn() },
    create: { dispose: vi.fn() },
    delete: { dispose: vi.fn() },
  };
  const watcher = {
    onDidChange: vi.fn(() => watcherDisposables.change),
    onDidCreate: vi.fn(() => watcherDisposables.create),
    onDidDelete: vi.fn(() => watcherDisposables.delete),
    dispose: vi.fn(),
  };
  const workspaceConfiguration = {
    get: vi.fn(),
    inspect: vi.fn(),
    update: vi.fn(() => Promise.resolve()),
  };
  const onDidChangeConfiguration = vi.fn(() => ({ dispose: vi.fn() }));
  const readCodeGraphyRepoMeta = vi.fn(() => ({ version: 1, pendingChangedFiles: [] }));
  const writeCodeGraphyRepoMeta = vi.fn();
  let lastStore: Record<string, unknown> | undefined;
  const CodeGraphyRepoSettingsStore = vi.fn().mockImplementation((workspaceRoot: string) => {
    const store = {
      workspaceRoot,
      get: vi.fn(),
      inspect: vi.fn(),
      update: vi.fn(() => Promise.resolve()),
      updateSilently: vi.fn(() => Promise.resolve()),
      onDidChange: vi.fn(() => ({ dispose: vi.fn() })),
      reload: vi.fn(),
    };
    lastStore = store;
    return store;
  });

  return {
    watcher,
    watcherDisposables,
    workspaceConfiguration,
    onDidChangeConfiguration,
    readCodeGraphyRepoMeta,
    writeCodeGraphyRepoMeta,
    CodeGraphyRepoSettingsStore,
    getLastStore: () => lastStore as {
      updateSilently: ReturnType<typeof vi.fn>;
      onDidChange: ReturnType<typeof vi.fn>;
      reload: ReturnType<typeof vi.fn>;
    },
  };
});

vi.mock('vscode', () => ({
  ConfigurationTarget: {
    Workspace: 'workspace',
  },
  Uri: {
    file: (fsPath: string) => ({ fsPath }),
  },
  workspace: {
    workspaceFolders: [{ uri: { fsPath: '/workspace' } }],
    getConfiguration: vi.fn(() => currentHarness.workspaceConfiguration),
    createFileSystemWatcher: vi.fn(() => currentHarness.watcher),
    onDidChangeConfiguration: currentHarness.onDidChangeConfiguration,
  },
}));

vi.mock('../../../src/extension/repoSettings/store', () => ({
  CodeGraphyRepoSettingsStore: currentHarness.CodeGraphyRepoSettingsStore,
}));

vi.mock('../../../src/extension/repoSettings/meta', () => ({
  readCodeGraphyRepoMeta: currentHarness.readCodeGraphyRepoMeta,
  writeCodeGraphyRepoMeta: currentHarness.writeCodeGraphyRepoMeta,
}));

import * as vscode from 'vscode';
import {
  getCodeGraphyConfiguration,
  initializeCurrentCodeGraphyConfiguration,
  onDidChangeCodeGraphyConfiguration,
  resetCurrentCodeGraphyConfigurationForTest,
  updateCodeGraphyConfigurationSilently,
} from '../../../src/extension/repoSettings/current';

function createContext() {
  return {
    subscriptions: [] as Array<{ dispose: () => void }>,
  };
}

function setWorkspaceFolders(workspaceFolders: typeof vscode.workspace.workspaceFolders): void {
  Object.defineProperty(vscode.workspace, 'workspaceFolders', {
    configurable: true,
    get: () => workspaceFolders,
  });
}

describe('extension/repoSettings/current', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetCurrentCodeGraphyConfigurationForTest();
    currentHarness.workspaceConfiguration.get.mockImplementation((_key: string, defaultValue: unknown) => defaultValue);
    currentHarness.workspaceConfiguration.inspect.mockReturnValue(undefined);
    currentHarness.workspaceConfiguration.update.mockResolvedValue(undefined);
    vi.mocked(vscode.workspace.getConfiguration).mockReturnValue(currentHarness.workspaceConfiguration as never);
    vi.mocked(vscode.workspace.createFileSystemWatcher).mockReturnValue(currentHarness.watcher as never);
    vi.mocked(vscode.workspace.onDidChangeConfiguration).mockImplementation(currentHarness.onDidChangeConfiguration);
    setWorkspaceFolders([{ uri: { fsPath: '/workspace' } }] as never);
  });

  it('returns undefined when no workspace folder is available', () => {
    const context = createContext();
    setWorkspaceFolders(undefined);

    expect(initializeCurrentCodeGraphyConfiguration(context as never)).toBeUndefined();
    expect(currentHarness.CodeGraphyRepoSettingsStore).not.toHaveBeenCalled();
    expect(context.subscriptions).toEqual([]);
  });

  it('initializes the repo-local settings store, seeds meta, and registers watcher disposables', () => {
    const context = createContext();

    const store = initializeCurrentCodeGraphyConfiguration(context as never);

    expect(store).toBe(currentHarness.getLastStore());
    expect(currentHarness.CodeGraphyRepoSettingsStore).toHaveBeenCalledWith('/workspace');
    expect(currentHarness.readCodeGraphyRepoMeta).toHaveBeenCalledWith('/workspace');
    expect(currentHarness.writeCodeGraphyRepoMeta).toHaveBeenCalledWith('/workspace', {
      version: 1,
      pendingChangedFiles: [],
    });
    expect(vscode.workspace.createFileSystemWatcher).toHaveBeenCalledWith('**/.codegraphy/settings.json');
    expect(context.subscriptions).toHaveLength(2);

    const watcherDisposable = context.subscriptions[0];
    const teardownDisposable = context.subscriptions[1];
    const changeListener = (currentHarness.watcher.onDidChange.mock.calls as unknown[][])[0]?.[0] as (() => void) | undefined;
    const createListener = (currentHarness.watcher.onDidCreate.mock.calls as unknown[][])[0]?.[0] as (() => void) | undefined;
    const deleteListener = (currentHarness.watcher.onDidDelete.mock.calls as unknown[][])[0]?.[0] as (() => void) | undefined;

    changeListener?.();
    createListener?.();
    deleteListener?.();
    expect(currentHarness.getLastStore().reload).toHaveBeenCalledTimes(3);

    watcherDisposable.dispose();
    expect(currentHarness.watcherDisposables.change.dispose).toHaveBeenCalledOnce();
    expect(currentHarness.watcherDisposables.create.dispose).toHaveBeenCalledOnce();
    expect(currentHarness.watcherDisposables.delete.dispose).toHaveBeenCalledOnce();
    expect(currentHarness.watcher.dispose).toHaveBeenCalledOnce();

    teardownDisposable.dispose();
    expect(getCodeGraphyConfiguration().get('showOrphans', true)).toBe(true);
  });

  it('wraps the workspace configuration when no repo-local store is active', async () => {
    currentHarness.workspaceConfiguration.get.mockReturnValue(false);
    currentHarness.workspaceConfiguration.inspect.mockReturnValue({ workspaceValue: 3 });
    const configuration = getCodeGraphyConfiguration();

    expect(configuration.get('showOrphans', true)).toBe(false);
    expect(configuration.inspect('depthLimit')).toEqual({ workspaceValue: 3 });

    await configuration.update('showOrphans', false, vscode.ConfigurationTarget.Workspace);
    expect(currentHarness.workspaceConfiguration.update).toHaveBeenCalledWith(
      'showOrphans',
      false,
      vscode.ConfigurationTarget.Workspace,
    );
  });

  it('uses the repo-local store for reads, writes, and change listeners once initialized', async () => {
    const context = createContext();
    initializeCurrentCodeGraphyConfiguration(context as never);
    const store = currentHarness.getLastStore();
    const listener = vi.fn();
    const storeDisposable = { dispose: vi.fn() };
    store.onDidChange.mockReturnValue(storeDisposable);

    expect(getCodeGraphyConfiguration()).toBe(store as never);

    await updateCodeGraphyConfigurationSilently('showOrphans', false);
    expect(store.updateSilently).toHaveBeenCalledWith('showOrphans', false);

    expect(onDidChangeCodeGraphyConfiguration(listener)).toBe(storeDisposable);
    expect(store.onDidChange).toHaveBeenCalledWith(listener);
    expect(vscode.workspace.onDidChangeConfiguration).not.toHaveBeenCalled();
  });

  it('falls back to workspace configuration updates and listeners when no repo-local store exists', async () => {
    const listener = vi.fn();
    const changeDisposable = { dispose: vi.fn() };
    currentHarness.onDidChangeConfiguration.mockReturnValue(changeDisposable);

    await updateCodeGraphyConfigurationSilently('showOrphans', false);
    expect(currentHarness.workspaceConfiguration.update).toHaveBeenCalledWith(
      'showOrphans',
      false,
      undefined,
    );

    expect(onDidChangeCodeGraphyConfiguration(listener)).toBe(changeDisposable);
    expect(vscode.workspace.onDidChangeConfiguration).toHaveBeenCalledWith(listener);
  });
});
