import { describe, expect, it, vi } from 'vitest';
import type { IFileAnalysisResult } from '@codegraphy-dev/plugin-api';
import type { IDiscoveredFile } from '../../../src/discovery/contracts';
import type { IProjectedConnection } from '../../../src/analysis/projectedConnection';
import { createEmptyWorkspaceAnalysisCache } from '../../../src/analysis/cache';
import {
  BASELINE_ANALYSIS_CACHE_TIER,
  SYMBOLS_ANALYSIS_CACHE_TIER,
  createPluginAnalysisCacheTier,
} from '../../../src/analysis/fileAnalysis/cacheTiers';
import { analyzeWorkspaceFiles } from '../../../src/analysis/fileAnalysis/run';

type CachedTieredAnalysis = IFileAnalysisResult & {
  cache?: {
    tiers?: string[];
  };
};

function createFile(relativePath: string): IDiscoveredFile {
  const extensionIndex = relativePath.lastIndexOf('.');
  const slashIndex = relativePath.lastIndexOf('/');

  return {
    absolutePath: `/workspace/${relativePath}`,
    extension: extensionIndex >= 0 ? relativePath.slice(extensionIndex) : '',
    name: slashIndex >= 0 ? relativePath.slice(slashIndex + 1) : relativePath,
    relativePath,
  };
}

function createImportAnalysis(): IFileAnalysisResult {
  return {
    filePath: '/workspace/src/index.ts',
    relations: [
      {
        kind: 'import',
        sourceId: 'test-source',
        specifier: './utils',
        type: 'static',
        resolvedPath: '/workspace/src/utils.ts',
        fromFilePath: '/workspace/src/index.ts',
        toFilePath: '/workspace/src/utils.ts',
      },
    ],
  };
}

function createEmptyAnalysis(
  filePath = '/workspace/src/index.ts',
): IFileAnalysisResult {
  return {
    filePath,
    relations: [],
  };
}

function createSymbolAnalysis(): IFileAnalysisResult {
  return {
    filePath: '/workspace/src/index.ts',
    relations: [
      {
        kind: 'call',
        sourceId: 'test-source',
        type: 'static',
        fromFilePath: '/workspace/src/index.ts',
        toFilePath: '/workspace/src/utils.ts',
        fromSymbolId: '/workspace/src/index.ts:function:run',
        toSymbolId: '/workspace/src/utils.ts:function:boot',
      },
    ],
    symbols: [
      {
        id: '/workspace/src/index.ts:function:run',
        filePath: '/workspace/src/index.ts',
        kind: 'function',
        name: 'run',
      },
    ],
  };
}

function createPluginAnalysis(): IFileAnalysisResult {
  return {
    filePath: '/workspace/src/index.ts',
    relations: [
      {
        kind: 'plugin:edge',
        sourceId: 'test-plugin',
        pluginId: 'codegraphy.extra',
        type: 'static',
        fromFilePath: '/workspace/src/index.ts',
        toFilePath: '/workspace/src/extra.ts',
        resolvedPath: '/workspace/src/extra.ts',
      },
    ],
  };
}

function readCacheTiers(analysis: IFileAnalysisResult): string[] {
  return (analysis as CachedTieredAnalysis).cache?.tiers ?? [];
}

describe('pipeline/fileAnalysis', () => {
  it('reuses cached connections and backfills missing size on cache hits', async () => {
    const cache = createEmptyWorkspaceAnalysisCache();
    const cachedConnections: IProjectedConnection[] = [
      { specifier: './utils', resolvedPath: '/workspace/src/utils.ts', type: 'static' , sourceId: 'test-source', kind: 'import' },
    ];
    const cachedAnalysis = createImportAnalysis();
    cache.files['src/index.ts'] = {
      mtime: 25,
      analysis: cachedAnalysis,
    };

    const readContent = vi.fn(async () => 'ignored');
    const analyzeFile = vi.fn(async () => ({
      filePath: '/workspace/src/index.ts',
      relations: [],
    }));
    const onProgress = vi.fn();

    const result = await analyzeWorkspaceFiles({
      analyzeFile,
      cache,
      files: [createFile('src/index.ts')],
      getFileStat: vi.fn(async () => ({ mtime: 25, size: 99 })),
      onProgress,
      readContent,
      workspaceRoot: '/workspace',
    });

    expect(result.cacheHits).toBe(1);
    expect(result.cacheMisses).toBe(0);
    expect(result.fileConnections.get('src/index.ts')).toEqual(cachedConnections);
    expect(result.fileAnalysis.get('src/index.ts')).toEqual(cachedAnalysis);
    expect(cache.files['src/index.ts'].size).toBe(99);
    expect(readContent).not.toHaveBeenCalled();
    expect(analyzeFile).not.toHaveBeenCalled();
    expect(onProgress).toHaveBeenCalledWith({
      current: 1,
      total: 1,
      filePath: 'src/index.ts',
    });
  });

  it('keeps the cached size when a cache hit already has matching size data', async () => {
    const cache = createEmptyWorkspaceAnalysisCache();
    cache.files['src/index.ts'] = {
      mtime: 25,
      analysis: createEmptyAnalysis(),
      size: 12,
    };

    await analyzeWorkspaceFiles({
      analyzeFile: vi.fn(async () => createEmptyAnalysis()),
      cache,
      files: [createFile('src/index.ts')],
      getFileStat: vi.fn(async () => ({ mtime: 25, size: 12 })),
      readContent: vi.fn(async () => 'ignored'),
      workspaceRoot: '/workspace',
    });

    expect(cache.files['src/index.ts'].size).toBe(12);
  });

  it('treats a size change at the same mtime as a cache miss', async () => {
    const cache = createEmptyWorkspaceAnalysisCache();
    cache.files['src/index.ts'] = {
      mtime: 25,
      analysis: createEmptyAnalysis(),
      size: 12,
    };
    const analyzeFile = vi.fn(async () => createEmptyAnalysis());

    const result = await analyzeWorkspaceFiles({
      analyzeFile,
      cache,
      files: [createFile('src/index.ts')],
      getFileStat: vi.fn(async () => ({ mtime: 25, size: 99 })),
      readContent: vi.fn(async () => 'changed'),
      workspaceRoot: '/workspace',
    });

    expect(result.cacheHits).toBe(0);
    expect(result.cacheMisses).toBe(1);
    expect(analyzeFile).toHaveBeenCalledOnce();
  });

  it('treats a content change with the same mtime and size as a cache miss', async () => {
    const cache = createEmptyWorkspaceAnalysisCache();
    const file = createFile('src/index.ts');
    const analyzeFile = vi.fn(async () => createEmptyAnalysis());
    let content = 'first';
    const options = {
      analyzeFile,
      cache,
      files: [file],
      getFileStat: vi.fn(async () => ({ mtime: 25, size: 5 })),
      readContent: vi.fn(async () => content),
      workspaceRoot: '/workspace',
    };

    await analyzeWorkspaceFiles(options);
    content = 'other';
    const result = await analyzeWorkspaceFiles(options);

    expect(result.cacheHits).toBe(0);
    expect(result.cacheMisses).toBe(1);
    expect(analyzeFile).toHaveBeenCalledTimes(2);
  });

  it('analyzes uncached files and stores the new cache entry', async () => {
    const cache = createEmptyWorkspaceAnalysisCache();
    const connections: IProjectedConnection[] = [
      { specifier: './utils', resolvedPath: '/workspace/src/utils.ts', type: 'static' , sourceId: 'test-source', kind: 'import' },
    ];
    const analysis = createImportAnalysis();
    const onProgress = vi.fn();

    const result = await analyzeWorkspaceFiles({
      analyzeFile: vi.fn(async () => analysis),
      cache,
      files: [createFile('src/index.ts')],
      getFileStat: vi.fn(async () => ({ mtime: 50, size: 12 })),
      onProgress,
      readContent: vi.fn(async () => "import './utils'"),
      workspaceRoot: '/workspace',
    });

    expect(result.cacheHits).toBe(0);
    expect(result.cacheMisses).toBe(1);
    expect(result.fileConnections.get('src/index.ts')).toEqual(connections);
    expect(result.fileAnalysis.get('src/index.ts')).toEqual(analysis);
    expect(cache.files['src/index.ts']).toEqual({
      mtime: 50,
      analysis,
      contentHash: expect.any(String),
      size: 12,
    });
    expect(onProgress).toHaveBeenCalledWith({
      current: 1,
      total: 1,
      filePath: 'src/index.ts',
    });
  });

  it('treats stale cached entries as cache misses', async () => {
    const cache = createEmptyWorkspaceAnalysisCache();
    cache.files['src/index.ts'] = {
      mtime: 25,
      analysis: createEmptyAnalysis(),
      size: 12,
    };
    const readContent = vi.fn(async () => "import './utils'");
    const analyzeFile = vi.fn(async () => ({
      filePath: '/workspace/src/index.ts',
      relations: [],
    }));

    const result = await analyzeWorkspaceFiles({
      analyzeFile,
      cache,
      files: [createFile('src/index.ts')],
      getFileStat: vi.fn(async () => ({ mtime: 30, size: 99 })),
      readContent,
      workspaceRoot: '/workspace',
    });

    expect(result.cacheHits).toBe(0);
    expect(result.cacheMisses).toBe(1);
    expect(readContent).toHaveBeenCalledTimes(1);
    expect(analyzeFile).toHaveBeenCalledTimes(1);
  });

  it('emits file processed payloads for analyzed files', async () => {
    const emitFileProcessed = vi.fn();
    const analysis = createImportAnalysis();

    await analyzeWorkspaceFiles({
      analyzeFile: vi.fn(async () => analysis),
      cache: createEmptyWorkspaceAnalysisCache(),
      emitFileProcessed,
      files: [createFile('src/index.ts')],
      getFileStat: vi.fn(async () => ({ mtime: 10, size: 1 })),
      readContent: vi.fn(async () => "import './utils'"),
      workspaceRoot: '/workspace',
    });

    expect(emitFileProcessed).toHaveBeenCalledWith({
      filePath: 'src/index.ts',
      connections: [
        {
          specifier: './utils',
          resolvedPath: '/workspace/src/utils.ts',
        },
      ],
    });
  });

  it('stores zero mtime when file stats are unavailable', async () => {
    const cache = createEmptyWorkspaceAnalysisCache();

    await analyzeWorkspaceFiles({
      analyzeFile: vi.fn(async () => createEmptyAnalysis()),
      cache,
      files: [createFile('src/index.ts')],
      getFileStat: vi.fn(async () => null),
      readContent: vi.fn(async () => ''),
      workspaceRoot: '/workspace',
    });

    expect(cache.files['src/index.ts']).toEqual({
      mtime: 0,
      analysis: createEmptyAnalysis(),
      contentHash: expect.any(String),
      size: undefined,
    });
  });

  it('treats cached entries as misses when file stats are unavailable', async () => {
    const cache = createEmptyWorkspaceAnalysisCache();
    cache.files['src/index.ts'] = {
      mtime: 25,
      analysis: createEmptyAnalysis(),
    };
    const readContent = vi.fn(async () => '');
    const analyzeFile = vi.fn(async () => createEmptyAnalysis());

    await analyzeWorkspaceFiles({
      analyzeFile,
      cache,
      files: [createFile('src/index.ts')],
      getFileStat: vi.fn(async () => null),
      readContent,
      workspaceRoot: '/workspace',
    });

    expect(readContent).toHaveBeenCalledTimes(1);
    expect(analyzeFile).toHaveBeenCalledTimes(1);
  });

  it('reuses malformed cached entries without reading size from missing stats', async () => {
    const cache = createEmptyWorkspaceAnalysisCache();
    const cachedConnections: IProjectedConnection[] = [
      { specifier: './utils', resolvedPath: '/workspace/src/utils.ts', type: 'static' , sourceId: 'test-source', kind: 'import' },
    ];
    cache.files['src/index.ts'] = {
      mtime: undefined as unknown as number,
      analysis: createImportAnalysis(),
      size: undefined,
    };
    const readContent = vi.fn(async () => 'ignored');
    const analyzeFile = vi.fn(async () => createEmptyAnalysis());

    const result = await analyzeWorkspaceFiles({
      analyzeFile,
      cache,
      files: [createFile('src/index.ts')],
      getFileStat: vi.fn(async () => null),
      readContent,
      workspaceRoot: '/workspace',
    });

    expect(result.cacheHits).toBe(1);
    expect(result.cacheMisses).toBe(0);
    expect(result.fileConnections.get('src/index.ts')).toEqual(cachedConnections);
    expect(cache.files['src/index.ts'].size).toBeUndefined();
    expect(readContent).not.toHaveBeenCalled();
    expect(analyzeFile).not.toHaveBeenCalled();
  });

  it('stores baseline cache entries without symbol facts', async () => {
    const cache = createEmptyWorkspaceAnalysisCache();
    const analyzeFile = vi.fn(async () => createSymbolAnalysis());

    const result = await analyzeWorkspaceFiles({
      analyzeFile,
      cache,
      cacheTiers: {
        active: [BASELINE_ANALYSIS_CACHE_TIER],
        completed: [BASELINE_ANALYSIS_CACHE_TIER],
        required: [BASELINE_ANALYSIS_CACHE_TIER],
      },
      files: [createFile('src/index.ts')],
      getFileStat: vi.fn(async () => ({ mtime: 50, size: 12 })),
      readContent: vi.fn(async () => 'function run() {}'),
      workspaceRoot: '/workspace',
    });

    const cachedAnalysis = cache.files['src/index.ts'].analysis;
    const resultAnalysis = result.fileAnalysis.get('src/index.ts');

    expect(analyzeFile).toHaveBeenCalledWith(
      '/workspace/src/index.ts',
      'function run() {}',
      '/workspace',
      { features: { symbols: false } },
    );
    expect(readCacheTiers(cachedAnalysis)).toEqual([BASELINE_ANALYSIS_CACHE_TIER]);
    expect(cachedAnalysis.symbols).toEqual([]);
    expect(cachedAnalysis.relations?.[0]).not.toHaveProperty('fromSymbolId');
    expect(cachedAnalysis.relations?.[0]).not.toHaveProperty('toSymbolId');
    expect(resultAnalysis?.symbols).toEqual([]);
    expect(resultAnalysis?.relations?.[0]).not.toHaveProperty('fromSymbolId');
    expect(resultAnalysis?.relations?.[0]).not.toHaveProperty('toSymbolId');
  });

  it('reprocesses baseline cache entries when symbols are required', async () => {
    const cache = createEmptyWorkspaceAnalysisCache();
    cache.files['src/index.ts'] = {
      mtime: 25,
      analysis: {
        ...createEmptyAnalysis(),
        cache: {
          tiers: [BASELINE_ANALYSIS_CACHE_TIER],
        },
      } as IFileAnalysisResult,
      size: 12,
    };
    const analyzeFile = vi.fn(async () => createSymbolAnalysis());

    const result = await analyzeWorkspaceFiles({
      analyzeFile,
      cache,
      cacheTiers: {
        active: [BASELINE_ANALYSIS_CACHE_TIER, SYMBOLS_ANALYSIS_CACHE_TIER],
        completed: [BASELINE_ANALYSIS_CACHE_TIER, SYMBOLS_ANALYSIS_CACHE_TIER],
        required: [BASELINE_ANALYSIS_CACHE_TIER, SYMBOLS_ANALYSIS_CACHE_TIER],
      },
      files: [createFile('src/index.ts')],
      getFileStat: vi.fn(async () => ({ mtime: 25, size: 12 })),
      readContent: vi.fn(async () => 'function run() {}'),
      workspaceRoot: '/workspace',
    });

    expect(result.cacheHits).toBe(0);
    expect(result.cacheMisses).toBe(1);
    expect(analyzeFile).toHaveBeenCalledTimes(1);
    expect(readCacheTiers(cache.files['src/index.ts'].analysis)).toEqual([
      BASELINE_ANALYSIS_CACHE_TIER,
      SYMBOLS_ANALYSIS_CACHE_TIER,
    ]);
    expect(result.fileAnalysis.get('src/index.ts')?.symbols).toHaveLength(1);
  });

  it('reuses enriched cache entries as baseline views', async () => {
    const cache = createEmptyWorkspaceAnalysisCache();
    cache.files['src/index.ts'] = {
      mtime: 25,
      analysis: {
        ...createSymbolAnalysis(),
        cache: {
          tiers: [BASELINE_ANALYSIS_CACHE_TIER, SYMBOLS_ANALYSIS_CACHE_TIER],
        },
      } as IFileAnalysisResult,
      size: 12,
    };
    const analyzeFile = vi.fn(async () => createEmptyAnalysis());

    const result = await analyzeWorkspaceFiles({
      analyzeFile,
      cache,
      cacheTiers: {
        active: [BASELINE_ANALYSIS_CACHE_TIER],
        completed: [BASELINE_ANALYSIS_CACHE_TIER],
        required: [BASELINE_ANALYSIS_CACHE_TIER],
      },
      files: [createFile('src/index.ts')],
      getFileStat: vi.fn(async () => ({ mtime: 25, size: 12 })),
      readContent: vi.fn(async () => 'ignored'),
      workspaceRoot: '/workspace',
    });

    expect(result.cacheHits).toBe(1);
    expect(result.cacheMisses).toBe(0);
    expect(analyzeFile).not.toHaveBeenCalled();
    expect(readCacheTiers(cache.files['src/index.ts'].analysis)).toEqual([
      BASELINE_ANALYSIS_CACHE_TIER,
      SYMBOLS_ANALYSIS_CACHE_TIER,
    ]);
    expect(result.fileAnalysis.get('src/index.ts')?.symbols).toEqual([]);
    expect(result.fileAnalysis.get('src/index.ts')?.relations?.[0]).not.toHaveProperty('fromSymbolId');
    expect(result.fileAnalysis.get('src/index.ts')?.relations?.[0]).not.toHaveProperty('toSymbolId');
  });

  it('skips pre-analysis when every file is a cache hit', async () => {
    const cache = createEmptyWorkspaceAnalysisCache();
    cache.files['src/index.ts'] = {
      mtime: 25,
      analysis: createImportAnalysis(),
      size: 12,
    };
    const preAnalyzeFiles = vi.fn(async () => undefined);

    await analyzeWorkspaceFiles({
      analyzeFile: vi.fn(async () => createEmptyAnalysis()),
      cache,
      files: [createFile('src/index.ts')],
      getFileStat: vi.fn(async () => ({ mtime: 25, size: 12 })),
      preAnalyzeFiles,
      readContent: vi.fn(async () => 'ignored'),
      workspaceRoot: '/workspace',
    });

    expect(preAnalyzeFiles).not.toHaveBeenCalled();
  });

  it('keeps reusable symbol cache data out of plugin-only graph refresh results', async () => {
    const cache = createEmptyWorkspaceAnalysisCache();
    cache.files['src/index.ts'] = {
      mtime: 25,
      analysis: {
        ...createSymbolAnalysis(),
        cache: {
          tiers: [BASELINE_ANALYSIS_CACHE_TIER, SYMBOLS_ANALYSIS_CACHE_TIER],
        },
      } as IFileAnalysisResult,
      size: 12,
    };
    const pluginTier = createPluginAnalysisCacheTier('codegraphy.extra');
    const analyzeFile = vi.fn(async () => createPluginAnalysis());

    const result = await analyzeWorkspaceFiles({
      analyzeFile,
      cache,
      cacheTiers: {
        active: [BASELINE_ANALYSIS_CACHE_TIER, pluginTier],
        completed: [BASELINE_ANALYSIS_CACHE_TIER, pluginTier],
        required: [BASELINE_ANALYSIS_CACHE_TIER, pluginTier],
      },
      files: [createFile('src/index.ts')],
      getFileStat: vi.fn(async () => ({ mtime: 25, size: 12 })),
      readContent: vi.fn(async () => 'plugin input'),
      workspaceRoot: '/workspace',
    });

    const resultAnalysis = result.fileAnalysis.get('src/index.ts');
    const cachedAnalysis = cache.files['src/index.ts'].analysis;

    expect(result.cacheHits).toBe(0);
    expect(result.cacheMisses).toBe(1);
    expect(analyzeFile).toHaveBeenCalledWith(
      '/workspace/src/index.ts',
      'plugin input',
      '/workspace',
      { features: { symbols: false } },
    );
    expect(resultAnalysis?.relations).toEqual(expect.arrayContaining([
      expect.objectContaining({
        kind: 'plugin:edge',
        pluginId: 'codegraphy.extra',
      }),
    ]));
    expect(resultAnalysis?.relations?.some((relation) =>
      'fromSymbolId' in relation || 'toSymbolId' in relation,
    )).toBe(false);
    expect(resultAnalysis?.symbols).toEqual([]);
    expect(readCacheTiers(cachedAnalysis)).toEqual([
      BASELINE_ANALYSIS_CACHE_TIER,
      SYMBOLS_ANALYSIS_CACHE_TIER,
      pluginTier,
    ]);
    expect(cachedAnalysis.symbols).toHaveLength(1);
  });

  it('forces plugin-tier analysis for current cache entries and replaces stale plugin facts', async () => {
    const cache = createEmptyWorkspaceAnalysisCache();
    const pluginTier = createPluginAnalysisCacheTier('codegraphy.extra');
    cache.files['src/index.ts'] = {
      mtime: 25,
      analysis: {
        ...createSymbolAnalysis(),
        cache: {
          tiers: [BASELINE_ANALYSIS_CACHE_TIER, SYMBOLS_ANALYSIS_CACHE_TIER, pluginTier],
        },
        relations: [
          ...(createSymbolAnalysis().relations ?? []),
          {
            kind: 'plugin:edge',
            pluginId: 'codegraphy.extra',
            sourceId: 'test-plugin',
            fromFilePath: '/workspace/src/index.ts',
            toFilePath: '/workspace/src/stale.ts',
            resolvedPath: '/workspace/src/stale.ts',
          },
        ],
      } as IFileAnalysisResult,
      size: 12,
    };
    const analyzeFile = vi.fn(async () => ({
      ...createPluginAnalysis(),
      relations: [{
        kind: 'plugin:edge',
        pluginId: 'codegraphy.extra',
        sourceId: 'test-plugin',
        fromFilePath: '/workspace/src/index.ts',
        toFilePath: '/workspace/src/fresh.ts',
        resolvedPath: '/workspace/src/fresh.ts',
      }],
    } satisfies IFileAnalysisResult));

    const result = await analyzeWorkspaceFiles({
      analyzeFile,
      cache,
      cacheTiers: {
        active: [BASELINE_ANALYSIS_CACHE_TIER, pluginTier],
        completed: [BASELINE_ANALYSIS_CACHE_TIER, pluginTier],
        required: [BASELINE_ANALYSIS_CACHE_TIER, pluginTier],
      },
      files: [createFile('src/index.ts')],
      forceAnalyze: true,
      getFileStat: vi.fn(async () => ({ mtime: 25, size: 12 })),
      readContent: vi.fn(async () => 'plugin input'),
      workspaceRoot: '/workspace',
    });

    const resultAnalysis = result.fileAnalysis.get('src/index.ts');
    const cachedAnalysis = cache.files['src/index.ts'].analysis;

    expect(result.cacheHits).toBe(0);
    expect(result.cacheMisses).toBe(1);
    expect(analyzeFile).toHaveBeenCalledOnce();
    expect(resultAnalysis?.relations).toEqual(expect.arrayContaining([
      expect.objectContaining({
        pluginId: 'codegraphy.extra',
        toFilePath: '/workspace/src/fresh.ts',
      }),
    ]));
    expect(resultAnalysis?.relations).not.toEqual(expect.arrayContaining([
      expect.objectContaining({
        pluginId: 'codegraphy.extra',
        toFilePath: '/workspace/src/stale.ts',
      }),
    ]));
    expect(cachedAnalysis.relations).toEqual(expect.arrayContaining([
      expect.objectContaining({
        fromSymbolId: '/workspace/src/index.ts:function:run',
      }),
      expect.objectContaining({
        pluginId: 'codegraphy.extra',
        toFilePath: '/workspace/src/fresh.ts',
      }),
    ]));
    expect(cachedAnalysis.relations).not.toEqual(expect.arrayContaining([
      expect.objectContaining({
        pluginId: 'codegraphy.extra',
        toFilePath: '/workspace/src/stale.ts',
      }),
    ]));
    expect(cachedAnalysis.symbols).toHaveLength(1);
    expect(readCacheTiers(cachedAnalysis)).toEqual([
      BASELINE_ANALYSIS_CACHE_TIER,
      SYMBOLS_ANALYSIS_CACHE_TIER,
      pluginTier,
    ]);
  });

  it('runs pre-analysis before analyzing the first cache miss', async () => {
    const cache = createEmptyWorkspaceAnalysisCache();
    const sequence: string[] = [];
    const preAnalyzeFiles = vi.fn(async () => {
      sequence.push('pre-analyze');
    });
    const analyzeFile = vi.fn(async () => {
      sequence.push('analyze');
      return createImportAnalysis();
    });

    await analyzeWorkspaceFiles({
      analyzeFile,
      cache,
      files: [createFile('src/index.ts')],
      getFileStat: vi.fn(async () => ({ mtime: 50, size: 12 })),
      preAnalyzeFiles,
      readContent: vi.fn(async () => "import './utils'"),
      workspaceRoot: '/workspace',
    });

    expect(preAnalyzeFiles).toHaveBeenCalledWith(
      [createFile('src/index.ts')],
      '/workspace',
      undefined,
    );
    expect(sequence).toEqual(['pre-analyze', 'analyze']);
  });

});
