import { describe, expect, it, vi } from 'vitest';
import {
  buildWorkspacePipelineGraph,
  buildWorkspacePipelineGraphFromAnalysis,
  buildWorkspacePipelineGraphForSource,
} from '../../src/graph/build';
import {
  onPerfMetric,
  startPerfMetricSession,
  type PerfMetricDiagnosticEvent,
} from '../../src/diagnostics/perfMetrics';
import * as workspaceGraphDataModule from '../../src/graph/data';

describe('core/graph', () => {
  it('reports connection graph construction duration while metric collection is armed', () => {
    vi.spyOn(workspaceGraphDataModule, 'buildWorkspaceGraphData').mockReturnValue({
      nodes: [],
      edges: [],
    });
    const now = vi.spyOn(performance, 'now')
      .mockReturnValueOnce(20)
      .mockReturnValueOnce(27);
    const received: PerfMetricDiagnosticEvent[] = [];
    const subscription = onPerfMetric(event => received.push(event));
    const session = startPerfMetricSession({
      runId: 'connection-graph-build-run',
      scenario: 'cold-open',
    });

    try {
      buildWorkspacePipelineGraph({
        cacheFiles: {},
        churnCounts: {},
        disabledPlugins: new Set(),
        fileConnections: new Map(),
        getPluginForFile: vi.fn(),
        showOrphans: true,
        workspaceRoot: '/workspace',
      });

      expect(received).toEqual([{
        area: 'performance',
        event: 'metric',
        context: {
          runId: 'connection-graph-build-run',
          scenario: 'cold-open',
          metric: 'graphBuildMs',
          value: 7,
          unit: 'ms',
          dimension: 'workspace-pipeline-connections',
        },
      }]);
      expect(now).toHaveBeenCalledTimes(2);
    } finally {
      session.dispose();
      subscription.dispose();
      now.mockRestore();
    }
  });

  it('reports analysis graph construction duration while metric collection is armed', () => {
    vi.spyOn(workspaceGraphDataModule, 'buildWorkspaceGraphDataFromAnalysis').mockReturnValue({
      nodes: [],
      edges: [],
    });
    const now = vi.spyOn(performance, 'now')
      .mockReturnValueOnce(30)
      .mockReturnValueOnce(41);
    const received: PerfMetricDiagnosticEvent[] = [];
    const subscription = onPerfMetric(event => received.push(event));
    const session = startPerfMetricSession({
      runId: 'analysis-graph-build-run',
      scenario: 'scope-toggle',
      operationId: 'scope-operation',
    });

    try {
      buildWorkspacePipelineGraphFromAnalysis({
        cacheFiles: {},
        churnCounts: {},
        disabledPlugins: new Set(),
        fileAnalysis: new Map(),
        getPluginForFile: vi.fn(),
        showOrphans: true,
        workspaceRoot: '/workspace',
      });

      expect(received).toEqual([{
        area: 'performance',
        event: 'metric',
        context: {
          runId: 'analysis-graph-build-run',
          scenario: 'scope-toggle',
          operationId: 'scope-operation',
          metric: 'graphBuildMs',
          value: 11,
          unit: 'ms',
          dimension: 'workspace-pipeline-analysis',
        },
      }]);
      expect(now).toHaveBeenCalledTimes(2);
    } finally {
      session.dispose();
      subscription.dispose();
      now.mockRestore();
    }
  });

  it('does not read the clock without an armed metric session', () => {
    vi.spyOn(workspaceGraphDataModule, 'buildWorkspaceGraphData').mockReturnValue({
      nodes: [],
      edges: [],
    });
    vi.spyOn(workspaceGraphDataModule, 'buildWorkspaceGraphDataFromAnalysis').mockReturnValue({
      nodes: [],
      edges: [],
    });
    const now = vi.spyOn(performance, 'now');
    const received: PerfMetricDiagnosticEvent[] = [];
    const subscription = onPerfMetric(event => received.push(event));

    try {
      buildWorkspacePipelineGraph({
        cacheFiles: {},
        churnCounts: {},
        disabledPlugins: new Set(),
        fileConnections: new Map(),
        getPluginForFile: vi.fn(),
        showOrphans: true,
        workspaceRoot: '/workspace',
      });
      buildWorkspacePipelineGraphFromAnalysis({
        cacheFiles: {},
        churnCounts: {},
        disabledPlugins: new Set(),
        fileAnalysis: new Map(),
        getPluginForFile: vi.fn(),
        showOrphans: true,
        workspaceRoot: '/workspace',
      });

      expect(now).not.toHaveBeenCalled();
      expect(received).toEqual([]);
    } finally {
      subscription.dispose();
      now.mockRestore();
    }
  });

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
