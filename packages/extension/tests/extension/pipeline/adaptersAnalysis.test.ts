import { describe, expect, it, vi, beforeEach } from 'vitest';
import {
  createContext,
  createDiscoveredFile,
  createEmptyAnalysisResult,
  createSymbolAnalysisResult,
  readCacheTiers,
  expectWorkspaceAnalysisContext,
  vscode,
  WorkspacePipeline,
  BASELINE_ANALYSIS_CACHE_TIER,
  SYMBOLS_ANALYSIS_CACHE_TIER,
  createPluginAnalysisCacheTier,
  IFileAnalysisResult,
  IPluginAnalysisContext,
  setUpAdapters,
} from './adaptersFixture';

describe('WorkspacePipeline analysis adapters', () => {
  beforeEach(setUpAdapters);

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
