import { describe, expect, it, vi } from 'vitest';
import {
  buildWorkspacePipelineGraph,
  buildWorkspacePipelineGraphFromAnalysis,
  buildWorkspacePipelineGraphForSource,
} from '../../src/graph/build';
import * as workspaceGraphDataModule from '../../src/graph/data';

describe('core/graph', () => {
  it('passes churn counts through before building graph data', () => {
    vi.spyOn(workspaceGraphDataModule, 'buildWorkspaceGraphData').mockReturnValue({
      nodes: [],
      edges: [],
    });

    expect(
      buildWorkspacePipelineGraph({
        cacheFiles: {},
        churnCounts: { 'src/index.ts': 3 },
        disabledPlugins: new Set<string>(['plugin.python']),
        fileConnections: new Map([['src/index.ts', []]]),
        getPluginForFile: vi.fn(),
        showOrphans: true,
        workspaceRoot: '/workspace',
      }),
    ).toEqual({ nodes: [], edges: [] });

    expect(workspaceGraphDataModule.buildWorkspaceGraphData).toHaveBeenCalledWith({
      cacheFiles: {},
      directoryPaths: [],
      disabledPlugins: new Set<string>(['plugin.python']),
      fileConnections: new Map([['src/index.ts', []]]),
      getPluginForFile: expect.any(Function),
      gitIgnoredPaths: [],
      showOrphans: true,
      churnCounts: { 'src/index.ts': 3 },
      workspaceRoot: '/workspace',
    });
  });

  it('builds graph data from the workspace analyzer source state', () => {
    const buildWorkspaceGraphDataSpy = vi
      .spyOn(workspaceGraphDataModule, 'buildWorkspaceGraphData')
      .mockReturnValue({ nodes: [], edges: [] });

    expect(
      buildWorkspacePipelineGraphForSource(
        {
          _cache: { files: { 'src/index.ts': { size: 5 } } },
          _lastDiscoveredDirectories: ['src/new-folder'],
          _registry: { getPluginForFile: vi.fn() },
        } as never,
        new Map([['src/index.ts', []]]),
        '/workspace',
        true,
        new Set(),
        { 'src/index.ts': 1 },
      ),
    ).toEqual({ nodes: [], edges: [] });

    expect(buildWorkspaceGraphDataSpy).toHaveBeenCalledWith({
      cacheFiles: { 'src/index.ts': { size: 5 } },
      directoryPaths: ['src/new-folder'],
      disabledPlugins: new Set(),
      fileConnections: new Map([['src/index.ts', []]]),
      getPluginForFile: expect.any(Function),
      gitIgnoredPaths: [],
      showOrphans: true,
      churnCounts: { 'src/index.ts': 1 },
      workspaceRoot: '/workspace',
    });
  });

  it('passes cached file analysis through when building symbol-capable graph data', () => {
    const buildWorkspaceGraphDataFromAnalysisSpy = vi
      .spyOn(workspaceGraphDataModule, 'buildWorkspaceGraphDataFromAnalysis')
      .mockReturnValue({ nodes: [], edges: [] });
    const fileAnalysis = new Map([
      ['src/index.ts', {
        filePath: '/workspace/src/index.ts',
        symbols: [{ id: 'symbol-id', filePath: '/workspace/src/index.ts', kind: 'function', name: 'run' }],
        relations: [],
      }],
    ]);

    expect(
      buildWorkspacePipelineGraphFromAnalysis({
        cacheFiles: { 'src/index.ts': { size: 5 } },
        churnCounts: { 'src/index.ts#run:function': 2 },
        disabledPlugins: new Set<string>(['plugin.python']),
        fileAnalysis,
        getPluginForFile: vi.fn(),
        showOrphans: true,
        workspaceRoot: '/workspace',
      }),
    ).toEqual({ nodes: [], edges: [] });

    expect(buildWorkspaceGraphDataFromAnalysisSpy).toHaveBeenCalledWith({
      cacheFiles: { 'src/index.ts': { size: 5 } },
      directoryPaths: [],
      disabledPlugins: new Set<string>(['plugin.python']),
      fileAnalysis,
      getPluginForFile: expect.any(Function),
      gitIgnoredPaths: [],
      nodeVisibility: undefined,
      showOrphans: true,
      churnCounts: { 'src/index.ts#run:function': 2 },
      workspaceRoot: '/workspace',
    });
  });
});
