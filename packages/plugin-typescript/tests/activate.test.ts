import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const sourceFixtureWorkspacePath = path.resolve(__dirname, '../../extension/test-fixtures/workspace');
const installedWithCoreTimeoutMs = 30_000;

const mockState = vi.hoisted(() => ({
  getExtension: vi.fn(),
  registerUriHandler: vi.fn(() => ({ dispose: vi.fn() })),
  registerWebviewViewProvider: vi.fn(() => ({ dispose: vi.fn() })),
  registerCommand: vi.fn(() => ({ dispose: vi.fn() })),
  getConfiguration: vi.fn(),
  fsStat: vi.fn(),
  databaseCache: {
    clearWorkspaceAnalysisDatabaseCache: vi.fn(),
    getWorkspaceAnalysisDatabasePath: vi.fn((workspaceRoot: string) => `${workspaceRoot}/.codegraphy/graph.lbug`),
    loadWorkspaceAnalysisDatabaseCache: vi.fn(() => ({ files: {}, version: '2.0.0' })),
    readWorkspaceAnalysisDatabaseSnapshot: vi.fn(() => ({ files: [], symbols: [], relations: [] })),
    saveWorkspaceAnalysisDatabaseCache: vi.fn(),
  },
  workspaceFoldersValue: undefined as
    | Array<{ uri: { fsPath: string; path: string }; name: string; index: number }>
    | undefined,
}));

let fixtureWorkspacePath = sourceFixtureWorkspacePath;

vi.mock('../../extension/src/extension/pipeline/database/cache', () => ({
  clearWorkspaceAnalysisDatabaseCache: mockState.databaseCache.clearWorkspaceAnalysisDatabaseCache,
  getWorkspaceAnalysisDatabasePath: mockState.databaseCache.getWorkspaceAnalysisDatabasePath,
  loadWorkspaceAnalysisDatabaseCache: mockState.databaseCache.loadWorkspaceAnalysisDatabaseCache,
  readWorkspaceAnalysisDatabaseSnapshot: mockState.databaseCache.readWorkspaceAnalysisDatabaseSnapshot,
  saveWorkspaceAnalysisDatabaseCache: mockState.databaseCache.saveWorkspaceAnalysisDatabaseCache,
}));

vi.mock('../../extension/src/extension/pipeline/database/cache.ts', () => ({
  clearWorkspaceAnalysisDatabaseCache: mockState.databaseCache.clearWorkspaceAnalysisDatabaseCache,
  getWorkspaceAnalysisDatabasePath: mockState.databaseCache.getWorkspaceAnalysisDatabasePath,
  loadWorkspaceAnalysisDatabaseCache: mockState.databaseCache.loadWorkspaceAnalysisDatabaseCache,
  readWorkspaceAnalysisDatabaseSnapshot: mockState.databaseCache.readWorkspaceAnalysisDatabaseSnapshot,
  saveWorkspaceAnalysisDatabaseCache: mockState.databaseCache.saveWorkspaceAnalysisDatabaseCache,
}));

vi.mock('../../extension/src/extension/pipeline/database/cache/storage.ts', () => ({
  clearWorkspaceAnalysisDatabaseCache: mockState.databaseCache.clearWorkspaceAnalysisDatabaseCache,
  getWorkspaceAnalysisDatabasePath: mockState.databaseCache.getWorkspaceAnalysisDatabasePath,
  loadWorkspaceAnalysisDatabaseCache: mockState.databaseCache.loadWorkspaceAnalysisDatabaseCache,
  readWorkspaceAnalysisDatabaseSnapshot: mockState.databaseCache.readWorkspaceAnalysisDatabaseSnapshot,
  saveWorkspaceAnalysisDatabaseCache: mockState.databaseCache.saveWorkspaceAnalysisDatabaseCache,
}));

vi.mock('vscode', () => ({
  Uri: {
    file: (filePath: string) => ({ fsPath: filePath, path: filePath }),
    joinPath: (base: { path: string }, ...segments: string[]) => ({
      fsPath: [base.path, ...segments].join('/'),
      path: [base.path, ...segments].join('/'),
    }),
  },
  extensions: {
    getExtension: mockState.getExtension,
    all: [],
  },
  window: {
    registerUriHandler: mockState.registerUriHandler,
    registerWebviewViewProvider: mockState.registerWebviewViewProvider,
    showInformationMessage: vi.fn(),
    showErrorMessage: vi.fn(),
    onDidChangeActiveTextEditor: vi.fn(() => ({ dispose: vi.fn() })),
  },
  commands: {
    registerCommand: mockState.registerCommand,
    executeCommand: vi.fn(),
  },
  workspace: {
    getConfiguration: mockState.getConfiguration,
    onDidChangeConfiguration: vi.fn(() => ({ dispose: vi.fn() })),
    onDidSaveTextDocument: vi.fn(() => ({ dispose: vi.fn() })),
    createFileSystemWatcher: vi.fn(() => ({
      onDidCreate: vi.fn(() => ({ dispose: vi.fn() })),
      onDidDelete: vi.fn(() => ({ dispose: vi.fn() })),
      onDidChange: vi.fn(() => ({ dispose: vi.fn() })),
      dispose: vi.fn(),
    })),
    get workspaceFolders() {
      return mockState.workspaceFoldersValue;
    },
    fs: {
      stat: mockState.fsStat,
    },
  },
}));

import * as vscode from 'vscode';

function createContext() {
  return {
    subscriptions: [] as { dispose: () => void }[],
    extensionUri: vscode.Uri.file('/test/extension'),
    workspaceState: {
      get: vi.fn(() => undefined),
      update: vi.fn(() => Promise.resolve()),
    },
  };
}

function getRegisteredProvider() {
  return mockState.registerWebviewViewProvider.mock.calls[0]?.[1];
}

describe('plugin-typescript/activate', () => {
  beforeEach(async () => {
    vi.resetModules();
    vi.clearAllMocks();
    fixtureWorkspacePath = await fs.mkdtemp(path.join(os.tmpdir(), 'codegraphy-typescript-activate-'));
    await fs.cp(sourceFixtureWorkspacePath, fixtureWorkspacePath, { recursive: true });
    mockState.workspaceFoldersValue = [
      { uri: vscode.Uri.file(fixtureWorkspacePath), name: 'workspace', index: 0 },
    ];

    mockState.getConfiguration.mockReturnValue({
      get: vi.fn((_key: string, defaultValue: unknown) => defaultValue),
      inspect: vi.fn(() => undefined),
      update: vi.fn(),
    });

    mockState.fsStat.mockImplementation(async (uri: { fsPath: string }) => {
      const stat = await fs.stat(uri.fsPath);
      return {
        mtime: stat.mtimeMs,
        size: stat.size,
      };
    });

    mockState.databaseCache.loadWorkspaceAnalysisDatabaseCache.mockReturnValue({
      files: {},
      version: '2.0.0',
    });
    mockState.databaseCache.readWorkspaceAnalysisDatabaseSnapshot.mockReturnValue({
      files: [],
      symbols: [],
      relations: [],
    });
  });

  afterEach(async () => {
    await fs.rm(fixtureWorkspacePath, { recursive: true, force: true });
    fixtureWorkspacePath = sourceFixtureWorkspacePath;
  });

  it('registers the TypeScript plugin with the core extension', { timeout: installedWithCoreTimeoutMs }, async () => {
    const registerPlugin = vi.fn();
    mockState.getExtension.mockReturnValue({
      isActive: false,
      activate: vi.fn(async () => ({ registerPlugin })),
    });

    const { activate } = await import('../src/activate');
    const context = { extensionUri: { fsPath: '/plugins/typescript' } };

    await activate(context as never);

    expect(mockState.getExtension).toHaveBeenCalledWith('codegraphy.codegraphy');
    expect(registerPlugin).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'codegraphy.typescript' }),
      { extensionUri: context.extensionUri },
    );
  });

  it('returns without registering when the core extension is unavailable', async () => {
    mockState.getExtension.mockReturnValue(undefined);

    const { activate } = await import('../src/activate');

    await expect(activate({ extensionUri: { fsPath: '/plugins/typescript' } } as never)).resolves.toBeUndefined();
  });

  it('returns without registering when the core extension does not expose the api after activation', async () => {
    const registerPlugin = vi.fn();
    mockState.getExtension.mockReturnValue({
      isActive: false,
      activate: vi.fn(async () => undefined),
      exports: { registerPlugin },
    });

    const { activate } = await import('../src/activate');

    await expect(activate({ extensionUri: { fsPath: '/plugins/typescript' } } as never)).resolves.toBeUndefined();
    expect(registerPlugin).not.toHaveBeenCalled();
  });

  it(
    'establishes TypeScript connections when installed with the core extension',
    { timeout: installedWithCoreTimeoutMs },
    async () => {
    const { activate: activateCore } = await import('../../extension/src/extension/activate');
    const { getGraphViewProviderInternals } = await import(
      '../../extension/tests/extension/graphViewProvider/internals'
    );

    const api = activateCore(createContext() as never);
    mockState.getExtension.mockReturnValue({
      id: 'codegraphy.codegraphy',
      isActive: true,
      exports: api,
    });

    const { activate } = await import('../src/activate');
    await activate({ extensionUri: vscode.Uri.file('/plugins/typescript') } as never);

    const provider = getRegisteredProvider();
    const internals = getGraphViewProviderInternals(provider);
    await internals._analysisMethods._analyzeAndSendData();

    expect(api.getGraphData().edges).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          from: 'src/index.ts',
          to: 'src/utils.ts',
        }),
      ]),
    );
    expect(mockState.databaseCache.loadWorkspaceAnalysisDatabaseCache).toHaveBeenCalledWith(
      fixtureWorkspacePath,
    );
    expect(mockState.databaseCache.saveWorkspaceAnalysisDatabaseCache).toHaveBeenCalled();
    },
  );
});
