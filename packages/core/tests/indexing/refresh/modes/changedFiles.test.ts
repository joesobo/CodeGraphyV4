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
    ]);
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

  it('labels fallback full-analysis progress as applying changes when no phase is provided', async () => {
    const graph: IGraphData = { nodes: [], edges: [] };
    const onProgress = vi.fn();
    const source = createSource({
      analyze: vi.fn(async (_filterPatterns, _disabledPlugins, _signal, reportProgress) => {
        reportProgress?.({ phase: '', current: 1, total: 2 });
        reportProgress?.({ phase: 'Scanning', current: 2, total: 2 });
        return graph;
      }),
    });

    await expect(refreshWorkspaceIndexChangedFiles(source, refreshOptions({
      filePaths: ['/workspace/src/deleted.ts'],
      onProgress,
    }))).resolves.toBe(graph);

    expect(onProgress).toHaveBeenNthCalledWith(1, {
      phase: 'Applying Changes',
      current: 1,
      total: 2,
    });
    expect(onProgress).toHaveBeenNthCalledWith(2, {
      phase: 'Scanning',
      current: 2,
      total: 2,
    });
  });

  it('does not require a fallback full-analysis progress callback', async () => {
    const graph: IGraphData = { nodes: [], edges: [] };
    const source = createSource({
      analyze: vi.fn(async (_filterPatterns, _disabledPlugins, _signal, reportProgress) => {
        reportProgress?.({ phase: '', current: 1, total: 1 });
        return graph;
      }),
    });

    await expect(refreshWorkspaceIndexChangedFiles(source, refreshOptions({
      filePaths: ['/workspace/src/deleted.ts'],
      onProgress: undefined,
    }))).resolves.toBe(graph);
  });

  it('waits for metric-only metadata persistence when it is not deferred', async () => {
    const graph: IGraphData = {
      nodes: [createGraphNode('src/app.ts')],
      edges: [],
    };
    const source = createMetricOnlyPatchSource(graph);
    let resolvePersistence: () => void = () => undefined;
    const persistIndexMetadata = vi.fn(() => new Promise<void>(resolve => {
      resolvePersistence = resolve;
    }));

    const refreshPromise = refreshWorkspaceIndexChangedFiles(source, refreshOptions({
      persistIndexMetadata,
    }));
    const onSettled = vi.fn();
    void refreshPromise.then(onSettled);
    await flushMicrotasks();

    expect(onSettled).not.toHaveBeenCalled();
    expect(persistIndexMetadata).toHaveBeenCalledOnce();

    resolvePersistence();
    await expect(refreshPromise).resolves.toBe(graph);
    expect(onSettled).toHaveBeenCalledWith(graph);
  });

  it('reports deferred metric-only metadata persistence errors without blocking graph data', async () => {
    const graph: IGraphData = {
      nodes: [createGraphNode('src/app.ts')],
      edges: [],
    };
    const source = createMetricOnlyPatchSource(graph);
    const error = new Error('metadata write failed');
    const onDeferredIndexMetadataError = vi.fn();

    await expect(refreshWorkspaceIndexChangedFiles(source, refreshOptions({
      deferMetricOnlyIndexMetadata: true,
      onDeferredIndexMetadataError,
      persistIndexMetadata: vi.fn(() => Promise.reject(error)),
    }))).resolves.toBe(graph);
    await Promise.resolve();

    expect(onDeferredIndexMetadataError).toHaveBeenCalledWith(error);
  });

  it('does not require a deferred metadata error callback', async () => {
    const graph: IGraphData = {
      nodes: [createGraphNode('src/app.ts')],
      edges: [],
    };
    const source = createMetricOnlyPatchSource(graph);
    let caughtError: unknown;

    await expect(refreshWorkspaceIndexChangedFiles(source, refreshOptions({
      deferMetricOnlyIndexMetadata: true,
      onDeferredIndexMetadataError: undefined,
      persistIndexMetadata: vi.fn(() => createCapturedRejection(new Error('metadata write failed'), error => {
        caughtError = error;
      })),
    }))).resolves.toBe(graph);

    expect(caughtError).toBeUndefined();
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

function createMetricOnlyPatchSource(graph: IGraphData) {
  return createSource({
    _lastFileAnalysis: new Map([
      ['src/app.ts', createFileAnalysis('/workspace/src/app.ts')],
    ]),
    _lastFileConnections: new Map([
      ['src/app.ts', []],
    ]),
    _patchGraphDataNodeMetrics: vi.fn(() => graph),
  });
}

async function flushMicrotasks(): Promise<void> {
  for (let index = 0; index < 5; index += 1) {
    await Promise.resolve();
  }
}

function createCapturedRejection(
  error: Error,
  onCaughtError: (error: unknown) => void,
): Promise<void> {
  return {
    catch(onRejected?: (error: unknown) => unknown) {
      try {
        onRejected?.(error);
      } catch (caughtError) {
        onCaughtError(caughtError);
      }
      return Promise.resolve();
    },
  } as Promise<void>;
}
