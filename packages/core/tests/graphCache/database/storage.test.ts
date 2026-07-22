import * as fs from 'node:fs';
import * as path from 'node:path';
import { describe, expect, it } from 'vitest';
import type { IWorkspaceAnalysisCache } from '../../../src/analysis/cache';
import {
    createEmptyWorkspaceAnalysisCache,
    WORKSPACE_ANALYSIS_CACHE_VERSION,
} from '../../../src/analysis/cache';
import {
    getWorkspaceAnalysisDatabasePath,
    loadWorkspaceAnalysisDatabaseCache,
    readWorkspaceAnalysisDatabaseSnapshot,
    saveWorkspaceAnalysisDatabaseCache,
} from '../../../src/graphCache/database/storage';

import { createWorkspaceRoot } from './storage/fixture';

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
    const loaded = loadWorkspaceAnalysisDatabaseCache(workspaceRoot);
    expect(loaded.files['src/index.ts']).toMatchObject({
      mtime: 123,
      contentHash: 'sha256:index',
      size: 456,
      analysis: {
        filePath: path.join(workspaceRoot, 'src/index.ts'),
        symbols: [expect.objectContaining({ name: 'main', kind: 'function' })],
        relations: [expect.objectContaining({ kind: 'import' })],
      },
    });
    const snapshot = readWorkspaceAnalysisDatabaseSnapshot(workspaceRoot);
    expect(snapshot.graph.nodes).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: 'src/index.ts', nodeType: 'file' }),
      expect.objectContaining({ id: 'src/index.ts:function:main', nodeType: 'symbol:function' }),
      expect.objectContaining({ id: 'src/utils.ts', nodeType: 'file' }),
    ]));
    expect(snapshot.graph.edges).toEqual([
      expect.objectContaining({
        id: 'src/index.ts->src/utils.ts#import',
        from: 'src/index.ts',
        to: 'src/utils.ts',
        kind: 'import',
      }),
    ]);
  });
});
