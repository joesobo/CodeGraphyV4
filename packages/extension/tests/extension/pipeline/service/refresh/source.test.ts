import { describe, expect, it, vi } from 'vitest';
import type { IGraphData } from '../../../../../src/shared/graph/contracts';
import {
  createWorkspaceIndexRefreshSource,
  type RefreshSourceFacade,
} from '../../../../../src/extension/pipeline/service/refresh/source';

function createGraph(id = 'graph'): IGraphData {
  return {
    nodes: [{ id, label: id, color: '#67E8F9', nodeType: 'file' }],
    edges: [],
  };
}

function createRefreshFacade(): RefreshSourceFacade {
  const graphData = createGraph();
  return {
    _analyzeFiles: vi.fn(async () => ({
      fileAnalysis: new Map(),
      fileConnections: new Map(),
    })) as unknown as RefreshSourceFacade['_analyzeFiles'],
    _buildGraphData: vi.fn(() => graphData) as unknown as RefreshSourceFacade['_buildGraphData'],
    _buildGraphDataFromAnalysis: vi.fn(() => graphData) as unknown as RefreshSourceFacade['_buildGraphDataFromAnalysis'],
    _lastDiscoveredDirectories: ['src'],
    _lastDiscoveredFiles: [{ absolutePath: '/workspace/src/a.ts', extension: '.ts', name: 'a.ts', relativePath: 'src/a.ts' }],
    _lastFileAnalysis: new Map(),
    _lastFileConnections: new Map(),
    _lastGraphData: graphData,
    _lastWorkspaceRoot: '/workspace',
    _patchGraphDataNodeMetrics: vi.fn(() => graphData) as unknown as RefreshSourceFacade['_patchGraphDataNodeMetrics'],
    _preAnalyzePlugins: vi.fn(async () => undefined) as unknown as RefreshSourceFacade['_preAnalyzePlugins'],
    _readAnalysisFiles: vi.fn(async () => []) as unknown as RefreshSourceFacade['_readAnalysisFiles'],
    analyze: vi.fn(async () => graphData) as unknown as RefreshSourceFacade['analyze'],
    invalidateWorkspaceFiles: vi.fn() as unknown as RefreshSourceFacade['invalidateWorkspaceFiles'],
  };
}

describe('extension/pipeline/service/refresh/source', () => {
  it('delegates refresh source methods with default and override plugin disable sets', async () => {
    const facade = createRefreshFacade();
    const defaultDisabledPlugins = new Set(['plugin.default']);
    const overrideDisabledPlugins = new Set(['plugin.override']);
    const source = createWorkspaceIndexRefreshSource(facade, defaultDisabledPlugins);
    const files = [{ absolutePath: '/workspace/src/a.ts', relativePath: 'src/a.ts' }];
    const progress = vi.fn();
    const abortSignal = new AbortController().signal;
    const pluginIds = ['plugin.a'];
    const fileConnections = new Map([['src/a.ts', []]]);
    const fileAnalysis = new Map([['src/a.ts', { filePath: '/workspace/src/a.ts', relations: [] }]]);
    const graphData = createGraph('input');
    const patterns = ['src/**'];

    await source._analyzeFiles(
      files as never,
      '/workspace',
      progress,
      abortSignal,
      pluginIds,
    );
    expect(facade._analyzeFiles).toHaveBeenCalledWith(
      files,
      '/workspace',
      progress,
      abortSignal,
      pluginIds,
      defaultDisabledPlugins,
    );

    await source._analyzeFiles(
      files as never,
      '/workspace',
      progress,
      abortSignal,
      pluginIds,
      overrideDisabledPlugins,
    );
    expect(facade._analyzeFiles).toHaveBeenLastCalledWith(
      files,
      '/workspace',
      progress,
      abortSignal,
      pluginIds,
      overrideDisabledPlugins,
    );

    source._buildGraphData(fileConnections as never, '/workspace', overrideDisabledPlugins);
    expect(facade._buildGraphData).toHaveBeenCalledWith(
      fileConnections,
      '/workspace',
      true,
      overrideDisabledPlugins,
    );

    source._buildGraphDataFromAnalysis(fileAnalysis as never, '/workspace', overrideDisabledPlugins);
    expect(facade._buildGraphDataFromAnalysis).toHaveBeenCalledWith(
      fileAnalysis,
      '/workspace',
      true,
      overrideDisabledPlugins,
    );

    expect(source._patchGraphDataNodeMetrics).toBeDefined();
    source._patchGraphDataNodeMetrics?.(graphData, ['src/a.ts']);
    expect(facade._patchGraphDataNodeMetrics).toHaveBeenCalledWith(graphData, ['src/a.ts']);

    await source._preAnalyzePlugins(files as never, '/workspace', abortSignal);
    expect(facade._preAnalyzePlugins).toHaveBeenCalledWith(
      files,
      '/workspace',
      abortSignal,
      defaultDisabledPlugins,
    );

    await source._preAnalyzePlugins(
      files as never,
      '/workspace',
      abortSignal,
      overrideDisabledPlugins,
    );
    expect(facade._preAnalyzePlugins).toHaveBeenLastCalledWith(
      files,
      '/workspace',
      abortSignal,
      overrideDisabledPlugins,
    );

    await source._readAnalysisFiles(files as never);
    expect(facade._readAnalysisFiles).toHaveBeenCalledWith(files);

    await source.analyze(patterns, overrideDisabledPlugins, abortSignal, progress);
    expect(facade.analyze).toHaveBeenCalledWith(
      patterns,
      overrideDisabledPlugins,
      abortSignal,
      progress,
    );

    source.invalidateWorkspaceFiles(['src/a.ts']);
    expect(facade.invalidateWorkspaceFiles).toHaveBeenCalledWith(['src/a.ts']);
  });

  it('mirrors refresh source retained state through live accessors', () => {
    const facade = createRefreshFacade();
    const source = createWorkspaceIndexRefreshSource(facade);
    const nextDirectories = ['src', 'test'];
    const nextFiles = [{ absolutePath: '/workspace/src/b.ts', extension: '.ts', name: 'b.ts', relativePath: 'src/b.ts' }];
    const nextFileAnalysis = new Map([['src/b.ts', { filePath: '/workspace/src/b.ts', relations: [] }]]);
    const nextFileConnections = new Map([['src/b.ts', []]]);
    const nextGraphData = createGraph('next');

    expect(source._lastDiscoveredDirectories).toBe(facade._lastDiscoveredDirectories);
    source._lastDiscoveredDirectories = nextDirectories as never;
    expect(facade._lastDiscoveredDirectories).toBe(nextDirectories);

    expect(source._lastDiscoveredFiles).toBe(facade._lastDiscoveredFiles);
    source._lastDiscoveredFiles = nextFiles as never;
    expect(facade._lastDiscoveredFiles).toBe(nextFiles);

    expect(source._lastFileAnalysis).toBe(facade._lastFileAnalysis);
    source._lastFileAnalysis = nextFileAnalysis as never;
    expect(facade._lastFileAnalysis).toBe(nextFileAnalysis);

    expect(source._lastFileConnections).toBe(facade._lastFileConnections);
    source._lastFileConnections = nextFileConnections as never;
    expect(facade._lastFileConnections).toBe(nextFileConnections);

    expect(source._lastGraphData).toBe(facade._lastGraphData);
    source._lastGraphData = nextGraphData;
    expect(facade._lastGraphData).toBe(nextGraphData);

    expect(source._lastWorkspaceRoot).toBe('/workspace');
    source._lastWorkspaceRoot = '/next-workspace';
    expect(facade._lastWorkspaceRoot).toBe('/next-workspace');
  });
});
