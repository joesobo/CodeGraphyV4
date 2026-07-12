import { beforeEach, describe, expect, it, vi } from 'vitest';
import path from 'path';
import * as vscode from 'vscode';
import type { IFileAnalysisResult, IPlugin, IPluginAnalysisContext } from '../../../src/core/plugins/types/contracts';
import { WorkspacePipeline } from '../../../src/extension/pipeline/service/lifecycleFacade';
import {
  BASELINE_ANALYSIS_CACHE_TIER,
  SYMBOLS_ANALYSIS_CACHE_TIER,
  createPluginAnalysisCacheTier,
} from '../../../src/extension/pipeline/fileAnalysis';

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

function createSymbolAnalysisResult(
  filePath: string,
): IFileAnalysisResult {
  return {
    filePath,
    relations: [],
    symbols: [
      {
        filePath,
        id: `${filePath}:function:run`,
        kind: 'function',
        name: 'run',
      },
    ],
  };
}

function readCacheTiers(analysis: IFileAnalysisResult): string[] {
  return (analysis as IFileAnalysisResult & { cache?: { tiers?: string[] } }).cache?.tiers ?? [];
}

function expectWorkspaceAnalysisContext(symbols: boolean): IPluginAnalysisContext {
  return expect.objectContaining({
    features: { symbols },
    fileSystem: expect.objectContaining({
      exists: expect.any(Function),
      isDirectory: expect.any(Function),
      isFile: expect.any(Function),
      listDirectory: expect.any(Function),
      readTextFile: expect.any(Function),
    }),
  }) as IPluginAnalysisContext;
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
      { plugin: typescriptPlugin, builtIn: false },
    ]);
    vi.spyOn(analyzerPrivate._registry, 'getPluginForFile').mockReturnValue(typescriptPlugin);

    const statuses = analyzer.getPluginStatuses(new Set());

    expect(statuses).toEqual(expect.arrayContaining([
      expect.objectContaining({
        id: 'plugin.typescript',
        connectionCount: 1,
        status: 'active',
      }),
    ]));
  });

  it('delegates file analysis through workspace pipeline adapters', async () => {
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
          workspaceRoot: string,
          analysisContext: IPluginAnalysisContext,
      ) => Promise<IFileAnalysisResult | null>;
      };
      _config: {
        get<T>(key: string, defaultValue: T): T;
      };
      _analyzeFiles: WorkspacePipeline['_analyzeFiles'];
    };
    const eventBus = { emit: vi.fn() };
    const file = createDiscoveredFile('src/index.ts');
    const getFileStatSpy = vi.spyOn(analyzerPrivate, '_getFileStat').mockResolvedValue({ mtime: 10, size: 4 });
    const readContentSpy = vi.spyOn(analyzerPrivate._discovery, 'readContent').mockResolvedValue("import './utils'");
    const analyzeFileSpy = vi
      .spyOn(analyzerPrivate._registry, 'analyzeFileResult')
      .mockResolvedValue(createEmptyAnalysisResult(file.absolutePath));

    analyzer.setEventBus(eventBus as never);
    const result = await analyzerPrivate._analyzeFiles([file], '/test/workspace');

    expect(result).toEqual({
      cacheHits: 0,
      cacheMisses: 1,
      fileAnalysis: new Map([
        ['src/index.ts', {
          ...createEmptyAnalysisResult(file.absolutePath),
          cache: {
            tiers: [BASELINE_ANALYSIS_CACHE_TIER],
          },
        }],
      ]),
      fileConnections: new Map([['src/index.ts', []]]),
    });
    expect(getFileStatSpy).toHaveBeenCalledWith(file.absolutePath);
    expect(readContentSpy).toHaveBeenCalledWith(file);
    expect(analyzeFileSpy).toHaveBeenCalledWith(
      file.absolutePath,
      "import './utils'",
      '/test/workspace',
      expectWorkspaceAnalysisContext(false),
      { disabledPlugins: new Set() },
    );
    expect(eventBus.emit).toHaveBeenCalledWith('analysis:fileProcessed', {
      filePath: file.relativePath,
      connections: [],
    });
    expect(logSpy).toHaveBeenCalledWith('[CodeGraphy] Analysis: 0 cache hits, 1 misses');
  });

  it('requests symbol cache enrichment when Symbols are visible', async () => {
    const analyzer = new WorkspacePipeline(
      createContext() as unknown as vscode.ExtensionContext
    );
    const analyzerPrivate = analyzer as unknown as {
      _cache: { files: Record<string, { analysis: IFileAnalysisResult }>; version: string };
      _config: {
        get<T>(key: string, defaultValue: T): T;
      };
      _discovery: { readContent: (file: { relativePath: string }) => Promise<string> };
      _getFileStat: (filePath: string) => Promise<{ mtime: number; size: number } | null>;
      _registry: {
        analyzeFileResult: (
          absolutePath: string,
          content: string,
          workspaceRoot: string,
          analysisContext: IPluginAnalysisContext,
        ) => Promise<IFileAnalysisResult | null>;
      };
      _analyzeFiles: WorkspacePipeline['_analyzeFiles'];
    };
    const file = createDiscoveredFile('src/index.ts');
    vi.spyOn(analyzerPrivate._config, 'get').mockImplementation(<T>(key: string, defaultValue: T): T => (
      key === 'nodeVisibility'
        ? { symbol: true, 'symbol:function': true } as T
        : defaultValue
    ));
    vi.spyOn(analyzerPrivate, '_getFileStat').mockResolvedValue({ mtime: 10, size: 4 });
    vi.spyOn(analyzerPrivate._discovery, 'readContent').mockResolvedValue('function run() {}');
    vi.spyOn(analyzerPrivate._registry, 'analyzeFileResult')
      .mockResolvedValue(createSymbolAnalysisResult(file.absolutePath));

    const result = await analyzerPrivate._analyzeFiles([file], '/test/workspace');

    expect(readCacheTiers(analyzerPrivate._cache.files['src/index.ts'].analysis)).toEqual([
      BASELINE_ANALYSIS_CACHE_TIER,
      SYMBOLS_ANALYSIS_CACHE_TIER,
    ]);
    expect(result.fileAnalysis.get('src/index.ts')?.symbols).toHaveLength(1);
  });

  it('requests plugin cache enrichment for scoped plugin refreshes', async () => {
    const analyzer = new WorkspacePipeline(
      createContext() as unknown as vscode.ExtensionContext
    );
    const analyzerPrivate = analyzer as unknown as {
      _cache: { files: Record<string, { analysis: IFileAnalysisResult }>; version: string };
      _discovery: { readContent: (file: { relativePath: string }) => Promise<string> };
      _getFileStat: (filePath: string) => Promise<{ mtime: number; size: number } | null>;
      _registry: {
        analyzeFileResult: (
          absolutePath: string,
          content: string,
          workspaceRoot: string,
          analysisContext: IPluginAnalysisContext,
        ) => Promise<IFileAnalysisResult | null>;
        analyzeFileResultForPlugins: (
          absolutePath: string,
          content: string,
          workspaceRoot: string,
          pluginIds: readonly string[],
          analysisContext: IPluginAnalysisContext,
        ) => Promise<IFileAnalysisResult | null>;
      };
      _analyzeFiles: WorkspacePipeline['_analyzeFiles'];
    };
    const file = createDiscoveredFile('src/index.py');
    vi.spyOn(analyzerPrivate, '_getFileStat').mockResolvedValue({ mtime: 10, size: 4 });
    vi.spyOn(analyzerPrivate._discovery, 'readContent').mockResolvedValue('print("hi")');
    const analyzeFileSpy = vi.spyOn(analyzerPrivate._registry, 'analyzeFileResult')
      .mockResolvedValue(createEmptyAnalysisResult(file.absolutePath));
    const analyzePluginFileSpy = vi.spyOn(analyzerPrivate._registry, 'analyzeFileResultForPlugins')
      .mockResolvedValue(createEmptyAnalysisResult(file.absolutePath));

    await analyzerPrivate._analyzeFiles(
      [file],
      '/test/workspace',
      undefined,
      undefined,
      ['codegraphy.vue'],
    );

    expect(readCacheTiers(analyzerPrivate._cache.files['src/index.py'].analysis)).toEqual([
      BASELINE_ANALYSIS_CACHE_TIER,
      createPluginAnalysisCacheTier('codegraphy.vue'),
    ]);
    expect(analyzePluginFileSpy).toHaveBeenCalledWith(
      file.absolutePath,
      'print("hi")',
      '/test/workspace',
      ['codegraphy.vue'],
      expectWorkspaceAnalysisContext(false),
      { disabledPlugins: new Set() },
    );
    expect(analyzeFileSpy).not.toHaveBeenCalled();
  });
});
