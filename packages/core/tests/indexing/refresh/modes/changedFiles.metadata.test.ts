import { describe, expect, it, vi } from 'vitest';

import type { IGraphData } from '../../../../src/graph/contracts';
import { refreshWorkspaceIndexChangedFiles } from '../../../../src/indexing/refresh';
import {
    createFileAnalysis,
    createGraphNode,
    createSource,
    refreshOptions,
} from '../fixture';

describe('indexing/refresh/modes/changedFiles', () => {

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
