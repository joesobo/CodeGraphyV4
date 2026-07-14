import { describe, expect, it } from 'vitest';
import type { IGraphData, IGraphEdge, IGraphNode } from '../../../../../../src/shared/graph/contracts';
import type {
  GraphViewAnalysisExecutionHandlers,
  GraphViewAnalysisExecutionState,
  GraphViewAnalysisMode,
} from '../../../../../../src/extension/graphView/analysis/execution';
import { createGraphPublicationPlan } from '../../../../../../src/extension/graphView/analysis/execution/publish/plan';

function createNode(overrides: Partial<IGraphNode> = {}): IGraphNode {
  return {
    id: 'src/a.ts',
    label: 'a.ts',
    color: '#67E8F9',
    nodeType: 'file',
    ...overrides,
  };
}

function createEdge(overrides: Partial<IGraphEdge> = {}): IGraphEdge {
  return {
    id: 'src/a.ts->src/b.ts#import',
    from: 'src/a.ts',
    to: 'src/b.ts',
    kind: 'import',
    sources: [],
    ...overrides,
  };
}

function createGraph(overrides: Partial<IGraphData> = {}): IGraphData {
  return {
    nodes: [createNode({ fileSize: 10 })],
    edges: [createEdge()],
    ...overrides,
  };
}

function createState(
  mode: GraphViewAnalysisMode,
  overrides: Partial<GraphViewAnalysisExecutionState> = {},
): GraphViewAnalysisExecutionState {
  return {
    analyzer: undefined,
    analyzerInitialized: false,
    analyzerInitPromise: undefined,
    mode,
    filterPatterns: [],
    disabledPlugins: new Set(),
    ...overrides,
  };
}

function createHandlers(
  overrides: Partial<GraphViewAnalysisExecutionHandlers> = {},
): GraphViewAnalysisExecutionHandlers {
  return overrides as GraphViewAnalysisExecutionHandlers;
}

describe('extension/graphView/analysis/execution/publish/plan', () => {
  it('reuses the current graph publication for unchanged fresh incremental graphs', () => {
    const currentGraph = createGraph();

    expect(createGraphPublicationPlan(
      createState('incremental'),
      createHandlers({ getRawGraphData: () => currentGraph }),
      createGraph(),
      true,
      'fresh',
    )).toMatchObject({
      currentRawGraphData: currentGraph,
      metricOnlyUpdate: undefined,
      reuseCurrentGraphPublication: true,
      shouldSendMetricPatch: false,
    });
  });

  it.each([
    ['analyze mode', createState('analyze'), true, 'fresh'],
    ['missing index', createState('incremental'), false, 'fresh'],
    ['stale freshness', createState('incremental'), true, 'stale'],
  ] as const)('does not reuse the current graph publication for %s', (_caseName, state, actualHasIndex, freshness) => {
    const currentGraph = createGraph();

    expect(createGraphPublicationPlan(
      state,
      createHandlers({ getRawGraphData: () => currentGraph }),
      createGraph(),
      actualHasIndex,
      freshness,
    ).reuseCurrentGraphPublication).toBe(false);
  });

  it('does not reuse the current graph publication when no current graph is available', () => {
    expect(createGraphPublicationPlan(
      createState('incremental'),
      createHandlers(),
      createGraph(),
      true,
      'fresh',
    )).toMatchObject({
      currentRawGraphData: undefined,
      metricOnlyUpdate: undefined,
      reuseCurrentGraphPublication: false,
      shouldSendMetricPatch: false,
    });
  });

  it('enables metric patch publication when a metric-only update and sender are available', () => {
    expect(createGraphPublicationPlan(
      createState('incremental', { changedFilePaths: ['src/a.ts'] }),
      createHandlers({
        getRawGraphData: () => createGraph(),
        sendGraphNodeMetricsUpdated: () => {},
      }),
      createGraph({ nodes: [createNode({ fileSize: 15 })] }),
      true,
      'fresh',
    )).toMatchObject({
      metricOnlyUpdate: [{ id: 'src/a.ts', fileSize: 15 }],
      reuseCurrentGraphPublication: false,
      shouldSendMetricPatch: true,
    });
  });

  it('keeps metric patches disabled when the sender is unavailable', () => {
    expect(createGraphPublicationPlan(
      createState('incremental', { changedFilePaths: ['src/a.ts'] }),
      createHandlers({ getRawGraphData: () => createGraph() }),
      createGraph({ nodes: [createNode({ fileSize: 15 })] }),
      true,
      'fresh',
    )).toMatchObject({
      metricOnlyUpdate: [{ id: 'src/a.ts', fileSize: 15 }],
      reuseCurrentGraphPublication: false,
      shouldSendMetricPatch: false,
    });
  });

  it('keeps metric patches disabled when no metric-only update exists', () => {
    expect(createGraphPublicationPlan(
      createState('incremental'),
      createHandlers({
        getRawGraphData: () => createGraph(),
        sendGraphNodeMetricsUpdated: () => {},
      }),
      createGraph(),
      true,
      'fresh',
    )).toMatchObject({
      metricOnlyUpdate: undefined,
      reuseCurrentGraphPublication: true,
      shouldSendMetricPatch: false,
    });
  });
});
