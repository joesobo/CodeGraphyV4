import { beforeEach, describe, expect, it, vi } from 'vitest';
import path from 'path';
import * as vscode from 'vscode';
import type { IProjectedConnection, IFileAnalysisResult, IPlugin } from '../../../src/core/plugins/types/contracts';
import { WorkspacePipeline } from '../../../src/extension/pipeline/service/lifecycleFacade';
import * as workspaceFileAnalysisModule from '../../../src/extension/pipeline/fileAnalysis';

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
    analyzeFile: vi.fn(async (filePath: string) => ({ filePath, relations: [] })),
  } as IPlugin;
}

function createDiscoveredFile(relativePath: string) {
  return {
    absolutePath: `/test/workspace/${relativePath}`,
    extension: path.extname(relativePath),
    name: path.basename(relativePath),
    relativePath,
  };
}

function createEmptyAnalysisResult(
  filePath: string,
): IFileAnalysisResult {
  return {
    filePath,
    relations: [],
  };
}

describe('WorkspacePipeline adapters', () => {
  beforeEach(() => {
    workspaceFoldersValue = [
      { uri: vscode.Uri.file('/test/workspace'), name: 'workspace', index: 0 },
    ];
    vi.clearAllMocks();
  });

  it('initializes registered plugins with the current workspace root', async () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const analyzer = new WorkspacePipeline(
      createContext() as unknown as vscode.ExtensionContext
    );
    const initializeAllSpy = vi.spyOn((analyzer as unknown as {
      _registry: { initializeAll: (workspaceRoot: string) => Promise<void> };
    })._registry, 'initializeAll').mockResolvedValue();

    await analyzer.initialize();

    expect(initializeAllSpy).toHaveBeenCalledWith('/test/workspace');
    expect(logSpy).toHaveBeenCalledWith('[CodeGraphy] WorkspacePipeline initialized');
  });

  it('skips plugin initialization when no workspace root is available', async () => {
    workspaceFoldersValue = undefined;
    const analyzer = new WorkspacePipeline(
      createContext() as unknown as vscode.ExtensionContext
    );
    const initializeAllSpy = vi.spyOn((analyzer as unknown as {
      _registry: { initializeAll: (workspaceRoot: string) => Promise<void> };
    })._registry, 'initializeAll').mockResolvedValue();

    await analyzer.initialize();

    expect(initializeAllSpy).not.toHaveBeenCalled();
  });

  it('uses registry file lookup when calculating plugin statuses', () => {
    const analyzer = new WorkspacePipeline(
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
      ['src/index.ts', [{ specifier: './utils', resolvedPath: '/test/workspace/src/utils.ts', type: 'static' , sourceId: 'test-source', kind: 'import', pluginId: 'plugin.typescript' }]],
    ]);
    analyzerPrivate._lastWorkspaceRoot = '/test/workspace';
    vi.spyOn(analyzerPrivate._registry, 'list').mockReturnValue([
      { plugin: typescriptPlugin, builtIn: true },
    ]);
    vi.spyOn(analyzerPrivate._registry, 'getPluginForFile').mockReturnValue(typescriptPlugin);

    const statuses = analyzer.getPluginStatuses(new Set());

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
    const analyzer = new WorkspacePipeline(
      createContext() as unknown as vscode.ExtensionContext
    );
    const analyzerPrivate = analyzer as unknown as {
      _cache: { files: Record<string, unknown>; version: string };
      _discovery: { readContent: (file: { relativePath: string }) => Promise<string> };
      _getFileStat: (filePath: string) => Promise<{ mtime: number; size: number } | null>;
      _registry: {
        analyzeFileResult: (
          absolutePath: string,
          content: string,
          workspaceRoot: string
        ) => Promise<IFileAnalysisResult | null>;
      };
      _analyzeFiles: (
        files: Array<{ absolutePath: string; extension: string; name: string; relativePath: string }>,
        workspaceRoot: string
      ) => Promise<{
        fileAnalysis: Map<string, IFileAnalysisResult>;
        fileConnections: Map<string, IProjectedConnection[]>;
      }>;
    };
    const eventBus = { emit: vi.fn() };
    const expectedConnections = new Map<string, IProjectedConnection[]>([['src/index.ts', []]]);
    const file = createDiscoveredFile('src/index.ts');
    const analyzeWorkspaceFilesSpy = vi.spyOn(workspaceFileAnalysisModule, 'analyzeWorkspaceFiles').mockResolvedValue({
      cacheHits: 1,
      cacheMisses: 2,
      fileAnalysis: new Map([
        ['src/index.ts', createEmptyAnalysisResult(file.absolutePath)],
      ]),
      fileConnections: expectedConnections,
    });
    const getFileStatSpy = vi.spyOn(analyzerPrivate, '_getFileStat').mockResolvedValue({ mtime: 10, size: 4 });
    const readContentSpy = vi.spyOn(analyzerPrivate._discovery, 'readContent').mockResolvedValue("import './utils'");
    const analyzeFileSpy = vi
      .spyOn(analyzerPrivate._registry, 'analyzeFileResult')
      .mockResolvedValue(createEmptyAnalysisResult(file.absolutePath));

    analyzer.setEventBus(eventBus as never);
    const result = await analyzerPrivate._analyzeFiles([file], '/test/workspace');
    const options = analyzeWorkspaceFilesSpy.mock.calls[0][0];

    expect(result).toEqual({
      cacheHits: 1,
      cacheMisses: 2,
      fileAnalysis: new Map([
        ['src/index.ts', createEmptyAnalysisResult(file.absolutePath)],
      ]),
      fileConnections: expectedConnections,
    });
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
