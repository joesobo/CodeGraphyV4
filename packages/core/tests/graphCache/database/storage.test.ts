import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import type { IWorkspaceAnalysisCache } from '../../../src/analysis/cache';
import {
  createEmptyWorkspaceAnalysisCache,
  WORKSPACE_ANALYSIS_CACHE_VERSION,
} from '../../../src/analysis/cache';
import {
  BASELINE_ANALYSIS_CACHE_TIER,
  SYMBOLS_ANALYSIS_CACHE_TIER,
} from '../../../src/analysis/fileAnalysis/cacheTiers';
import {
  clearWorkspaceAnalysisDatabaseCache,
  getWorkspaceAnalysisDatabasePath,
  loadWorkspaceAnalysisDatabaseCache,
  patchWorkspaceAnalysisDatabaseCache,
  readWorkspaceAnalysisDatabaseSnapshot,
  saveWorkspaceAnalysisDatabaseCache,
  saveWorkspaceAnalysisDatabaseCacheAsync,
} from '../../../src/graphCache/database/storage';
import {
  readRowsSync,
  runStatementSync,
  withConnection,
} from '../../../src/graphCache/database/io/connection';

const tempRoots = new Set<string>();

function createWorkspaceRoot(): string {
  const workspaceRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'codegraphy-pipeline-db-'));
  tempRoots.add(workspaceRoot);
  return workspaceRoot;
}

afterEach(() => {
  for (const workspaceRoot of tempRoots) {
    fs.rmSync(workspaceRoot, { recursive: true, force: true });
  }
  tempRoots.clear();
});

describe('workspace analysis database cache', { timeout: 30000 }, () => {
  it('returns an empty cache when the repo database does not exist yet', () => {
    const workspaceRoot = createWorkspaceRoot();

    expect(loadWorkspaceAnalysisDatabaseCache(workspaceRoot)).toEqual(
      createEmptyWorkspaceAnalysisCache(),
    );
  });

  it('persists and reloads file analysis entries from .codegraphy/graph.sqlite', () => {
    const workspaceRoot = createWorkspaceRoot();
    const cache: IWorkspaceAnalysisCache = {
      version: WORKSPACE_ANALYSIS_CACHE_VERSION,
      files: {
        'src/index.ts': {
          mtime: 123,
          contentHash: 'sha256:index',
          size: 456,
          analysis: {
            filePath: '/workspace/src/index.ts',
            symbols: [
              {
                id: '/workspace/src/index.ts:function:main',
                filePath: '/workspace/src/index.ts',
                kind: 'function',
                name: 'main',
              },
            ],
            relations: [
              {
                kind: 'import',
                sourceId: 'core:treesitter:import',
                fromFilePath: '/workspace/src/index.ts',
                toFilePath: '/workspace/src/utils.ts',
                resolvedPath: '/workspace/src/utils.ts',
                specifier: './utils',
              },
            ],
          },
        },
      },
    };

    saveWorkspaceAnalysisDatabaseCache(workspaceRoot, cache);

    expect(getWorkspaceAnalysisDatabasePath(workspaceRoot)).toBe(
      path.join(workspaceRoot, '.codegraphy', 'graph.sqlite'),
    );
    expect(fs.existsSync(getWorkspaceAnalysisDatabasePath(workspaceRoot))).toBe(true);
    expect(loadWorkspaceAnalysisDatabaseCache(workspaceRoot)).toEqual(cache);
    expect(readWorkspaceAnalysisDatabaseSnapshot(workspaceRoot)).toEqual({
      files: [
        {
          filePath: 'src/index.ts',
          mtime: 123,
          contentHash: 'sha256:index',
          size: 456,
          analysis: cache.files['src/index.ts']!.analysis,
        },
      ],
      graph: { nodes: [], edges: [] },
      symbols: cache.files['src/index.ts']!.analysis.symbols,
      relations: cache.files['src/index.ts']!.analysis.relations,
    });
  });

  it('persists indexing state and the canonical property graph in three queryable tables', () => {
    const workspaceRoot = createWorkspaceRoot();
    const analysis = {
      filePath: '/workspace/src/index.ts',
      nodeTypes: [{
        id: 'plugin:test:route',
        label: 'Route',
        defaultColor: '#123456',
        defaultVisible: true,
      }],
      edgeTypes: [{
        id: 'test:routes-to' as const,
        label: 'Routes to',
        defaultColor: '#654321',
        defaultVisible: false,
      }],
      nodes: [{
        id: '/workspace/src/index.ts:route:home',
        nodeType: 'plugin:test:route',
        label: 'Home',
        filePath: '/workspace/src/index.ts',
      }],
      symbols: [{
        id: '/workspace/src/index.ts:function:main',
        filePath: '/workspace/src/index.ts',
        kind: 'function',
        name: 'main',
      }],
      relations: [{
        kind: 'import' as const,
        sourceId: 'core:treesitter:import',
        fromFilePath: '/workspace/src/index.ts',
        toFilePath: '/workspace/src/utils.ts',
      }],
    };

    saveWorkspaceAnalysisDatabaseCache(workspaceRoot, {
      version: WORKSPACE_ANALYSIS_CACHE_VERSION,
      files: {
        'src/index.ts': { mtime: 1, size: 2, analysis },
      },
    }, {
      nodes: [
        {
          id: 'src/index.ts',
          label: 'index.ts',
          color: '#ffffff',
          nodeType: 'file',
          fileSize: 2,
        },
        {
          id: 'src/index.ts:function:main',
          label: 'main',
          color: '#ffffff',
          nodeType: 'symbol',
          symbol: {
            id: 'src/index.ts:function:main',
            filePath: 'src/index.ts',
            kind: 'function',
            name: 'main',
          },
        },
        {
          id: 'src/utils.ts',
          label: 'utils.ts',
          color: '#ffffff',
          nodeType: 'file',
        },
      ],
      edges: [{
        id: 'src/index.ts->src/utils.ts#import',
        from: 'src/index.ts',
        to: 'src/utils.ts',
        kind: 'import',
        sources: [{
          id: 'core:treesitter:import',
          pluginId: 'core',
          sourceId: 'treesitter:import',
          label: 'TypeScript import',
        }],
      }],
    });

    const records = withConnection(
      getWorkspaceAnalysisDatabasePath(workspaceRoot),
      connection => ({
        tables: readRowsSync(connection, "SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name"),
        indexedFiles: readRowsSync(connection, 'SELECT path, factsJson FROM IndexedFile'),
        nodes: readRowsSync(connection, 'SELECT id, type, label, filePath, propertiesJson FROM Node ORDER BY id'),
        edges: readRowsSync(connection, 'SELECT id, sourceId, targetId, type, propertiesJson, sourcesJson FROM Edge'),
      }),
    );

    expect(records.tables).toEqual([
      { name: 'Edge' },
      { name: 'IndexedFile' },
      { name: 'Node' },
    ]);
    expect(JSON.parse(String(records.indexedFiles[0]!.factsJson))).toEqual(analysis);
    expect(records.nodes.map(row => ({
      ...row,
      propertiesJson: JSON.parse(String(row.propertiesJson)),
    }))).toEqual([
      {
        id: 'src/index.ts',
        type: 'file',
        label: 'index.ts',
        filePath: 'src/index.ts',
        propertiesJson: { color: '#ffffff', fileSize: 2 },
      },
      {
        id: 'src/index.ts:function:main',
        type: 'symbol',
        label: 'main',
        filePath: 'src/index.ts',
        propertiesJson: {
          color: '#ffffff',
          symbol: {
            id: 'src/index.ts:function:main',
            filePath: 'src/index.ts',
            kind: 'function',
            name: 'main',
          },
          },
        },
      {
        id: 'src/utils.ts',
        type: 'file',
        label: 'utils.ts',
        filePath: 'src/utils.ts',
        propertiesJson: { color: '#ffffff' },
      },
    ]);
    expect(records.edges.map(row => ({
      ...row,
      propertiesJson: JSON.parse(String(row.propertiesJson)),
      sourcesJson: JSON.parse(String(row.sourcesJson)),
    }))).toEqual([{
      id: 'src/index.ts->src/utils.ts#import',
      sourceId: 'src/index.ts',
      targetId: 'src/utils.ts',
      type: 'import',
      propertiesJson: {},
      sourcesJson: [{
        id: 'core:treesitter:import',
        pluginId: 'core',
        sourceId: 'treesitter:import',
        label: 'TypeScript import',
      }],
    }]);
    expect(loadWorkspaceAnalysisDatabaseCache(workspaceRoot)).toEqual({
      version: WORKSPACE_ANALYSIS_CACHE_VERSION,
      files: {
        'src/index.ts': { mtime: 1, size: 2, analysis },
      },
    });
  });

  it('migrates the previous normalized schema to an empty canonical Graph Cache', () => {
    const workspaceRoot = createWorkspaceRoot();
    saveWorkspaceAnalysisDatabaseCache(workspaceRoot, createEmptyWorkspaceAnalysisCache());
    const databasePath = getWorkspaceAnalysisDatabasePath(workspaceRoot);

    withConnection(databasePath, (connection) => {
      runStatementSync(connection, 'DROP TABLE IndexedFile');
      runStatementSync(connection, 'DROP TABLE Edge');
      runStatementSync(connection, 'DROP TABLE Node');
      runStatementSync(connection, 'CREATE TABLE File(filePath TEXT PRIMARY KEY, mtime INTEGER, size INTEGER, factsJson TEXT)');
      runStatementSync(connection, `INSERT INTO File VALUES ('src/index.ts', 1, 2, '{}')`);
    });

    expect(loadWorkspaceAnalysisDatabaseCache(workspaceRoot)).toEqual(
      createEmptyWorkspaceAnalysisCache(),
    );
    expect(fs.existsSync(databasePath)).toBe(true);
  });

  it('persists asynchronously and reports cache write progress', async () => {
    const workspaceRoot = createWorkspaceRoot();
    const cache: IWorkspaceAnalysisCache = {
      version: WORKSPACE_ANALYSIS_CACHE_VERSION,
      files: {
        'src/first.ts': {
          mtime: 1,
          size: 10,
          analysis: {
            filePath: '/workspace/src/first.ts',
          },
        },
        'src/second.ts': {
          mtime: 2,
          size: 20,
          analysis: {
            filePath: '/workspace/src/second.ts',
          },
        },
      },
    };
    const progressUpdates: Array<{ current: number; total: number }> = [];

    await saveWorkspaceAnalysisDatabaseCacheAsync(workspaceRoot, cache, {
      onProgress: progress => progressUpdates.push(progress),
      yieldEvery: 1,
    });

    expect(loadWorkspaceAnalysisDatabaseCache(workspaceRoot)).toEqual(cache);
    expect(progressUpdates).toEqual([
      { current: 0, total: 2 },
      { current: 1, total: 2 },
      { current: 2, total: 2 },
    ]);
  });

  it('loads only requested analysis cache tiers into runtime memory', () => {
    const workspaceRoot = createWorkspaceRoot();
    const fullCache: IWorkspaceAnalysisCache = {
      version: WORKSPACE_ANALYSIS_CACHE_VERSION,
      files: {
        'src/App.vue': {
          mtime: 1,
          size: 10,
          analysis: {
            filePath: '/workspace/src/App.vue',
            cache: {
              tiers: [
                BASELINE_ANALYSIS_CACHE_TIER,
                SYMBOLS_ANALYSIS_CACHE_TIER,
                'plugin:codegraphy.vue',
              ],
            },
            nodes: [
              {
                id: 'src/App.vue',
                label: 'App.vue',
                nodeType: 'file',
              },
              {
                id: 'src/App.vue#component',
                label: 'App',
                metadata: { pluginId: 'codegraphy.vue' },
                nodeType: 'plugin:codegraphy.vue:component',
              },
            ],
            symbols: [{
              id: 'src/App.vue#component',
              filePath: '/workspace/src/App.vue',
              kind: 'component',
              metadata: { pluginId: 'codegraphy.vue' },
              name: 'App',
            }],
            relations: [
              {
                kind: 'import',
                sourceId: 'core:treesitter:import',
                fromFilePath: '/workspace/src/App.vue',
                toFilePath: '/workspace/src/main.ts',
              },
              {
                kind: 'contains',
                pluginId: 'codegraphy.vue',
                sourceId: 'codegraphy.vue:component',
                fromFilePath: '/workspace/src/App.vue',
                toNodeId: 'src/App.vue#component',
              },
            ],
          },
        },
      },
    } as never;
    saveWorkspaceAnalysisDatabaseCache(workspaceRoot, fullCache);

    expect(loadWorkspaceAnalysisDatabaseCache(workspaceRoot, {
      activeAnalysisCacheTiers: [BASELINE_ANALYSIS_CACHE_TIER],
    })).toEqual({
      version: WORKSPACE_ANALYSIS_CACHE_VERSION,
      files: {
        'src/App.vue': {
          mtime: 1,
          size: 10,
          analysis: {
            filePath: '/workspace/src/App.vue',
            cache: { tiers: [BASELINE_ANALYSIS_CACHE_TIER] },
            nodes: [{
              id: 'src/App.vue',
              label: 'App.vue',
              nodeType: 'file',
            }],
            symbols: [],
            relations: [{
              kind: 'import',
              sourceId: 'core:treesitter:import',
              fromFilePath: '/workspace/src/App.vue',
              toFilePath: '/workspace/src/main.ts',
            }],
          },
        },
      },
    });

    expect(loadWorkspaceAnalysisDatabaseCache(workspaceRoot, {
      activeAnalysisCacheTiers: [
        BASELINE_ANALYSIS_CACHE_TIER,
        SYMBOLS_ANALYSIS_CACHE_TIER,
        'plugin:codegraphy.vue',
      ],
    })).toEqual(fullCache);
  });

  it('skips persistence when the workspace root no longer exists', () => {
    const workspaceRoot = path.join(os.tmpdir(), `codegraphy-missing-${Date.now()}`);

    saveWorkspaceAnalysisDatabaseCache(workspaceRoot, {
      version: WORKSPACE_ANALYSIS_CACHE_VERSION,
      files: {
        'src/index.ts': {
          mtime: 1,
          analysis: {
            filePath: '/workspace/src/index.ts',
          },
        },
      },
    });

    expect(fs.existsSync(getWorkspaceAnalysisDatabasePath(workspaceRoot))).toBe(false);
  });

  it('supports repeated save and load cycles without corrupting the repo-local database', () => {
    const workspaceRoot = createWorkspaceRoot();
    const firstCache: IWorkspaceAnalysisCache = {
      version: WORKSPACE_ANALYSIS_CACHE_VERSION,
      files: {
        'src/first.ts': {
          mtime: 1,
          size: 10,
          analysis: {
            filePath: '/workspace/src/first.ts',
          },
        },
      },
    };
    const secondCache: IWorkspaceAnalysisCache = {
      version: WORKSPACE_ANALYSIS_CACHE_VERSION,
      files: {
        'src/second.ts': {
          mtime: 2,
          size: 20,
          analysis: {
            filePath: '/workspace/src/second.ts',
          },
        },
      },
    };

    saveWorkspaceAnalysisDatabaseCache(workspaceRoot, firstCache);
    expect(loadWorkspaceAnalysisDatabaseCache(workspaceRoot)).toEqual(firstCache);

    saveWorkspaceAnalysisDatabaseCache(workspaceRoot, secondCache);
    expect(loadWorkspaceAnalysisDatabaseCache(workspaceRoot)).toEqual(secondCache);
  });

  it('patches changed file analysis rows without rewriting unrelated Graph Cache entries', () => {
    const workspaceRoot = createWorkspaceRoot();
    const initialCache: IWorkspaceAnalysisCache = {
      version: WORKSPACE_ANALYSIS_CACHE_VERSION,
      files: {
        'src/changed.ts': {
          mtime: 1,
          size: 10,
          analysis: {
            filePath: '/workspace/src/changed.ts',
          },
        },
        'src/deleted.ts': {
          mtime: 2,
          size: 20,
          analysis: {
            filePath: '/workspace/src/deleted.ts',
          },
        },
        'src/stable.ts': {
          mtime: 3,
          size: 30,
          analysis: {
            filePath: '/workspace/src/stable.ts',
            relations: [{
              kind: 'import',
              sourceId: 'core:treesitter:import',
              fromFilePath: '/workspace/src/stable.ts',
              toFilePath: '/workspace/src/changed.ts',
              resolvedPath: '/workspace/src/changed.ts',
            }],
          },
        },
      },
    };
    saveWorkspaceAnalysisDatabaseCache(workspaceRoot, initialCache);

    patchWorkspaceAnalysisDatabaseCache(workspaceRoot, {
      deleteFilePaths: ['src/deleted.ts'],
      upsertFiles: {
        'src/changed.ts': {
          mtime: 4,
          size: 40,
          analysis: {
            filePath: '/workspace/src/changed.ts',
            symbols: [{
              id: '/workspace/src/changed.ts:function:changed',
              filePath: '/workspace/src/changed.ts',
              kind: 'function',
              name: 'changed',
            }],
          },
        },
        'src/created.ts': {
          mtime: 5,
          size: 50,
          analysis: {
            filePath: '/workspace/src/created.ts',
          },
        },
      },
    });

    expect(loadWorkspaceAnalysisDatabaseCache(workspaceRoot)).toEqual({
      version: WORKSPACE_ANALYSIS_CACHE_VERSION,
      files: {
        'src/changed.ts': {
          mtime: 4,
          size: 40,
          analysis: {
            filePath: '/workspace/src/changed.ts',
            symbols: [{
              id: '/workspace/src/changed.ts:function:changed',
              filePath: '/workspace/src/changed.ts',
              kind: 'function',
              name: 'changed',
            }],
          },
        },
        'src/created.ts': {
          mtime: 5,
          size: 50,
          analysis: {
            filePath: '/workspace/src/created.ts',
          },
        },
        'src/stable.ts': initialCache.files['src/stable.ts']!,
      },
    });
    expect(readWorkspaceAnalysisDatabaseSnapshot(workspaceRoot)).toMatchObject({
      files: [
        { filePath: 'src/changed.ts', mtime: 4, size: 40 },
        { filePath: 'src/created.ts', mtime: 5, size: 50 },
        { filePath: 'src/stable.ts', mtime: 3, size: 30 },
      ],
      symbols: [{
        id: '/workspace/src/changed.ts:function:changed',
        filePath: '/workspace/src/changed.ts',
        kind: 'function',
        name: 'changed',
      }],
    });
  });

  it('falls back to an empty cache when the persisted database is unreadable', () => {
    const workspaceRoot = createWorkspaceRoot();
    const databasePath = getWorkspaceAnalysisDatabasePath(workspaceRoot);
    fs.mkdirSync(path.dirname(databasePath), { recursive: true });
    fs.writeFileSync(databasePath, 'not-a-sqlite-database', 'utf8');

    expect(loadWorkspaceAnalysisDatabaseCache(workspaceRoot)).toEqual(
      createEmptyWorkspaceAnalysisCache(),
    );
  });

  it('recreates an unreadable database during the next full save', () => {
    const workspaceRoot = createWorkspaceRoot();
    const databasePath = getWorkspaceAnalysisDatabasePath(workspaceRoot);
    fs.mkdirSync(path.dirname(databasePath), { recursive: true });
    fs.writeFileSync(databasePath, 'not-a-sqlite-database', 'utf8');
    const cache = {
      version: WORKSPACE_ANALYSIS_CACHE_VERSION,
      files: {
        'src/index.ts': {
          mtime: 1,
          size: 2,
          analysis: {
            filePath: '/workspace/src/index.ts',
          },
        },
      },
    };

    saveWorkspaceAnalysisDatabaseCache(workspaceRoot, cache);

    expect(loadWorkspaceAnalysisDatabaseCache(workspaceRoot)).toEqual(cache);
  });

  it('clears persisted analysis rows without deleting repo-local settings files', () => {
    const workspaceRoot = createWorkspaceRoot();
    const codeGraphyDirectory = path.join(workspaceRoot, '.codegraphy');
    fs.mkdirSync(codeGraphyDirectory, { recursive: true });
    fs.writeFileSync(path.join(codeGraphyDirectory, 'settings.json'), '{"maxFiles":500}\n', 'utf8');

    saveWorkspaceAnalysisDatabaseCache(workspaceRoot, {
      version: WORKSPACE_ANALYSIS_CACHE_VERSION,
      files: {
        'src/index.ts': {
          mtime: 1,
          analysis: {
            filePath: '/workspace/src/index.ts',
          },
        },
      },
    });

    clearWorkspaceAnalysisDatabaseCache(workspaceRoot);

    expect(loadWorkspaceAnalysisDatabaseCache(workspaceRoot)).toEqual(
      createEmptyWorkspaceAnalysisCache(),
    );
    expect(readWorkspaceAnalysisDatabaseSnapshot(workspaceRoot)).toEqual({
      files: [],
      graph: { nodes: [], edges: [] },
      symbols: [],
      relations: [],
    });
    expect(fs.existsSync(path.join(codeGraphyDirectory, 'settings.json'))).toBe(true);
  });
});
