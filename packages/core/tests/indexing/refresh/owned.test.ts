import { mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import {
  createWorkspaceFileContentHash,
  WORKSPACE_ANALYSIS_CACHE_VERSION,
  type IWorkspaceAnalysisCache,
} from '../../../src/analysis/cache';
import { getWorkspaceAnalysisDatabasePath } from '../../../src/graphCache/database/storage';
import { readWorkspaceCacheWriteRevisionAsync } from '../../../src/graphCache/database/writeCoordination/model';
import {
  loadWorkspaceAnalysisDatabaseCache,
  readWorkspaceAnalysisDatabaseSnapshot,
  runOwnedWorkspaceIndexRefresh,
  saveWorkspaceAnalysisDatabaseCache,
  type IGraphData,
} from '../../../src';
import { createWorkspace } from '../workspaceFixture';

function createCacheEntry(filePath: string, content: string, fileSize: number) {
  return {
    analysis: { filePath, relations: [] },
    contentHash: createWorkspaceFileContentHash(content),
    mtime: 1,
    size: fileSize,
  };
}

function createGraph(filePaths: readonly string[]) {
  return {
    nodes: filePaths.map(filePath => ({
      color: '#67E8F9',
      id: filePath,
      label: filePath,
      nodeType: 'file' as const,
    })),
    edges: [],
  };
}

describe('owned workspace Index refresh', () => {
  it('does not self-supersede when prepare loads the valid Graph Cache', async () => {
    const workspaceRoot = await createWorkspace();
    const relativePath = 'src/app.ts';
    const absolutePath = path.join(workspaceRoot, relativePath);
    const content = 'export const app = true;\n';
    await mkdir(path.dirname(absolutePath), { recursive: true });
    await writeFile(absolutePath, content, 'utf8');
    const cache: IWorkspaceAnalysisCache = {
      version: WORKSPACE_ANALYSIS_CACHE_VERSION,
      files: {
        [relativePath]: createCacheEntry(absolutePath, content, Buffer.byteLength(content)),
      },
    };
    saveWorkspaceAnalysisDatabaseCache(workspaceRoot, cache, createGraph([relativePath]));
    const databasePath = getWorkspaceAnalysisDatabasePath(workspaceRoot);
    const revisionBeforeLoad = await readWorkspaceCacheWriteRevisionAsync(databasePath);
    loadWorkspaceAnalysisDatabaseCache(workspaceRoot);
    const revisionAfterLoad = await readWorkspaceCacheWriteRevisionAsync(databasePath);
    let prepareCount = 0;

    await runOwnedWorkspaceIndexRefresh({
      workspaceRoot,
      prepare: async () => {
        prepareCount += 1;
        const loadedCache = loadWorkspaceAnalysisDatabaseCache(workspaceRoot);
        return {
          cache: loadedCache,
          completeGraph: createGraph([relativePath]),
          patch: { deleteFilePaths: [], upsertFilePaths: [relativePath] },
          persistIndexMetadata: async () => undefined,
          result: undefined,
          rollback: vi.fn(),
        };
      },
    });

    expect(prepareCount).toBe(1);
    expect(revisionAfterLoad).toBe(revisionBeforeLoad);
  });

  it('retries when analyzed source is superseded before writer ownership', async () => {
    const workspaceRoot = await createWorkspace();
    const relativePath = 'src/app.ts';
    const absolutePath = path.join(workspaceRoot, relativePath);
    await mkdir(path.dirname(absolutePath), { recursive: true });
    await writeFile(absolutePath, 'version one\n', 'utf8');
    const rollback = vi.fn();
    let prepareCount = 0;

    const result = await runOwnedWorkspaceIndexRefresh({
      workspaceRoot,
      prepare: async () => {
        prepareCount += 1;
        const content = prepareCount === 1 ? 'version one\n' : 'version two\n';
        const cache: IWorkspaceAnalysisCache = {
          version: WORKSPACE_ANALYSIS_CACHE_VERSION,
          files: {
            [relativePath]: createCacheEntry(
              absolutePath,
              content,
              Buffer.byteLength(content),
            ),
          },
        };
        if (prepareCount === 1) {
          await writeFile(absolutePath, 'version two\n', 'utf8');
        }
        return {
          cache,
          completeGraph: createGraph([relativePath]),
          patch: {
            deleteFilePaths: [],
            upsertFilePaths: [relativePath],
          },
          persistIndexMetadata: async () => undefined,
          result: content,
          rollback,
        };
      },
    });

    expect(result).toBe('version two\n');
    expect(prepareCount).toBe(2);
    expect(rollback).toHaveBeenCalledOnce();
    expect(readWorkspaceAnalysisDatabaseSnapshot(workspaceRoot).files)
      .toContainEqual(expect.objectContaining({
        contentHash: createWorkspaceFileContentHash('version two\n'),
        filePath: relativePath,
      }));
  });

  it('retries when another writer changes the analysis basis outside the patch paths', async () => {
    const workspaceRoot = await createWorkspace();
    const relativePaths = ['src/dependency.ts', 'src/dependent.ts'];
    const cache: IWorkspaceAnalysisCache = {
      version: WORKSPACE_ANALYSIS_CACHE_VERSION,
      files: {},
    };
    for (const relativePath of relativePaths) {
      const absolutePath = path.join(workspaceRoot, relativePath);
      const content = `${relativePath}\n`;
      await mkdir(path.dirname(absolutePath), { recursive: true });
      await writeFile(absolutePath, content, 'utf8');
      cache.files[relativePath] = createCacheEntry(
        absolutePath,
        content,
        Buffer.byteLength(content),
      );
    }
    let completeGraph: IGraphData = createGraph(relativePaths);
    saveWorkspaceAnalysisDatabaseCache(workspaceRoot, cache, completeGraph);
    const rollback = vi.fn();
    const rebase = vi.fn(async () => {
      completeGraph = readWorkspaceAnalysisDatabaseSnapshot(workspaceRoot).graph;
    });
    let prepareCount = 0;

    await runOwnedWorkspaceIndexRefresh({
      workspaceRoot,
      rebase,
      prepare: async () => {
        prepareCount += 1;
        if (prepareCount === 1) {
          const newerGraph: IGraphData = {
            ...createGraph(relativePaths),
            edges: [{
              id: 'src/dependent.ts->src/dependency.ts#import',
              from: 'src/dependent.ts',
              to: 'src/dependency.ts',
              kind: 'import',
              sources: [],
            }],
          };
          saveWorkspaceAnalysisDatabaseCache(workspaceRoot, cache, newerGraph);
        }
        return {
          cache,
          completeGraph,
          patch: {
            deleteFilePaths: [],
            upsertFilePaths: ['src/dependent.ts'],
          },
          persistIndexMetadata: async () => undefined,
          result: undefined,
          rollback,
        };
      },
    });

    expect(prepareCount).toBe(2);
    expect(rollback).toHaveBeenCalledOnce();
    expect(rebase).toHaveBeenCalledOnce();
    expect(readWorkspaceAnalysisDatabaseSnapshot(workspaceRoot).graph.edges)
      .toContainEqual(expect.objectContaining({
        id: 'src/dependent.ts->src/dependency.ts#import',
      }));
  });

  it('advances writer revision when metadata fails after the Graph Cache commit', async () => {
    const workspaceRoot = await createWorkspace();
    const relativePath = 'src/app.ts';
    const absolutePath = path.join(workspaceRoot, relativePath);
    const content = 'export const app = true;\n';
    await mkdir(path.dirname(absolutePath), { recursive: true });
    await writeFile(absolutePath, content, 'utf8');
    const cache: IWorkspaceAnalysisCache = {
      version: WORKSPACE_ANALYSIS_CACHE_VERSION,
      files: {
        [relativePath]: createCacheEntry(
          absolutePath,
          content,
          Buffer.byteLength(content),
        ),
      },
    };
    saveWorkspaceAnalysisDatabaseCache(workspaceRoot, cache, createGraph([relativePath]));
    const databasePath = getWorkspaceAnalysisDatabasePath(workspaceRoot);
    const revisionBefore = await readWorkspaceCacheWriteRevisionAsync(databasePath);

    await expect(runOwnedWorkspaceIndexRefresh({
      workspaceRoot,
      prepare: async () => ({
        cache,
        completeGraph: createGraph([relativePath]),
        patch: {
          deleteFilePaths: [],
          upsertFilePaths: [relativePath],
        },
        persistIndexMetadata: async () => {
          throw new Error('metadata failed');
        },
        result: undefined,
        rollback: vi.fn(),
      }),
    })).rejects.toThrow('metadata failed');

    expect(await readWorkspaceCacheWriteRevisionAsync(databasePath)).not.toBe(revisionBefore);
  });

  it('rebuilds a missing Graph Cache instead of applying a partial patch', async () => {
    const workspaceRoot = await createWorkspace();
    const relativePaths = ['src/a.ts', 'src/b.ts'];
    const cache: IWorkspaceAnalysisCache = {
      version: WORKSPACE_ANALYSIS_CACHE_VERSION,
      files: {},
    };
    for (const relativePath of relativePaths) {
      const absolutePath = path.join(workspaceRoot, relativePath);
      const content = `${relativePath}\n`;
      await mkdir(path.dirname(absolutePath), { recursive: true });
      await writeFile(absolutePath, content, 'utf8');
      cache.files[relativePath] = createCacheEntry(
        absolutePath,
        content,
        Buffer.byteLength(content),
      );
    }

    await runOwnedWorkspaceIndexRefresh({
      workspaceRoot,
      prepare: async () => ({
        cache,
        completeGraph: createGraph(relativePaths),
        patch: {
          deleteFilePaths: [],
          upsertFilePaths: ['src/a.ts'],
        },
        persistIndexMetadata: async () => undefined,
        result: undefined,
        rollback: vi.fn(),
      }),
    });

    expect(readWorkspaceAnalysisDatabaseSnapshot(workspaceRoot).files
      .map(file => file.filePath)
      .sort()).toEqual(relativePaths);
  });

  it('reports an unreadable Graph Cache without destructively recreating it', async () => {
    const workspaceRoot = await createWorkspace();
    const databasePath = getWorkspaceAnalysisDatabasePath(workspaceRoot);
    await mkdir(path.dirname(databasePath), { recursive: true });
    await writeFile(databasePath, 'not a database', 'utf8');

    expect(() => loadWorkspaceAnalysisDatabaseCache(workspaceRoot, {
      unreadable: 'throw',
    })).toThrow(expect.objectContaining({
      name: 'WorkspaceAnalysisDatabaseUnreadableError',
    }));
    await expect(readFile(databasePath, 'utf8')).resolves.toBe('not a database');
  });

  it('advances the writer epoch only when a corrupt read repairs the Graph Cache', async () => {
    const workspaceRoot = await createWorkspace();
    const databasePath = getWorkspaceAnalysisDatabasePath(workspaceRoot);
    await mkdir(path.dirname(databasePath), { recursive: true });
    saveWorkspaceAnalysisDatabaseCache(
      workspaceRoot,
      { version: WORKSPACE_ANALYSIS_CACHE_VERSION, files: {} },
      createGraph([]),
    );
    const revisionBeforeRepair = await readWorkspaceCacheWriteRevisionAsync(databasePath);
    await writeFile(databasePath, 'not a database', 'utf8');

    loadWorkspaceAnalysisDatabaseCache(workspaceRoot);

    expect(await readWorkspaceCacheWriteRevisionAsync(databasePath))
      .not.toBe(revisionBeforeRepair);
  });

  it('rebuilds a corrupt Graph Cache from complete refresh state under ownership', async () => {
    const workspaceRoot = await createWorkspace();
    const relativePaths = ['src/a.ts', 'src/b.ts'];
    const cache: IWorkspaceAnalysisCache = {
      version: WORKSPACE_ANALYSIS_CACHE_VERSION,
      files: {},
    };
    for (const relativePath of relativePaths) {
      const absolutePath = path.join(workspaceRoot, relativePath);
      const content = `export const ${path.basename(relativePath, '.ts')} = true;\n`;
      await mkdir(path.dirname(absolutePath), { recursive: true });
      await writeFile(absolutePath, content, 'utf8');
      cache.files[relativePath] = createCacheEntry(
        absolutePath,
        content,
        (await stat(absolutePath)).size,
      );
    }
    const databasePath = getWorkspaceAnalysisDatabasePath(workspaceRoot);
    await mkdir(path.dirname(databasePath), { recursive: true });
    await writeFile(databasePath, 'not a database', 'utf8');

    await runOwnedWorkspaceIndexRefresh({
      workspaceRoot,
      prepare: async () => ({
        cache,
        completeGraph: createGraph(relativePaths),
        patch: {
          deleteFilePaths: [],
          upsertFilePaths: ['src/a.ts'],
        },
        persistIndexMetadata: async () => undefined,
        result: undefined,
        rollback: vi.fn(),
      }),
    });

    expect(readWorkspaceAnalysisDatabaseSnapshot(workspaceRoot).files
      .map(file => file.filePath)
      .sort()).toEqual(relativePaths);
  });
});
