import { describe, expect, it } from 'vitest';
import {
  createSource,
  createDependencies,
  refreshWorkspacePipelineChangedFiles,
} from './refreshFixture';

describe('pipeline/service/refresh fallback', () => {
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

    forwardedProgress({ phase: 'Analyzing Files', current: 2, total: 5 });

    expect(source._readAnalysisFiles).toHaveBeenCalledWith([
      { absolutePath: '/workspace/src/a.ts', relativePath: 'src/a.ts' },
    ]);
    expect(source.analyze).toHaveBeenCalledWith(
      ['**/*.ts'],
      dependencies.disabledPlugins,
      dependencies.signal,
      expect.any(Function),
    );
    expect(dependencies.onProgress).toHaveBeenCalledWith({
      phase: 'Analyzing Files',
      current: 2,
      total: 5,
    });
    expect(graph).toEqual({ nodes: [{ id: 'full' }], edges: [] });
  });

  it('falls back to a full analyze run when changed paths are no longer discovered', async () => {
    const source = createSource();
    const dependencies = createDependencies();
    dependencies.filePaths = ['/workspace/missing.ts'];
    dependencies.notifyFilesChanged.mockResolvedValue({
      additionalFilePaths: ['src/missing.ts'],
      requiresFullRefresh: false,
    });
    source._readAnalysisFiles.mockResolvedValue([]);
    source.analyze.mockResolvedValue({ nodes: [{ id: 'full' }], edges: [] });
    source._lastFileAnalysis.set('src/existing.ts', {
      filePath: '/workspace/src/existing.ts',
      relations: [],
    });

    const graph = await refreshWorkspacePipelineChangedFiles(source as never, dependencies as never);

    expect(source.invalidateWorkspaceFiles).toHaveBeenCalledWith(
      ['/workspace/missing.ts'],
      { persist: false },
    );
    expect(source._readAnalysisFiles).not.toHaveBeenCalled();
    expect(dependencies.notifyFilesChanged).not.toHaveBeenCalled();
    expect(source._buildGraphDataFromAnalysis).not.toHaveBeenCalled();
    expect(source.analyze).toHaveBeenCalledWith(
      ['**/*.ts'],
      dependencies.disabledPlugins,
      dependencies.signal,
      expect.any(Function),
    );
    expect(graph).toEqual({ nodes: [{ id: 'full' }], edges: [] });
  });
});
