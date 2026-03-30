import { describe, expect, it, vi } from 'vitest';
import type { IDiscoveredFile } from '../../../src/core/discovery/contracts';
import type { IConnection } from '../../../src/core/plugins/types/contracts';
import { createEmptyWorkspaceAnalysisCache } from '../../../src/extension/workspaceAnalyzer/cache';
import { analyzeWorkspaceFiles } from '../../../src/extension/workspaceAnalyzer/fileAnalysis';

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

describe('workspaceAnalyzer/fileAnalysis', () => {
  it('reuses cached connections and backfills missing size on cache hits', async () => {
    const cache = createEmptyWorkspaceAnalysisCache();
    const cachedConnections: IConnection[] = [
      { specifier: './utils', resolvedPath: '/workspace/src/utils.ts', type: 'static' },
    ];
    cache.files['src/index.ts'] = {
      mtime: 25,
      connections: cachedConnections,
    };

    const readContent = vi.fn(async () => 'ignored');
    const analyzeFile = vi.fn(async () => []);

    const result = await analyzeWorkspaceFiles({
      analyzeFile,
      cache,
      files: [createFile('src/index.ts')],
      getFileStat: vi.fn(async () => ({ mtime: 25, size: 99 })),
      readContent,
      workspaceRoot: '/workspace',
    });

    expect(result.cacheHits).toBe(1);
    expect(result.cacheMisses).toBe(0);
    expect(result.fileConnections.get('src/index.ts')).toEqual(cachedConnections);
    expect(cache.files['src/index.ts'].size).toBe(99);
    expect(readContent).not.toHaveBeenCalled();
    expect(analyzeFile).not.toHaveBeenCalled();
  });

  it('keeps the cached size when a cache hit already has size data', async () => {
    const cache = createEmptyWorkspaceAnalysisCache();
    cache.files['src/index.ts'] = {
      mtime: 25,
      connections: [],
      size: 12,
    };

    await analyzeWorkspaceFiles({
      analyzeFile: vi.fn(async () => []),
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
    const connections: IConnection[] = [
      { specifier: './utils', resolvedPath: '/workspace/src/utils.ts', type: 'static' },
    ];

    const result = await analyzeWorkspaceFiles({
      analyzeFile: vi.fn(async () => connections),
      cache,
      files: [createFile('src/index.ts')],
      getFileStat: vi.fn(async () => ({ mtime: 50, size: 12 })),
      readContent: vi.fn(async () => "import './utils'"),
      workspaceRoot: '/workspace',
    });

    expect(result.cacheHits).toBe(0);
    expect(result.cacheMisses).toBe(1);
    expect(result.fileConnections.get('src/index.ts')).toEqual(connections);
    expect(cache.files['src/index.ts']).toEqual({
      mtime: 50,
      connections,
      size: 12,
    });
  });

  it('treats stale cached entries as cache misses', async () => {
    const cache = createEmptyWorkspaceAnalysisCache();
    cache.files['src/index.ts'] = {
      mtime: 25,
      connections: [],
      size: 12,
    };
    const readContent = vi.fn(async () => "import './utils'");
    const analyzeFile = vi.fn(async () => []);

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
    const connections: IConnection[] = [
      { specifier: './utils', resolvedPath: '/workspace/src/utils.ts', type: 'static' },
    ];

    await analyzeWorkspaceFiles({
      analyzeFile: vi.fn(async () => connections),
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
      analyzeFile: vi.fn(async () => []),
      cache,
      files: [createFile('src/index.ts')],
      getFileStat: vi.fn(async () => null),
      readContent: vi.fn(async () => ''),
      workspaceRoot: '/workspace',
    });

    expect(cache.files['src/index.ts']).toEqual({
      mtime: 0,
      connections: [],
      size: undefined,
    });
  });

  it('treats cached entries as misses when file stats are unavailable', async () => {
    const cache = createEmptyWorkspaceAnalysisCache();
    cache.files['src/index.ts'] = {
      mtime: 25,
      connections: [],
    };
    const readContent = vi.fn(async () => '');
    const analyzeFile = vi.fn(async () => []);

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
    const cachedConnections: IConnection[] = [
      { specifier: './utils', resolvedPath: '/workspace/src/utils.ts', type: 'static' },
    ];
    cache.files['src/index.ts'] = {
      mtime: undefined as unknown as number,
      connections: cachedConnections,
      size: undefined,
    };
    const readContent = vi.fn(async () => 'ignored');
    const analyzeFile = vi.fn(async () => []);

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
