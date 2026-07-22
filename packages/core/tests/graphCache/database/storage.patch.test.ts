import * as fs from 'node:fs';
import * as path from 'node:path';
import { describe, expect, it } from 'vitest';
import type { IWorkspaceAnalysisCache } from '../../../src/analysis/cache';
import {
    createEmptyWorkspaceAnalysisCache,
    WORKSPACE_ANALYSIS_CACHE_VERSION,
} from '../../../src/analysis/cache';
import {
    clearWorkspaceAnalysisDatabaseCache,
    getWorkspaceAnalysisDatabasePath,
    loadWorkspaceAnalysisDatabaseCache,
    patchWorkspaceAnalysisDatabaseCache,
    readWorkspaceAnalysisDatabaseSnapshot,
    saveWorkspaceAnalysisDatabaseCache,
} from '../../../src/graphCache/database/storage';

import { createWorkspaceRoot } from './storage/fixture';

describe('workspace analysis database cache', { timeout: 30000 }, () => {

  it('rebuilds normalized facts when patching changed files', () => {
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
    saveWorkspaceAnalysisDatabaseCache(workspaceRoot, initialCache, {
      nodes: [
        { id: 'src', label: 'src', nodeType: 'folder' },
        { id: 'src/stable.ts', label: 'stable.ts', nodeType: 'file' },
      ],
      edges: [{
        id: 'src->src/stable.ts#nests',
        from: 'src',
        to: 'src/stable.ts',
        kind: 'nests',
        sources: [],
      }],
    });

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

    const patched = loadWorkspaceAnalysisDatabaseCache(workspaceRoot);
    expect(Object.keys(patched.files)).toEqual([
      'src/changed.ts',
      'src/created.ts',
      'src/stable.ts',
    ]);
    expect(patched.files['src/changed.ts']).toMatchObject({
      mtime: 4,
      size: 40,
      analysis: { symbols: [expect.objectContaining({ name: 'changed', kind: 'function' })] },
    });
    expect(patched.files['src/created.ts']).toMatchObject({ mtime: 5, size: 50 });
    expect(patched.files['src/stable.ts']).toMatchObject({ mtime: 3, size: 30 });
    expect(readWorkspaceAnalysisDatabaseSnapshot(workspaceRoot)).toMatchObject({
      files: [
        { filePath: 'src/changed.ts', mtime: 4, size: 40 },
        { filePath: 'src/created.ts', mtime: 5, size: 50 },
        { filePath: 'src/stable.ts', mtime: 3, size: 30 },
      ],
      symbols: [{
        id: path.join(workspaceRoot, 'src/changed.ts:function:changed'),
        filePath: path.join(workspaceRoot, 'src/changed.ts'),
        kind: 'function',
        name: 'changed',
      }],
      graph: {
        nodes: expect.arrayContaining([
          expect.objectContaining({ id: 'src', nodeType: 'folder' }),
        ]),
        edges: expect.arrayContaining([
          expect.objectContaining({ id: 'src->src/stable.ts#nests', kind: 'nests' }),
        ]),
      },
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

    expect(loadWorkspaceAnalysisDatabaseCache(workspaceRoot).files['src/index.ts'])
      .toMatchObject({
        mtime: 1,
        size: 2,
        analysis: { filePath: path.join(workspaceRoot, 'src/index.ts') },
      });
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
