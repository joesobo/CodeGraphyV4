import { describe, expect, it } from 'vitest';
import type { IFileAnalysisResult } from '@codegraphy-dev/plugin-api';
import { WORKSPACE_ANALYSIS_CACHE_VERSION } from '../../src/analysis/cache';
import type { IProjectedConnection } from '../../src/analysis/projectedConnection';
import {
  createWorkspaceIndexEngineState,
  invalidateWorkspaceIndexEngineFiles,
  removeInvalidatedWorkspaceIndexDirectories,
} from '../../src/indexing/state';

describe('indexing/state', () => {
  it('creates the retained workspace index engine state with empty analysis data', () => {
    const state = createWorkspaceIndexEngineState();

    expect(state.cache).toEqual({
      version: WORKSPACE_ANALYSIS_CACHE_VERSION,
      files: {},
    });
    expect(state.fileAnalysis).toEqual(new Map());
    expect(state.fileConnections).toEqual(new Map());
    expect(state.discoveredDirectories).toEqual([]);
    expect(state.discoveredFiles).toEqual([]);
    expect(state.filesExcludedCount).toBe(0);
    expect(state.workspaceRoot).toBe('');
    expect(state.graph).toEqual({ nodes: [], edges: [] });
  });

  it('invalidates changed workspace files from cache and retained analysis maps', () => {
    const state = createWorkspaceIndexEngineState();
    const analysis: IFileAnalysisResult = {
      filePath: '/workspace/src/index.ts',
      relations: [],
    };
    const connections: IProjectedConnection[] = [];
    state.cache.files['src/index.ts'] = {
      mtime: 1,
      analysis,
      size: 10,
    };
    state.fileAnalysis.set('src/index.ts', analysis);
    state.fileConnections.set('src/index.ts', connections);
    state.fileAnalysis.set('src/keep.ts', {
      filePath: '/workspace/src/keep.ts',
      relations: [],
    });

    const invalidated = invalidateWorkspaceIndexEngineFiles(
      state,
      '/workspace',
      ['/workspace/src/index.ts', '/elsewhere/file.ts'],
    );

    expect(invalidated).toEqual(['src/index.ts']);
    expect(state.cache.files['src/index.ts']).toBeUndefined();
    expect(state.fileAnalysis.has('src/index.ts')).toBe(false);
    expect(state.fileConnections.has('src/index.ts')).toBe(false);
    expect(state.fileAnalysis.has('src/keep.ts')).toBe(true);
  });

  it('removes retained discovered directories at or below invalidated workspace paths', () => {
    expect(removeInvalidatedWorkspaceIndexDirectories(
      ['src', 'src/features', 'src/features/deep', 'docs'],
      ['/workspace/src/features'],
      '/workspace',
    )).toEqual(['src', 'docs']);
  });
});
