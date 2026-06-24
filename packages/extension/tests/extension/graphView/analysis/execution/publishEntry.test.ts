import { describe, expect, it, vi } from 'vitest';
import type { IGraphData } from '../../../../../src/shared/graph/contracts';
import {
  publishAnalyzedGraph,
  publishAnalysisFailure,
} from '../../../../../src/extension/graphView/analysis/execution/publish';
import {
  createExecutionHandlers,
  createExecutionState,
} from './fixtures';

const rawGraphData: IGraphData = {
  nodes: [{ id: 'src/index.ts', label: 'src/index.ts', color: '#ffffff' }],
  edges: [],
};

describe('graph view analysis execution publish entry points', () => {
  it('skips graph view update progress outside indexed update modes', () => {
    const { handlers } = createExecutionHandlers({
      sendIndexProgress: vi.fn(),
    });

    publishAnalyzedGraph(
      createExecutionState({ mode: 'analyze' }),
      handlers,
      rawGraphData,
      true,
    );

    expect(handlers.sendIndexProgress).not.toHaveBeenCalled();
  });

  it('does not require a progress broadcaster for indexed update modes', () => {
    const { handlers } = createExecutionHandlers({
      sendIndexProgress: undefined,
    });

    expect(() => publishAnalyzedGraph(
      createExecutionState({ mode: 'index' }),
      handlers,
      rawGraphData,
      true,
    )).not.toThrow();
  });

  it('publishes analysis failure without optional contribution status broadcaster', () => {
    const { handlers } = createExecutionHandlers({
      sendGraphViewContributionStatuses: undefined,
    });

    expect(() => publishAnalysisFailure(handlers)).not.toThrow();
    expect(handlers.markWorkspaceReady).toHaveBeenCalledWith({ nodes: [], edges: [] });
  });
});
