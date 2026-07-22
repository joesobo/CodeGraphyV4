import { describe, expect, it, vi } from 'vitest';

import type { IFileAnalysisResult } from '@codegraphy-dev/plugin-api';
import type { IDiscoveredFile } from '../../../../src/discovery/contracts';
import type { IGraphData } from '../../../../src/graph/contracts';
import { refreshWorkspaceIndexChangedFiles } from '../../../../src/indexing/refresh';
import {
    createDiscoveredFile,
    createFileAnalysis,
    createGraphNode,
    createSource,
    refreshOptions,
} from '../fixture';

describe('indexing/refresh/modes/changedFiles', () => {
  it('records discovery state, invalidates changed files, and forwards incremental progress', async () => {
    const onProgress = vi.fn();
    const discoveredFiles = [
      createDiscoveredFile('src/app.ts'),
      createDiscoveredFile('src/generated.ts'),
    ];
    const source = createSource({
      _analyzeFiles: vi.fn(async (files: IDiscoveredFile[], _workspaceRoot, onFileProgress) => {
        onFileProgress?.({
          current: 1,
          filePath: '/workspace/src/app.ts',
          total: files.length,
        });
        return createAnalysisResult(files.map(file => file.relativePath));
      }),
    });

    await refreshWorkspaceIndexChangedFiles(source, refreshOptions({
      discoveredDirectories: ['src', 'generated'],
      discoveredFiles,
      notifyFilesChanged: vi.fn(async () => ({
        additionalFilePaths: ['src/generated.ts'],
        requiresFullRefresh: false,
      })),
      onProgress,
    }));

    expect(source._lastDiscoveredDirectories).toEqual(['src', 'generated']);
    expect(source._lastDiscoveredFiles).toBe(discoveredFiles);
    expect(source.invalidateWorkspaceFiles).toHaveBeenCalledWith([
      '/workspace/src/app.ts',
      '/workspace/src/generated.ts',
    ], { persist: false });
    expect(onProgress).toHaveBeenNthCalledWith(1, {
      phase: 'Applying Changes',
      current: 0,
      total: 2,
    });
    expect(onProgress).toHaveBeenNthCalledWith(2, {
      phase: 'Applying Changes',
      current: 1,
      total: 2,
    });
  });

  it('reanalyzes the transitive reverse dependents of a changed file', async () => {
    const discoveredFiles = [
      createDiscoveredFile('src/a.ts'),
      createDiscoveredFile('src/b.ts'),
      createDiscoveredFile('src/c.ts'),
      createDiscoveredFile('src/unrelated.ts'),
    ];
    const source = createSource({
      _lastFileAnalysis: new Map([
        ['src/a.ts', createAnalysisWithTarget('src/a.ts', 'src/b.ts')],
        ['src/b.ts', createFileAnalysis('/workspace/src/b.ts')],
        ['src/c.ts', createAnalysisWithTarget('src/c.ts', 'src/a.ts')],
        ['src/unrelated.ts', createFileAnalysis('/workspace/src/unrelated.ts')],
      ]),
      _analyzeFiles: vi.fn(async (files: IDiscoveredFile[]) => (
        createAnalysisResult(files.map(file => file.relativePath))
      )),
    });

    await refreshWorkspaceIndexChangedFiles(source, refreshOptions({
      discoveredFiles,
      filePaths: ['/workspace/src/b.ts'],
    }));

    expect(source._analyzeFiles).toHaveBeenCalledWith(
      [
        expect.objectContaining({ relativePath: 'src/b.ts' }),
        expect.objectContaining({ relativePath: 'src/a.ts' }),
        expect.objectContaining({ relativePath: 'src/c.ts' }),
      ],
      '/workspace',
      expect.any(Function),
      undefined,
      undefined,
      new Set(),
    );
    expect(source.invalidateWorkspaceFiles).toHaveBeenCalledWith([
      '/workspace/src/b.ts',
      '/workspace/src/a.ts',
      '/workspace/src/c.ts',
    ], { persist: false });
  });

  it('rebuilds from retained analysis without analyzing when no files remain to refresh', async () => {
    const graph: IGraphData = {
      nodes: [createGraphNode('src/app.ts')],
      edges: [],
    };
    const persistCache = vi.fn();
    const source = createSource({
      _buildGraphDataFromAnalysis: vi.fn(() => graph),
      _lastFileAnalysis: new Map([
        ['src/app.ts', createFileAnalysis('/workspace/src/app.ts')],
      ]),
      _lastFileConnections: new Map([
        ['src/app.ts', []],
      ]),
    });

    await expect(refreshWorkspaceIndexChangedFiles(source, refreshOptions({
      discoveredDirectories: undefined,
      discoveredFiles: [createDiscoveredFile('src/app.ts')],
      filePaths: ['/outside/src/app.ts'],
      persistCache,
    }))).resolves.toBe(graph);

    expect(source._lastDiscoveredDirectories).toEqual([]);
    expect(source._analyzeFiles).not.toHaveBeenCalled();
    expect(source.invalidateWorkspaceFiles).not.toHaveBeenCalled();
    expect(persistCache).not.toHaveBeenCalled();
  });

  it('does not require an incremental progress callback', async () => {
    const source = createSource({
      _analyzeFiles: vi.fn(async (files: IDiscoveredFile[], _workspaceRoot, onFileProgress) => {
        onFileProgress?.({
          current: 1,
          filePath: '/workspace/src/app.ts',
          total: files.length,
        });
        return createAnalysisResult(files.map(file => file.relativePath));
      }),
    });

    await expect(refreshWorkspaceIndexChangedFiles(source, refreshOptions({
      onProgress: undefined,
    }))).resolves.toBeDefined();
    expect(source._analyzeFiles).toHaveBeenCalledOnce();
  });

  it('persists changed files through a targeted Graph Cache patch instead of a full cache save', async () => {
    const persistCache = vi.fn();
    const persistCachePatch = vi.fn();
    const invalidateWorkspaceFiles = vi.fn(() => ['src/app.ts']);
    const source = createSource({
      _analyzeFiles: vi.fn(async (files: IDiscoveredFile[]) => ({
        cacheHits: 0,
        cacheMisses: files.length,
        fileAnalysis: new Map([['src/app.ts', createFileAnalysis('/workspace/src/app.ts')]]),
        fileConnections: new Map([['src/app.ts', []]]),
      })),
      invalidateWorkspaceFiles,
    });

    await refreshWorkspaceIndexChangedFiles(source, refreshOptions({
      persistCache,
      persistCachePatch,
    }));

    expect(persistCache).not.toHaveBeenCalled();
    expect(persistCachePatch).toHaveBeenCalledOnce();
    expect(persistCachePatch).toHaveBeenCalledWith({
      deleteFilePaths: [],
      upsertFilePaths: ['src/app.ts'],
    });
    expect(invalidateWorkspaceFiles).toHaveBeenCalledWith(['/workspace/src/app.ts'], {
      persist: false,
    });
  });

  it('patches deleted file evidence without falling back to full cache persistence', async () => {
    const persistCache = vi.fn();
    const persistCachePatch = vi.fn();
    const lastFileAnalysis = new Map([
      ['src/deleted.ts', createFileAnalysis('/workspace/src/deleted.ts')],
      ['src/app.ts', createFileAnalysis('/workspace/src/app.ts')],
    ]);
    const lastFileConnections = new Map([
      ['src/deleted.ts', []],
      ['src/app.ts', []],
    ]);
    const invalidateWorkspaceFiles = vi.fn((filePaths: readonly string[]) => {
      for (const filePath of filePaths) {
        const relativePath = filePath.replace('/workspace/', '');
        lastFileAnalysis.delete(relativePath);
        lastFileConnections.delete(relativePath);
      }
      return ['src/deleted.ts'];
    });
    const source = createSource({
      _lastFileAnalysis: lastFileAnalysis,
      _lastFileConnections: lastFileConnections,
      analyze: vi.fn(async () => ({ nodes: [], edges: [] })),
      invalidateWorkspaceFiles,
    });

    await refreshWorkspaceIndexChangedFiles(source, refreshOptions({
      discoveredFiles: [createDiscoveredFile('src/app.ts')],
      filePaths: ['/workspace/src/deleted.ts'],
      persistCache,
      persistCachePatch,
    }));

    expect(source.analyze).not.toHaveBeenCalled();
    expect(source._analyzeFiles).not.toHaveBeenCalled();
    expect(persistCache).not.toHaveBeenCalled();
    expect(persistCachePatch).toHaveBeenCalledOnce();
    expect(persistCachePatch).toHaveBeenCalledWith({
      deleteFilePaths: ['src/deleted.ts'],
      upsertFilePaths: [],
    });
    expect(invalidateWorkspaceFiles).toHaveBeenCalledWith(['/workspace/src/deleted.ts'], {
      persist: false,
    });
  });
});

function createAnalysisResult(relativePaths: string[]) {
  return {
    cacheHits: 0,
    cacheMisses: relativePaths.length,
    fileAnalysis: new Map<string, IFileAnalysisResult>(
      relativePaths.map(relativePath => [
        relativePath,
        createFileAnalysis(`/workspace/${relativePath}`),
      ]),
    ),
    fileConnections: new Map(relativePaths.map(relativePath => [relativePath, []])),
  };
}

function createAnalysisWithTarget(sourcePath: string, targetPath: string): IFileAnalysisResult {
  return {
    filePath: `/workspace/${sourcePath}`,
    relations: [{
      kind: 'import',
      sourceId: `${sourcePath}-imports-${targetPath}`,
      fromFilePath: `/workspace/${sourcePath}`,
      toFilePath: `/workspace/${targetPath}`,
    }],
  };
}
