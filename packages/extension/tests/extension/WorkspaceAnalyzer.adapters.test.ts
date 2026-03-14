import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as vscode from 'vscode';
import type { IPlugin } from '../../src/core/plugins';
import { WorkspaceAnalyzer } from '../../src/extension/WorkspaceAnalyzer';
import * as workspaceFileAnalysisModule from '../../src/extension/workspaceFileAnalysis';

let workspaceFoldersValue:
  | Array<{ uri: { fsPath: string; path: string }; name: string; index: number }>
  | undefined;

Object.defineProperty(vscode.workspace, 'workspaceFolders', {
  get: () => workspaceFoldersValue,
  configurable: true,
});

function createContext() {
  return {
    subscriptions: [],
    extensionUri: vscode.Uri.file('/test/extension'),
    workspaceState: {
      get: vi.fn(() => undefined),
      update: vi.fn(() => Promise.resolve()),
    },
  };
}

function createPlugin(id: string, name: string, supportedExtensions: string[]): IPlugin {
  return {
    id,
    name,
    version: '1.0.0',
    apiVersion: '^2.0.0',
    supportedExtensions,
    detectConnections: vi.fn(async () => []),
  };
}

describe('WorkspaceAnalyzer adapters', () => {
  beforeEach(() => {
    workspaceFoldersValue = [
      { uri: vscode.Uri.file('/test/workspace'), name: 'workspace', index: 0 },
    ];
    vi.clearAllMocks();
  });

  it('initializes registered plugins with the current workspace root', async () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const analyzer = new WorkspaceAnalyzer(
      createContext() as unknown as vscode.ExtensionContext
    );
    const initializeAllSpy = vi.spyOn((analyzer as unknown as {
      _registry: { initializeAll: (workspaceRoot: string) => Promise<void> };
    })._registry, 'initializeAll').mockResolvedValue();

    await analyzer.initialize();

    expect(initializeAllSpy).toHaveBeenCalledWith('/test/workspace');
    expect(logSpy).toHaveBeenCalledWith('[CodeGraphy] WorkspaceAnalyzer initialized');
  });

  it('skips plugin initialization when no workspace root is available', async () => {
    workspaceFoldersValue = undefined;
    const analyzer = new WorkspaceAnalyzer(
      createContext() as unknown as vscode.ExtensionContext
    );
    const initializeAllSpy = vi.spyOn((analyzer as unknown as {
      _registry: { initializeAll: (workspaceRoot: string) => Promise<void> };
    })._registry, 'initializeAll').mockResolvedValue();

    await analyzer.initialize();

    expect(initializeAllSpy).not.toHaveBeenCalled();
  });

  it('uses registry file lookup when calculating plugin statuses', () => {
    const analyzer = new WorkspaceAnalyzer(
      createContext() as unknown as vscode.ExtensionContext
    );
    const analyzerPrivate = analyzer as unknown as {
      _lastDiscoveredFiles: Array<{ relativePath: string }>;
      _lastFileConnections: Map<string, Array<{ resolvedPath: string; specifier: string; type: 'static' }>>;
      _lastWorkspaceRoot: string;
      _registry: {
        getPluginForFile: (filePath: string) => IPlugin | undefined;
        list: () => Array<{ builtIn: boolean; plugin: IPlugin }>;
      };
    };
    const typescriptPlugin = createPlugin('plugin.typescript', 'TypeScript', ['.ts']);

    analyzerPrivate._lastDiscoveredFiles = [{ relativePath: 'src/index.ts' }];
    analyzerPrivate._lastFileConnections = new Map([
      ['src/index.ts', [{ specifier: './utils', resolvedPath: '/test/workspace/src/utils.ts', type: 'static' }]],
    ]);
    analyzerPrivate._lastWorkspaceRoot = '/test/workspace';
    vi.spyOn(analyzerPrivate._registry, 'list').mockReturnValue([
      { plugin: typescriptPlugin, builtIn: true },
    ]);
    vi.spyOn(analyzerPrivate._registry, 'getPluginForFile').mockReturnValue(typescriptPlugin);

    const statuses = analyzer.getPluginStatuses(new Set(), new Set());

    expect(statuses).toEqual([
      expect.objectContaining({
        id: 'plugin.typescript',
        connectionCount: 1,
        status: 'active',
      }),
    ]);
  });

  it('delegates file analysis through workspaceFileAnalysis adapters', async () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const analyzer = new WorkspaceAnalyzer(
      createContext() as unknown as vscode.ExtensionContext
    );
    const analyzerPrivate = analyzer as unknown as {
      _cache: { files: Record<string, unknown>; version: string };
      _discovery: { readContent: (file: { relativePath: string }) => Promise<string> };
      _getFileStat: (filePath: string) => Promise<{ mtime: number; size: number } | null>;
      _registry: {
        analyzeFile: (
          absolutePath: string,
          content: string,
          workspaceRoot: string
        ) => Promise<unknown[]>;
      };
      _analyzeFiles: (
        files: Array<{ absolutePath: string; relativePath: string }>,
        workspaceRoot: string
      ) => Promise<Map<string, unknown[]>>;
    };
    const eventBus = { emit: vi.fn() };
    const expectedConnections = new Map<string, unknown[]>([['src/index.ts', []]]);
    const file = { absolutePath: '/test/workspace/src/index.ts', relativePath: 'src/index.ts' };
    const analyzeWorkspaceFilesSpy = vi.spyOn(workspaceFileAnalysisModule, 'analyzeWorkspaceFiles').mockResolvedValue({
      cacheHits: 1,
      cacheMisses: 2,
      fileConnections: expectedConnections,
    });
    const getFileStatSpy = vi.spyOn(analyzerPrivate, '_getFileStat').mockResolvedValue({ mtime: 10, size: 4 });
    const readContentSpy = vi.spyOn(analyzerPrivate._discovery, 'readContent').mockResolvedValue("import './utils'");
    const analyzeFileSpy = vi.spyOn(analyzerPrivate._registry, 'analyzeFile').mockResolvedValue([]);

    analyzer.setEventBus(eventBus as never);
    const result = await analyzerPrivate._analyzeFiles([file], '/test/workspace');
    const options = analyzeWorkspaceFilesSpy.mock.calls[0][0];

    expect(result).toBe(expectedConnections);
    expect(options.cache).toBe(analyzerPrivate._cache);
    expect(options.files).toEqual([file]);
    expect(options.workspaceRoot).toBe('/test/workspace');
    await options.getFileStat(file.absolutePath);
    expect(getFileStatSpy).toHaveBeenCalledWith(file.absolutePath);
    await options.readContent(file);
    expect(readContentSpy).toHaveBeenCalledWith(file);
    await options.analyzeFile(file.absolutePath, "import './utils'", '/test/workspace');
    expect(analyzeFileSpy).toHaveBeenCalledWith(file.absolutePath, "import './utils'", '/test/workspace');
    options.emitFileProcessed?.({
      filePath: 'src/index.ts',
      connections: [],
    });
    expect(eventBus.emit).toHaveBeenCalledWith('analysis:fileProcessed', {
      filePath: 'src/index.ts',
      connections: [],
    });
    expect(logSpy).toHaveBeenCalledWith('[CodeGraphy] Analysis: 1 cache hits, 2 misses');
  });
});
