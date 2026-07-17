import { describe, expect, it, vi, beforeEach } from 'vitest';
import { hasRequiredAnalysisCacheTiers } from '@codegraphy-dev/core';
import {
  canReuseCurrentAnalysisForScope,
  rebuildAnalysisScopeFromCurrentAnalysis,
  type AnalysisScopeRefreshFacade,
} from '../../../../../src/extension/pipeline/service/refresh/scope';
import { createWorkspacePipelineAnalysisCacheTiers } from '../../../../../src/extension/pipeline/service/cache/tiers';
import type { IGraphData } from '../../../../../src/shared/graph/contracts';

vi.mock('@codegraphy-dev/core', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@codegraphy-dev/core')>()),
  hasRequiredAnalysisCacheTiers: vi.fn(),
}));

vi.mock('../../../../../src/extension/pipeline/service/cache/tiers', () => ({
  createWorkspacePipelineAnalysisCacheTiers: vi.fn(),
}));

function createGraph(id = 'graph'): IGraphData {
  return {
    nodes: [{ id, label: id, color: '#67E8F9', nodeType: 'file' }],
    edges: [],
  };
}

function createFile(relativePath: string) {
  return {
    absolutePath: `/workspace/${relativePath}`,
    extension: '.ts',
    name: relativePath.split('/').at(-1) ?? relativePath,
    relativePath,
  };
}

describe('extension/pipeline/service/refresh/scope', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(createWorkspacePipelineAnalysisCacheTiers).mockReturnValue({
      active: ['baseline'],
      completed: ['baseline'],
      required: ['baseline', 'plugin:plugin.a'],
    });
  });

  it('does not reuse current analysis when no files are discovered', () => {
    expect(
      canReuseCurrentAnalysisForScope({
        activePluginIds: ['plugin.a'],
        discoveredFiles: [],
        disabledPlugins: new Set(),
        lastFileAnalysis: new Map(),
      }),
    ).toBe(false);
    expect(createWorkspacePipelineAnalysisCacheTiers).not.toHaveBeenCalled();
  });

  it('reuses current analysis only when every discovered file has required tiers', () => {
    const firstAnalysis = { filePath: '/workspace/src/a.ts' };
    const secondAnalysis = { filePath: '/workspace/src/b.ts' };
    const lastFileAnalysis = new Map([
      ['src/a.ts', firstAnalysis],
      ['src/b.ts', secondAnalysis],
    ]);
    vi.mocked(hasRequiredAnalysisCacheTiers)
      .mockReturnValueOnce(true)
      .mockReturnValueOnce(false);

    expect(
      canReuseCurrentAnalysisForScope({
        activePluginIds: ['plugin.a'],
        discoveredFiles: [createFile('src/a.ts'), createFile('src/b.ts')],
        disabledPlugins: new Set(['plugin.disabled']),
        lastFileAnalysis: lastFileAnalysis as never,
      }),
    ).toBe(false);

    expect(createWorkspacePipelineAnalysisCacheTiers).toHaveBeenCalledWith(
      ['plugin.a'],
    );
    expect(hasRequiredAnalysisCacheTiers).toHaveBeenNthCalledWith(
      1,
      firstAnalysis,
      ['baseline', 'plugin:plugin.a'],
    );
    expect(hasRequiredAnalysisCacheTiers).toHaveBeenNthCalledWith(
      2,
      secondAnalysis,
      ['baseline', 'plugin:plugin.a'],
    );

    vi.mocked(hasRequiredAnalysisCacheTiers).mockReset();
    vi.mocked(hasRequiredAnalysisCacheTiers).mockReturnValue(true);

    expect(
      canReuseCurrentAnalysisForScope({
        activePluginIds: ['plugin.a'],
        discoveredFiles: [createFile('src/a.ts'), createFile('src/b.ts')],
        disabledPlugins: new Set(),
        lastFileAnalysis: lastFileAnalysis as never,
      }),
    ).toBe(true);
  });

  it('does not reuse current analysis when a discovered file has no analysis', () => {
    vi.mocked(hasRequiredAnalysisCacheTiers).mockReturnValue(true);

    expect(
      canReuseCurrentAnalysisForScope({
        activePluginIds: [],
        discoveredFiles: [createFile('src/missing.ts')],
        disabledPlugins: new Set(),
        lastFileAnalysis: new Map() as never,
      }),
    ).toBe(false);
    expect(hasRequiredAnalysisCacheTiers).not.toHaveBeenCalled();
  });

  it('rebuilds graph data from current analysis and updates retained scope state', async () => {
    const graphData = createGraph('rebuilt');
    const fileAnalysis = new Map([['src/a.ts', { filePath: '/workspace/src/a.ts' }]]);
    const facade: AnalysisScopeRefreshFacade = {
      _buildGraphDataFromAnalysis: vi.fn(() => graphData) as never,
      _lastDiscoveredDirectories: [],
      _lastDiscoveredFiles: [],
      _lastFileAnalysis: fileAnalysis as never,
      _lastWorkspaceRoot: '',
      _persistIndexMetadata: vi.fn(async () => undefined),
    };
    const discoveredDirectories = ['src', 'src/nested'];
    const discoveredFiles = [createFile('src/a.ts')];
    const disabledPlugins = new Set(['plugin.disabled']);
    const onProgress = vi.fn();

    await expect(
      rebuildAnalysisScopeFromCurrentAnalysis(facade, {
        discoveredDirectories,
        discoveredFiles,
        disabledPlugins,
        onProgress,
        showOrphans: false,
        workspaceRoot: '/workspace',
      }),
    ).resolves.toBe(graphData);

    expect(onProgress).toHaveBeenNthCalledWith(1, {
      phase: 'Applying Scope',
      current: 0,
      total: 1,
    });
    expect(onProgress).toHaveBeenNthCalledWith(2, {
      phase: 'Applying Scope',
      current: 1,
      total: 1,
    });
    expect(facade._lastDiscoveredDirectories).toEqual(discoveredDirectories);
    expect(facade._lastDiscoveredDirectories).not.toBe(discoveredDirectories);
    expect(facade._lastDiscoveredFiles).toBe(discoveredFiles);
    expect(facade._lastWorkspaceRoot).toBe('/workspace');
    expect(facade._buildGraphDataFromAnalysis).toHaveBeenCalledWith(
      fileAnalysis,
      '/workspace',
      false,
      disabledPlugins,
    );
    expect(facade._persistIndexMetadata).toHaveBeenCalledOnce();
  });

  it('rebuilds analysis scope without progress callbacks', async () => {
    const graphData = createGraph('no-progress');
    const facade: AnalysisScopeRefreshFacade = {
      _buildGraphDataFromAnalysis: vi.fn(() => graphData) as never,
      _lastDiscoveredDirectories: [],
      _lastDiscoveredFiles: [],
      _lastFileAnalysis: new Map() as never,
      _lastWorkspaceRoot: '',
      _persistIndexMetadata: vi.fn(async () => undefined),
    };

    await expect(
      rebuildAnalysisScopeFromCurrentAnalysis(facade, {
        discoveredDirectories: [],
        discoveredFiles: [],
        disabledPlugins: new Set(),
        showOrphans: true,
        workspaceRoot: '/workspace',
      }),
    ).resolves.toBe(graphData);
  });
});
