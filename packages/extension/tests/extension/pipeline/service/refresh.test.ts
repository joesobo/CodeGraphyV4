import { describe, expect, it, vi } from 'vitest';
import type { IFileAnalysisResult } from '../../../../src/core/plugins/types/contracts';
import { refreshWorkspacePipelineChangedFiles } from '../../../../src/extension/pipeline/service/refresh';

function createSource() {
  return {
    _analyzeFiles: vi.fn(),
    _buildGraphDataFromAnalysis: vi.fn(() => ({ nodes: [{ id: 'node' }], edges: [] })),
    _lastDiscoveredFiles: [] as Array<{ absolutePath: string; relativePath: string }>,
    _lastFileAnalysis: new Map<string, IFileAnalysisResult>(),
    _lastFileConnections: new Map<string, unknown[]>(),
    _lastWorkspaceRoot: '',
    _readAnalysisFiles: vi.fn(),
    analyze: vi.fn(),
    invalidateWorkspaceFiles: vi.fn(),
  };
}

function createDependencies() {
  return {
    config: { showOrphans: true },
    disabledPlugins: new Set<string>(['plugin.disabled']),
    discoveredFiles: [
      { absolutePath: '/workspace/src/a.ts', relativePath: 'src/a.ts' },
      { absolutePath: '/workspace/src/b.ts', relativePath: 'src/b.ts' },
      { absolutePath: '/workspace/src/c.ts', relativePath: 'src/c.ts' },
    ],
    filePaths: ['/workspace/src/a.ts'],
    filterPatterns: ['**/*.ts'],
    notifyFilesChanged: vi.fn(),
    onProgress: vi.fn() as undefined | ((progress: { phase: string; current: number; total: number }) => void),
    persistCache: vi.fn(),
    persistIndexMetadata: vi.fn(async () => undefined),
    signal: new AbortController().signal,
    toWorkspaceRelativePath: vi.fn((workspaceRoot: string, filePath: string) => {
      if (!filePath.startsWith(`${workspaceRoot}/`)) {
        return undefined;
      }

      return filePath.slice(workspaceRoot.length + 1);
    }),
    workspaceRoot: '/workspace',
  };
}

describe('pipeline/service/refresh', () => {
  it('falls back to a full analyze run when plugins request a full refresh', async () => {
    const source = createSource();
    const dependencies = createDependencies();
    source._readAnalysisFiles.mockResolvedValue([
      {
        absolutePath: '/workspace/src/a.ts',
        relativePath: 'src/a.ts',
        content: 'content:a',
      },
    ]);
    dependencies.notifyFilesChanged.mockResolvedValue({
      additionalFilePaths: [],
      requiresFullRefresh: true,
    });
    source.analyze.mockResolvedValue({ nodes: [{ id: 'full' }], edges: [] });

    const graph = await refreshWorkspacePipelineChangedFiles(source as never, dependencies as never);
    const forwardedProgress = source.analyze.mock.calls[0][3];

    forwardedProgress({ phase: 'Ignored', current: 2, total: 5 });

    expect(dependencies.toWorkspaceRelativePath).toHaveBeenCalledWith('/workspace', '/workspace/src/a.ts');
    expect(source.analyze).toHaveBeenCalledWith(
      ['**/*.ts'],
      dependencies.disabledPlugins,
      dependencies.signal,
      expect.any(Function),
    );
    expect(dependencies.onProgress).toHaveBeenCalledWith({
      phase: 'Applying Changes',
      current: 2,
      total: 5,
    });
    expect(graph).toEqual({ nodes: [{ id: 'full' }], edges: [] });
  });

  it('returns graph data from cached analysis when no files remain to analyze', async () => {
    const source = createSource();
    const dependencies = createDependencies();
    dependencies.filePaths = ['/workspace/missing.ts'];
    dependencies.notifyFilesChanged.mockResolvedValue({
      additionalFilePaths: ['src/missing.ts'],
      requiresFullRefresh: false,
    });
    source._readAnalysisFiles.mockResolvedValue([]);
    source._lastFileAnalysis.set('src/existing.ts', {
      filePath: '/workspace/src/existing.ts',
      relations: [],
    });

    const graph = await refreshWorkspacePipelineChangedFiles(source as never, dependencies as never);

    expect(source._buildGraphDataFromAnalysis).toHaveBeenCalledWith(
      source._lastFileAnalysis,
      '/workspace',
      true,
      dependencies.disabledPlugins,
    );
    expect(source.invalidateWorkspaceFiles).not.toHaveBeenCalled();
    expect(graph).toEqual({ nodes: [{ id: 'node' }], edges: [] });
  });

  it('reanalyzes changed files and plugin-requested dependents, then persists the refreshed state', async () => {
    const source = createSource();
    const dependencies = createDependencies();
    source._readAnalysisFiles.mockResolvedValue([
      {
        absolutePath: '/workspace/src/a.ts',
        relativePath: 'src/a.ts',
        content: 'content:a',
      },
    ]);
    dependencies.notifyFilesChanged.mockResolvedValue({
      additionalFilePaths: ['src/b.ts'],
      requiresFullRefresh: false,
    });
    source._analyzeFiles.mockImplementation(async (_files, _root, onProgress) => {
      onProgress?.({ current: 1, total: 2, filePath: '/workspace/src/b.ts' });
      return {
        cacheHits: 0,
        cacheMisses: 2,
        fileAnalysis: new Map([
          ['src/a.ts', { filePath: '/workspace/src/a.ts', relations: [] }],
          ['src/b.ts', { filePath: '/workspace/src/b.ts', relations: [] }],
        ]),
        fileConnections: new Map([
          ['src/a.ts', [{ kind: 'import' }]],
          ['src/b.ts', [{ kind: 'call' }]],
        ]),
      };
    });

    const graph = await refreshWorkspacePipelineChangedFiles(source as never, dependencies as never);

    expect(source._lastDiscoveredFiles).toEqual(dependencies.discoveredFiles);
    expect(source._lastWorkspaceRoot).toBe('/workspace');
    expect(source.invalidateWorkspaceFiles).toHaveBeenCalledWith([
      '/workspace/src/a.ts',
      '/workspace/src/b.ts',
    ]);
    expect(dependencies.onProgress).toHaveBeenNthCalledWith(1, {
      phase: 'Applying Changes',
      current: 0,
      total: 2,
    });
    expect(dependencies.onProgress).toHaveBeenNthCalledWith(2, {
      phase: 'Applying Changes',
      current: 1,
      total: 2,
    });
    expect(source._lastFileAnalysis.get('src/a.ts')).toEqual({
      filePath: '/workspace/src/a.ts',
      relations: [],
    });
    expect(source._lastFileConnections.get('src/b.ts')).toEqual([{ kind: 'call' }]);
    expect(dependencies.persistCache).toHaveBeenCalledOnce();
    expect(dependencies.persistIndexMetadata).toHaveBeenCalledOnce();
    expect(graph).toEqual({ nodes: [{ id: 'node' }], edges: [] });
  });

  it('supports refreshes without a progress callback', async () => {
    const source = createSource();
    const dependencies = createDependencies();
    dependencies.onProgress = undefined;
    source._readAnalysisFiles.mockResolvedValue([
      {
        absolutePath: '/workspace/src/a.ts',
        relativePath: 'src/a.ts',
        content: 'content:a',
      },
    ]);
    dependencies.notifyFilesChanged.mockResolvedValue({
      additionalFilePaths: [],
      requiresFullRefresh: false,
    });
    source._analyzeFiles.mockResolvedValue({
      cacheHits: 0,
      cacheMisses: 1,
      fileAnalysis: new Map([
        ['src/a.ts', { filePath: '/workspace/src/a.ts', relations: [] }],
      ]),
      fileConnections: new Map([
        ['src/a.ts', []],
      ]),
    });

    await expect(
      refreshWorkspacePipelineChangedFiles(source as never, dependencies as never),
    ).resolves.toEqual({ nodes: [{ id: 'node' }], edges: [] });
  });
});
