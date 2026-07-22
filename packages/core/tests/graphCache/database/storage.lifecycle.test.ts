import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { describe, expect, it } from 'vitest';
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
    runStatementSync,
    withConnection,
} from '../../../src/graphCache/database/io/connection';
import {
    getWorkspaceAnalysisDatabasePath,
    loadWorkspaceAnalysisDatabaseCache,
    saveWorkspaceAnalysisDatabaseCache,
    saveWorkspaceAnalysisDatabaseCacheAsync,
} from '../../../src/graphCache/database/storage';

import { createWorkspaceRoot } from './storage/fixture';

describe('workspace analysis database cache', { timeout: 30000 }, () => {

  it('migrates the previous normalized schema to an empty canonical Graph Cache', () => {
    const workspaceRoot = createWorkspaceRoot();
    saveWorkspaceAnalysisDatabaseCache(workspaceRoot, createEmptyWorkspaceAnalysisCache());
    const databasePath = getWorkspaceAnalysisDatabasePath(workspaceRoot);

    withConnection(databasePath, (connection) => {
      runStatementSync(connection, 'DROP TABLE Edge');
      runStatementSync(connection, 'DROP TABLE Symbol');
      runStatementSync(connection, 'DROP TABLE Node');
      runStatementSync(connection, 'DROP TABLE File');
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

    const loaded = loadWorkspaceAnalysisDatabaseCache(workspaceRoot);
    expect(Object.keys(loaded.files)).toEqual(['src/first.ts', 'src/second.ts']);
    expect(loaded.files['src/first.ts']).toMatchObject({
      mtime: 1,
      size: 10,
      analysis: { filePath: path.join(workspaceRoot, 'src/first.ts') },
    });
    expect(loaded.files['src/second.ts']).toMatchObject({
      mtime: 2,
      size: 20,
      analysis: { filePath: path.join(workspaceRoot, 'src/second.ts') },
    });
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

    const baselineCache = loadWorkspaceAnalysisDatabaseCache(workspaceRoot, {
      activeAnalysisCacheTiers: [BASELINE_ANALYSIS_CACHE_TIER],
    });
    expect(baselineCache.files['src/App.vue']).toMatchObject({
      mtime: 1,
      size: 10,
      analysis: {
        cache: { tiers: ['baseline'] },
        filePath: path.join(workspaceRoot, 'src/App.vue'),
        symbols: [],
        relations: [
          expect.objectContaining({ kind: 'contains' }),
          expect.objectContaining({ kind: 'import' }),
        ],
      },
    });

    expect(loadWorkspaceAnalysisDatabaseCache(workspaceRoot, {
      activeAnalysisCacheTiers: [
        BASELINE_ANALYSIS_CACHE_TIER,
        SYMBOLS_ANALYSIS_CACHE_TIER,
        'plugin:codegraphy.vue',
      ],
    })).toMatchObject({
      version: WORKSPACE_ANALYSIS_CACHE_VERSION,
      files: {
        'src/App.vue': {
          mtime: 1,
          size: 10,
          analysis: {
            cache: { tiers: ['baseline', 'symbols', 'plugin:codegraphy.vue'] },
            filePath: path.join(workspaceRoot, 'src/App.vue'),
            symbols: [expect.objectContaining({ name: 'App', kind: 'component' })],
            relations: [
              expect.objectContaining({ kind: 'contains' }),
              expect.objectContaining({ kind: 'import' }),
            ],
          },
        },
      },
    });
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
    expect(loadWorkspaceAnalysisDatabaseCache(workspaceRoot).files).toMatchObject({
      'src/first.ts': { mtime: 1, size: 10 },
    });

    saveWorkspaceAnalysisDatabaseCache(workspaceRoot, secondCache);
    expect(loadWorkspaceAnalysisDatabaseCache(workspaceRoot).files).toEqual({
      'src/second.ts': expect.objectContaining({ mtime: 2, size: 20 }),
    });
  });
});
