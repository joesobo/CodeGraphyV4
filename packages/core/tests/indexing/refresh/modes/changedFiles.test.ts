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

  it('updates structural directory facts without running full analysis', async () => {
    const persistCachePatch = vi.fn();
    const source = createSource({
      _lastFileAnalysis: new Map(),
      _lastFileConnections: new Map(),
      analyze: vi.fn(async () => ({ nodes: [], edges: [] })),
    });
    source._buildGraphDataFromAnalysis = vi.fn(() => ({
      nodes: source._lastDiscoveredDirectories.map(createGraphNode),
      edges: [],
    }));

    const result = await refreshWorkspaceIndexChangedFiles(source, refreshOptions({
      discoveredDirectories: ['src', 'src/new-folder'],
      discoveredFiles: [createDiscoveredFile('src/app.ts')],
      fullRefreshFallback: 'reject',
      filePaths: ['/workspace/src/new-folder'],
      persistCachePatch,
    }));

    expect(result.nodes).toContainEqual(createGraphNode('src/new-folder'));
    expect(source.analyze).not.toHaveBeenCalled();
    expect(source._analyzeFiles).not.toHaveBeenCalled();
    expect(source._lastDiscoveredDirectories).toEqual(['src', 'src/new-folder']);
    expect(persistCachePatch).toHaveBeenCalledWith({
      deleteFilePaths: [],
      deleteNodeIds: [],
      upsertFilePaths: [],
      upsertNodeIds: ['src/new-folder'],
      graph: result,
    });
  });

  it('removes structural directory facts without running full analysis', async () => {
    const persistCachePatch = vi.fn();
    const source = createSource({
      _lastDiscoveredDirectories: ['src', 'src/old-folder'],
      _lastFileAnalysis: new Map(),
      _lastFileConnections: new Map(),
      analyze: vi.fn(async () => ({ nodes: [], edges: [] })),
    });
    source._buildGraphDataFromAnalysis = vi.fn(() => ({
      nodes: source._lastDiscoveredDirectories.map(createGraphNode),
      edges: [],
    }));

    const result = await refreshWorkspaceIndexChangedFiles(source, refreshOptions({
      discoveredDirectories: ['src'],
      discoveredFiles: [createDiscoveredFile('src/app.ts')],
      filePaths: ['/workspace/src/old-folder'],
      fullRefreshFallback: 'reject',
      persistCachePatch,
    }));

    expect(result.nodes).not.toContainEqual(createGraphNode('src/old-folder'));
    expect(source.analyze).not.toHaveBeenCalled();
    expect(source._analyzeFiles).not.toHaveBeenCalled();
    expect(source._lastDiscoveredDirectories).toEqual(['src']);
    expect(persistCachePatch).toHaveBeenCalledWith({
      deleteFilePaths: [],
      deleteNodeIds: ['src/old-folder'],
      upsertFilePaths: [],
      upsertNodeIds: [],
      graph: result,
    });
  });

  it('deletes and reindexes descendant files when a non-empty directory is renamed', async () => {
    const persistCachePatch = vi.fn();
    const lastFileAnalysis = new Map([
      ['src/old/app.ts', createFileAnalysis('/workspace/src/old/app.ts')],
    ]);
    const lastFileConnections = new Map([['src/old/app.ts', []]]);
    const invalidateWorkspaceFiles = vi.fn((filePaths: readonly string[]) => {
      for (const filePath of filePaths) {
        const relativePath = filePath.replace('/workspace/', '');
        lastFileAnalysis.delete(relativePath);
        lastFileConnections.delete(relativePath);
      }
      return filePaths.map(filePath => filePath.replace('/workspace/', ''));
    });
    const source = createSource({
      _lastDiscoveredDirectories: ['src', 'src/old'],
      _lastDiscoveredFiles: [createDiscoveredFile('src/old/app.ts')],
      _lastFileAnalysis: lastFileAnalysis,
      _lastFileConnections: lastFileConnections,
      _analyzeFiles: vi.fn(async (files: IDiscoveredFile[]) => createAnalysisResult(
        files.map(file => file.relativePath),
      )),
      invalidateWorkspaceFiles,
    });

    await refreshWorkspaceIndexChangedFiles(source, refreshOptions({
      discoveredDirectories: ['src', 'src/new'],
      discoveredFiles: [createDiscoveredFile('src/new/app.ts')],
      filePaths: ['/workspace/src/old', '/workspace/src/new'],
      fullRefreshFallback: 'reject',
      persistCachePatch,
    }));

    expect(invalidateWorkspaceFiles).toHaveBeenCalledWith(
      ['/workspace/src/old/app.ts'],
      { persist: false },
    );
    expect(source._analyzeFiles).toHaveBeenCalledWith(
      [createDiscoveredFile('src/new/app.ts')],
      '/workspace',
      expect.any(Function),
      undefined,
      undefined,
      new Set(),
    );
    expect(persistCachePatch).toHaveBeenCalledWith(expect.objectContaining({
      deleteFilePaths: ['src/old/app.ts'],
      deleteNodeIds: ['src/old'],
      upsertFilePaths: ['src/new/app.ts'],
      upsertNodeIds: ['src/new'],
    }));
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

  it('waits for the Graph Cache patch before marking an incremental update current', async () => {
    let reportPatchStarted: (() => void) | undefined;
    let finishPatch: (() => void) | undefined;
    const patchStarted = new Promise<void>(resolve => {
      reportPatchStarted = resolve;
    });
    const persistCachePatch = vi.fn(() => {
      reportPatchStarted?.();
      return new Promise<void>(resolve => {
        finishPatch = resolve;
      });
    });
    const persistIndexMetadata = vi.fn(async () => undefined);
    const source = createSource({
      _analyzeFiles: vi.fn(async (files: IDiscoveredFile[]) => (
        createAnalysisResult(files.map(file => file.relativePath))
      )),
      invalidateWorkspaceFiles: vi.fn(() => ['src/app.ts']),
    });

    const refresh = refreshWorkspaceIndexChangedFiles(source, refreshOptions({
      persistCachePatch,
      persistIndexMetadata,
    }));
    await patchStarted;

    expect(persistIndexMetadata).not.toHaveBeenCalled();
    finishPatch?.();
    await refresh;

    expect(persistIndexMetadata).toHaveBeenCalledOnce();
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
      deleteNodeIds: [],
      upsertFilePaths: ['src/app.ts'],
      upsertNodeIds: [],
      graph: expect.any(Object),
    });
    expect(invalidateWorkspaceFiles).toHaveBeenCalledWith(['/workspace/src/app.ts'], {
      persist: false,
    });
  });

  it('rejects discovery-lifecycle settings changes when full fallback is disabled', async () => {
    const persistCachePatch = vi.fn();
    const persistIndexMetadata = vi.fn(async () => undefined);
    const source = createSource({
      invalidateWorkspaceFiles: vi.fn(() => []),
    });

    await expect(refreshWorkspaceIndexChangedFiles(source, refreshOptions({
      discoveredFiles: [createDiscoveredFile('src/app.ts')],
      filePaths: ['/workspace/.codegraphy/settings.json'],
      fullRefreshFallback: 'reject',
      persistCachePatch,
      persistIndexMetadata,
    }))).rejects.toMatchObject({
      name: 'WorkspaceIndexFullRefreshRequiredError',
      reason: 'discovery-lifecycle',
    });

    expect(source.invalidateWorkspaceFiles).not.toHaveBeenCalled();
    expect(persistCachePatch).not.toHaveBeenCalled();
    expect(persistIndexMetadata).not.toHaveBeenCalled();
  });

  it('rejects plugin requests for full analysis when fallback is disabled', async () => {
    const source = createSource();

    await expect(refreshWorkspaceIndexChangedFiles(source, refreshOptions({
      filePaths: ['/workspace/src/app.ts', '/workspace/src/deleted.ts'],
      fullRefreshFallback: 'reject',
      notifyFilesChanged: vi.fn(async () => ({
        additionalFilePaths: [],
        requiresFullRefresh: true,
      })),
    }))).rejects.toMatchObject({
      name: 'WorkspaceIndexFullRefreshRequiredError',
      reason: 'plugin-request',
    });

    expect(source.analyze).not.toHaveBeenCalled();
    expect(source.invalidateWorkspaceFiles).not.toHaveBeenCalled();
  });

  it('rejects targeted membership churn when a new file displaces an indexed file at maxFiles', async () => {
    const previousFiles = [
      createDiscoveredFile('src/b.ts'),
      createDiscoveredFile('src/c.ts'),
    ];
    const source = createSource({
      _lastDiscoveredFiles: previousFiles,
      _lastFileAnalysis: new Map(previousFiles.map(file => [
        file.relativePath,
        createFileAnalysis(file.absolutePath),
      ])),
      _lastFileConnections: new Map(previousFiles.map(file => [file.relativePath, []])),
    });

    await expect(refreshWorkspaceIndexChangedFiles(source, refreshOptions({
      discoveredFiles: [
        createDiscoveredFile('src/a.ts'),
        createDiscoveredFile('src/b.ts'),
      ],
      discoveryLimitReached: true,
      filePaths: ['/workspace/src/a.ts'],
      fullRefreshFallback: 'reject',
    }))).rejects.toMatchObject({
      name: 'WorkspaceIndexFullRefreshRequiredError',
      reason: 'discovery-membership',
    });

    expect(source._lastDiscoveredFiles).toBe(previousFiles);
    expect(source.invalidateWorkspaceFiles).not.toHaveBeenCalled();
    expect(source._analyzeFiles).not.toHaveBeenCalled();
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
      deleteNodeIds: [],
      upsertFilePaths: [],
      upsertNodeIds: [],
      graph: expect.any(Object),
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
