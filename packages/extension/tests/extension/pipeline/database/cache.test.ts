import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import type { IWorkspaceAnalysisCache } from '../../../../src/extension/pipeline/cache';
import {
  createEmptyWorkspaceAnalysisCache,
  WORKSPACE_ANALYSIS_CACHE_VERSION,
} from '../../../../src/extension/pipeline/cache';
import {
  clearWorkspaceAnalysisDatabaseCache,
  getWorkspaceAnalysisDatabasePath,
  loadWorkspaceAnalysisDatabaseCache,
  saveWorkspaceAnalysisDatabaseCache,
} from '../../../../src/extension/pipeline/database/cache';

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

describe('workspace analysis database cache', () => {
  it('returns an empty cache when the repo database does not exist yet', () => {
    const workspaceRoot = createWorkspaceRoot();

    expect(loadWorkspaceAnalysisDatabaseCache(workspaceRoot)).toEqual(
      createEmptyWorkspaceAnalysisCache(),
    );
  });

  it('persists and reloads file analysis entries from .codegraphy/graph.lbug', () => {
    const workspaceRoot = createWorkspaceRoot();
    const cache: IWorkspaceAnalysisCache = {
      version: WORKSPACE_ANALYSIS_CACHE_VERSION,
      files: {
        'src/index.ts': {
          mtime: 123,
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
                pluginId: 'codegraphy.core.treesitter',
                sourceId: 'treesitter:import',
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

    expect(fs.existsSync(getWorkspaceAnalysisDatabasePath(workspaceRoot))).toBe(true);
    expect(loadWorkspaceAnalysisDatabaseCache(workspaceRoot)).toEqual(cache);
  });

  it('falls back to an empty cache when the persisted database is unreadable', () => {
    const workspaceRoot = createWorkspaceRoot();
    const databasePath = getWorkspaceAnalysisDatabasePath(workspaceRoot);
    fs.mkdirSync(path.dirname(databasePath), { recursive: true });
    fs.writeFileSync(databasePath, 'not-a-ladybug-database', 'utf8');

    expect(loadWorkspaceAnalysisDatabaseCache(workspaceRoot)).toEqual(
      createEmptyWorkspaceAnalysisCache(),
    );
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
            relations: [],
          },
        },
      },
    });

    clearWorkspaceAnalysisDatabaseCache(workspaceRoot);

    expect(loadWorkspaceAnalysisDatabaseCache(workspaceRoot)).toEqual(
      createEmptyWorkspaceAnalysisCache(),
    );
    expect(fs.existsSync(path.join(codeGraphyDirectory, 'settings.json'))).toBe(true);
  });
});
