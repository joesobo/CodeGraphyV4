import * as fs from 'node:fs/promises';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import * as vscode from 'vscode';
import { activate } from '../../../../src/extension/activate';
import type { GraphViewProvider } from '../../../../src/extension/graphViewProvider';
import { getGraphViewProviderInternals } from '../../graphViewProvider/internals';
import {
  createPluginIntegrationWorkspace,
  installPluginIntegrationPackage,
  type PluginIntegrationWorkspace,
} from '../workspaceFixture';

const mockState = vi.hoisted(() => ({
  databaseCache: {
    clearWorkspaceAnalysisDatabaseCache: vi.fn(),
    getWorkspaceAnalysisDatabasePath: vi.fn((workspaceRoot: string) => `${workspaceRoot}/.codegraphy/graph.sqlite`),
    loadWorkspaceAnalysisDatabaseCache: vi.fn(() => ({ files: {}, version: '2.0.0' })),
    loadWorkspaceAnalysisDatabaseCacheAsync: vi.fn(async () => ({ files: {}, version: '2.0.0' })),
    readWorkspaceAnalysisDatabaseSnapshot: vi.fn(() => ({ files: [], symbols: [], relations: [] })),
    saveWorkspaceAnalysisDatabaseCacheAsync: vi.fn(async () => undefined),
  },
}));

let workspaceFoldersValue:
  | Array<{ uri: { fsPath: string; path: string }; name: string; index: number }>
  | undefined;
let workspaceFixture: PluginIntegrationWorkspace | undefined;
let currentContext:
  | {
      subscriptions: Array<{ dispose: () => void }>;
    }
  | undefined;
let originalHome: string | undefined;
let installedPackage:
  | Awaited<ReturnType<typeof installPluginIntegrationPackage>>
  | undefined;

Object.defineProperty(vscode.workspace, 'workspaceFolders', {
  get: () => workspaceFoldersValue,
  configurable: true,
});

vi.mock('../../../../src/extension/pipeline/database/cache/storage.ts', () => ({
  clearWorkspaceAnalysisDatabaseCache: mockState.databaseCache.clearWorkspaceAnalysisDatabaseCache,
  getWorkspaceAnalysisDatabasePath: mockState.databaseCache.getWorkspaceAnalysisDatabasePath,
  loadWorkspaceAnalysisDatabaseCache: mockState.databaseCache.loadWorkspaceAnalysisDatabaseCache,
  loadWorkspaceAnalysisDatabaseCacheAsync: mockState.databaseCache.loadWorkspaceAnalysisDatabaseCacheAsync,
  readWorkspaceAnalysisDatabaseSnapshot: mockState.databaseCache.readWorkspaceAnalysisDatabaseSnapshot,
  saveWorkspaceAnalysisDatabaseCacheAsync: mockState.databaseCache.saveWorkspaceAnalysisDatabaseCacheAsync,
}));

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

function getRegisteredProvider(): GraphViewProvider {
  return (
    vscode.window.registerWebviewViewProvider as unknown as { mock: { calls: unknown[][] } }
  ).mock.calls[0]?.[1] as GraphViewProvider;
}

describe('extension/pluginIntegration/installedPluginActivation', () => {
  beforeAll(async () => {
    workspaceFixture = await createPluginIntegrationWorkspace();
    installedPackage = await installPluginIntegrationPackage(
      workspaceFixture.workspacePath,
      workspaceFixture.scratchPath,
    );
  });

  beforeEach(() => {
    currentContext = undefined;
    originalHome = process.env.HOME;
    process.env.HOME = installedPackage!.homeDir;
    workspaceFoldersValue = [
      { uri: vscode.Uri.file(workspaceFixture!.workspacePath), name: 'workspace', index: 0 },
    ];
    vi.clearAllMocks();

    (vscode.workspace.getConfiguration as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      get: vi.fn((_key: string, defaultValue: unknown) => defaultValue),
      inspect: vi.fn(() => undefined),
      update: vi.fn(),
    });

    (vscode.workspace.fs.stat as unknown as ReturnType<typeof vi.fn>).mockImplementation(
      async (uri: { fsPath: string }) => {
        const stat = await fs.stat(uri.fsPath);
        return {
          mtime: stat.mtimeMs,
          size: stat.size,
        };
      },
    );
    mockState.databaseCache.loadWorkspaceAnalysisDatabaseCache.mockReturnValue({
      files: {},
      version: '2.0.0',
    });
    mockState.databaseCache.loadWorkspaceAnalysisDatabaseCacheAsync.mockResolvedValue({
      files: {},
      version: '2.0.0',
    });
    mockState.databaseCache.readWorkspaceAnalysisDatabaseSnapshot.mockReturnValue({
      files: [],
      symbols: [],
      relations: [],
    });
  });

  afterEach(() => {
    for (const subscription of [...(currentContext?.subscriptions ?? [])].reverse()) {
      subscription?.dispose();
    }
    if (originalHome === undefined) {
      delete process.env.HOME;
    } else {
      process.env.HOME = originalHome;
    }
    currentContext = undefined;
  });

  afterAll(async () => {
    await workspaceFixture?.cleanup();
    workspaceFixture = undefined;
  });

  it('loads package-enabled plugins before the first analysis runs', async () => {
    currentContext = createContext();
    const api = activate(currentContext as unknown as vscode.ExtensionContext);

    const provider = getRegisteredProvider();
    const internals = getGraphViewProviderInternals(provider);
    await internals._analysisMethods._analyzeAndSendData();
    await internals._analysisMethods._analyzeAndSendData();

    expect(api.getGraphData().edges).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          from: 'src/index.ts',
          to: 'src/utils.ts',
        }),
      ]),
    );

    const pluginIds = (
      (provider as unknown as {
        _analyzer: { registry: { list: () => Array<{ plugin: { id: string } }> } };
      })._analyzer.registry.list()
    ).map((pluginInfo) => pluginInfo.plugin.id);

    expect(pluginIds).toEqual(
      expect.arrayContaining(['codegraphy.markdown', installedPackage!.pluginId]),
    );
    expect(mockState.databaseCache.loadWorkspaceAnalysisDatabaseCache).toHaveBeenCalled();
    expect(mockState.databaseCache.loadWorkspaceAnalysisDatabaseCacheAsync).not.toHaveBeenCalled();
    expect(mockState.databaseCache.saveWorkspaceAnalysisDatabaseCacheAsync).toHaveBeenCalled();
  }, 15000);
});
