import { describe, expect, it, vi } from 'vitest';
import type { IDiscoveredFile } from '../../../src/core/discovery/contracts';
import type { IProjectedConnection, IFileAnalysisResult } from '../../../src/core/plugins/types/contracts';
import { createEmptyWorkspaceAnalysisCache } from '../../../src/extension/pipeline/cache';
import { analyzeWorkspaceFiles } from '../../../src/extension/pipeline/fileAnalysis';

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

  it('keeps the cached size when a cache hit already has size data', async () => {
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
      getFileStat: vi.fn(async () => ({ mtime: 25, size: 99 })),
      readContent: vi.fn(async () => 'ignored'),
      workspaceRoot: '/workspace',
    });

    expect(cache.files['src/index.ts'].size).toBe(12);
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
});
