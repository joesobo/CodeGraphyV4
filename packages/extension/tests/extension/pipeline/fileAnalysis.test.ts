import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { IDiscoveredFile } from '../../../src/core/discovery/contracts';
import type { IProjectedConnection, IFileAnalysisResult } from '../../../src/core/plugins/types/contracts';
import { createEmptyWorkspaceAnalysisCache } from '../../../src/extension/pipeline/cache';
import { analyzeWorkspaceFiles } from '../../../src/extension/pipeline/fileAnalysis';
import { analyzeFileWithTreeSitter } from '../../../src/extension/pipeline/plugins/treesitter/runtime/analyze';

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

const tempRoots: string[] = [];

async function createWorkspace(files: Record<string, string>): Promise<string> {
  const workspaceRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'codegraphy-file-analysis-'));
  tempRoots.push(workspaceRoot);

  for (const [relativePath, content] of Object.entries(files)) {
    const absolutePath = path.join(workspaceRoot, relativePath);
    await fs.mkdir(path.dirname(absolutePath), { recursive: true });
    await fs.writeFile(absolutePath, content, 'utf8');
  }

  return workspaceRoot;
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
  afterEach(async () => {
    await Promise.all(
      tempRoots.splice(0).map((workspaceRoot) =>
        fs.rm(workspaceRoot, { recursive: true, force: true }),
      ),
    );
  });

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

  it('resolves imported and called symbols across analyzed workspace files', async () => {
    const cache = createEmptyWorkspaceAnalysisCache();
    const workspaceRoot = await createWorkspace({
      'src/deep.ts': [
        "import { getLeafName } from './leaf';",
        '',
        'export function getDepthTarget(): string {',
        '  return getLeafName();',
        '}',
        '',
      ].join('\n'),
      'src/leaf.ts': [
        'export function getLeafName(): string {',
        "  return 'leaf';",
        '}',
        '',
        'export function getOtherLeafName(): string {',
        "  return 'other-leaf';",
        '}',
        '',
      ].join('\n'),
    });
    const files: IDiscoveredFile[] = [
      {
        absolutePath: path.join(workspaceRoot, 'src/deep.ts'),
        extension: '.ts',
        name: 'deep.ts',
        relativePath: 'src/deep.ts',
      },
      {
        absolutePath: path.join(workspaceRoot, 'src/leaf.ts'),
        extension: '.ts',
        name: 'leaf.ts',
        relativePath: 'src/leaf.ts',
      },
    ];
    const contentByPath: Record<string, string> = {
      'src/deep.ts': await fs.readFile(path.join(workspaceRoot, 'src/deep.ts'), 'utf8'),
      'src/leaf.ts': await fs.readFile(path.join(workspaceRoot, 'src/leaf.ts'), 'utf8'),
    };

    const result = await analyzeWorkspaceFiles({
      analyzeFile: (absolutePath, content, workspaceRoot) =>
        analyzeFileWithTreeSitter(absolutePath, content, workspaceRoot).then((analysis) => analysis ?? ({
          filePath: absolutePath,
          relations: [],
        })),
      cache,
      files,
      getFileStat: vi.fn(async (filePath: string) => {
        const stat = await fs.stat(filePath);
        return {
          mtime: stat.mtimeMs,
          size: stat.size,
        };
      }),
      readContent: vi.fn(async (file) => contentByPath[file.relativePath] ?? ''),
      workspaceRoot,
    });

    const deepAnalysis = result.fileAnalysis.get('src/deep.ts');
    expect(deepAnalysis?.relations).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: 'import',
          fromFilePath: path.join(workspaceRoot, 'src/deep.ts'),
          toFilePath: path.join(workspaceRoot, 'src/leaf.ts'),
          toSymbolId: `${path.join(workspaceRoot, 'src/leaf.ts')}:function:getLeafName`,
        }),
        expect.objectContaining({
          kind: 'call',
          fromFilePath: path.join(workspaceRoot, 'src/deep.ts'),
          fromSymbolId: `${path.join(workspaceRoot, 'src/deep.ts')}:function:getDepthTarget`,
          toFilePath: path.join(workspaceRoot, 'src/leaf.ts'),
          toSymbolId: `${path.join(workspaceRoot, 'src/leaf.ts')}:function:getLeafName`,
        }),
      ]),
    );
  });

  it('resolves type-imported symbols across analyzed workspace files', async () => {
    const cache = createEmptyWorkspaceAnalysisCache();
    const workspaceRoot = await createWorkspace({
      'src/types.ts': [
        'export type UserName = string;',
        'export function formatUser(name: string): string {',
        '  return name.toUpperCase();',
        '}',
        '',
      ].join('\n'),
      'src/index.ts': [
        "import type { UserName } from './types';",
        "import { formatUser } from './types';",
        '',
        'const currentUser: UserName = formatUser("Ada");',
        'void currentUser;',
        '',
      ].join('\n'),
    });
    const files: IDiscoveredFile[] = [
      {
        absolutePath: path.join(workspaceRoot, 'src/index.ts'),
        extension: '.ts',
        name: 'index.ts',
        relativePath: 'src/index.ts',
      },
      {
        absolutePath: path.join(workspaceRoot, 'src/types.ts'),
        extension: '.ts',
        name: 'types.ts',
        relativePath: 'src/types.ts',
      },
    ];
    const contentByPath: Record<string, string> = {
      'src/index.ts': await fs.readFile(path.join(workspaceRoot, 'src/index.ts'), 'utf8'),
      'src/types.ts': await fs.readFile(path.join(workspaceRoot, 'src/types.ts'), 'utf8'),
    };

    const result = await analyzeWorkspaceFiles({
      analyzeFile: (absolutePath, content, root) =>
        analyzeFileWithTreeSitter(absolutePath, content, root).then((analysis) => analysis ?? ({
          filePath: absolutePath,
          relations: [],
        })),
      cache,
      files,
      getFileStat: vi.fn(async (filePath: string) => {
        const stat = await fs.stat(filePath);
        return {
          mtime: stat.mtimeMs,
          size: stat.size,
        };
      }),
      readContent: vi.fn(async (file) => contentByPath[file.relativePath] ?? ''),
      workspaceRoot,
    });

    const indexAnalysis = result.fileAnalysis.get('src/index.ts');
    expect(indexAnalysis?.relations).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: 'type-import',
          fromFilePath: path.join(workspaceRoot, 'src/index.ts'),
          toFilePath: path.join(workspaceRoot, 'src/types.ts'),
          toSymbolId: `${path.join(workspaceRoot, 'src/types.ts')}:type:UserName`,
        }),
        expect.objectContaining({
          kind: 'import',
          fromFilePath: path.join(workspaceRoot, 'src/index.ts'),
          toFilePath: path.join(workspaceRoot, 'src/types.ts'),
          toSymbolId: `${path.join(workspaceRoot, 'src/types.ts')}:function:formatUser`,
        }),
      ]),
    );
  });
});
