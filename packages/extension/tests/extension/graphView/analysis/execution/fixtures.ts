import { vi } from 'vitest';
import type { IGraphData } from '../../../../../src/shared/graph/contracts';
import type {
  GraphViewAnalysisExecutionHandlers,
  GraphViewAnalysisExecutionState,
} from '../../../../../src/extension/graphView/analysis/execution';

export function createExecutionState(
  overrides: Partial<GraphViewAnalysisExecutionState> = {},
): GraphViewAnalysisExecutionState {
  return {
    analyzer: undefined,
    analyzerInitialized: false,
    analyzerInitPromise: undefined,
    mode: 'analyze',
    filterPatterns: [],
    disabledPlugins: new Set<string>(),
    ...overrides,
  };
}

export function createExecutionAnalyzer(
  overrides: Partial<NonNullable<GraphViewAnalysisExecutionState['analyzer']>> = {},
) {
  return {
    initialize: vi.fn(async () => undefined),
    hasIndex: vi.fn(() => true),
    discoverGraph: vi.fn(async () => ({ nodes: [], edges: [] })),
    analyze: vi.fn(async () => ({ nodes: [], edges: [] })),
    refreshIndex: vi.fn(async () => ({ nodes: [], edges: [] })),
    refreshChangedFiles: vi.fn(async () => ({ nodes: [], edges: [] })),
    registry: {
      notifyPostAnalyze: vi.fn(),
    },
    ...overrides,
  };
}

export function createExecutionHandlers(
  overrides: Partial<GraphViewAnalysisExecutionHandlers> = {},
) {
  let graphData: IGraphData = { nodes: [], edges: [] };

  const handlers: GraphViewAnalysisExecutionHandlers = {
    isAnalysisStale: vi.fn(() => false),
    hasWorkspace: vi.fn(() => true),
    setRawGraphData: vi.fn(),
    setGraphData: vi.fn((nextGraphData: IGraphData) => {
      graphData = nextGraphData;
    }),
    getGraphData: vi.fn(() => graphData),
    sendGraphDataUpdated: vi.fn(),
    sendDepthState: vi.fn(),
    computeMergedGroups: vi.fn(),
    sendGroupsUpdated: vi.fn(),
    updateViewContext: vi.fn(),
    applyViewTransform: vi.fn(),
    sendPluginStatuses: vi.fn(),
    sendDecorations: vi.fn(),
    sendContextMenuItems: vi.fn(),
    sendGraphIndexStatusUpdated: vi.fn(),
    sendIndexProgress: vi.fn(),
    markWorkspaceReady: vi.fn(),
    isAbortError: vi.fn(() => false),
    logError: vi.fn(),
    ...overrides,
  };

  return { handlers, getGraphData: () => graphData };
}
