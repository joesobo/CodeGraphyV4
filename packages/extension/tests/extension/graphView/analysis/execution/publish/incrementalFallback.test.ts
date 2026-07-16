import { describe, expect, it, vi } from 'vitest';
import type { IGraphData } from '../../../../../../src/shared/graph/contracts';

import { publishAnalyzedGraph } from '../../../../../../src/extension/graphView/analysis/execution/publish';
import {
  createExecutionAnalyzer,
  createExecutionHandlers,
  createExecutionState,
} from '../fixtures';

describe('graph view analysis incremental full publication fallback', () => {
  it('falls back to full graph publication when changed node metrics also change edges', () => {
    const currentGraphData: IGraphData = {
      nodes: [{
        id: 'src/index.ts',
        label: 'index.ts',
        color: '#ffffff',
        fileSize: 100,
      }],
      edges: [],
    };
    const nextGraphData: IGraphData = {
      nodes: [{
        id: 'src/index.ts',
        label: 'index.ts',
        color: '#ffffff',
        fileSize: 120,
      }],
      edges: [{
        id: 'src/index.ts->src/view.ts#import',
        from: 'src/index.ts',
        to: 'src/view.ts',
        kind: 'import',
        sources: [],
      }],
    };
    const state = createExecutionState({
      mode: 'incremental',
      changedFilePaths: ['/workspace/src/index.ts'],
      analyzer: createExecutionAnalyzer(),
    });
    const sendGraphNodeMetricsUpdated = vi.fn();
    const { handlers } = createExecutionHandlers({
      applyViewTransform: vi.fn(() => {
        handlers.setGraphData(nextGraphData);
      }),
      sendGraphNodeMetricsUpdated,
    });
    handlers.setRawGraphData(currentGraphData);
    handlers.setGraphData(currentGraphData);
    vi.mocked(handlers.setRawGraphData).mockClear();
    vi.mocked(handlers.setGraphData).mockClear();

    publishAnalyzedGraph(state, handlers, nextGraphData, true);

    expect(sendGraphNodeMetricsUpdated).not.toHaveBeenCalled();
    expect(handlers.sendGraphDataUpdated).toHaveBeenCalledWith(nextGraphData);
  });

  it('falls back to full graph publication when an unrelated edge changes during a metric update', () => {
    const currentGraphData: IGraphData = {
      nodes: [
        {
          id: 'src/index.ts',
          label: 'index.ts',
          color: '#ffffff',
          fileSize: 100,
        },
        {
          id: 'src/other.ts',
          label: 'other.ts',
          color: '#ffffff',
        },
        {
          id: 'src/leaf.ts',
          label: 'leaf.ts',
          color: '#ffffff',
        },
      ],
      edges: [{
        id: 'src/other.ts->src/leaf.ts#import',
        from: 'src/other.ts',
        to: 'src/leaf.ts',
        kind: 'import',
        sources: [],
      }],
    };
    const nextGraphData: IGraphData = {
      nodes: [
        {
          id: 'src/index.ts',
          label: 'index.ts',
          color: '#ffffff',
          fileSize: 120,
        },
        {
          id: 'src/other.ts',
          label: 'other.ts',
          color: '#ffffff',
        },
        {
          id: 'src/leaf.ts',
          label: 'leaf.ts',
          color: '#ffffff',
        },
      ],
      edges: [{
        id: 'src/other.ts->src/leaf.ts#reference',
        from: 'src/other.ts',
        to: 'src/leaf.ts',
        kind: 'reference',
        sources: [],
      }],
    };
    const state = createExecutionState({
      mode: 'incremental',
      changedFilePaths: ['/workspace/src/index.ts'],
      analyzer: createExecutionAnalyzer(),
    });
    const sendGraphNodeMetricsUpdated = vi.fn();
    const { handlers } = createExecutionHandlers({
      applyViewTransform: vi.fn(() => {
        handlers.setGraphData(nextGraphData);
      }),
      sendGraphNodeMetricsUpdated,
    });
    handlers.setRawGraphData(currentGraphData);
    handlers.setGraphData(currentGraphData);
    vi.mocked(handlers.setRawGraphData).mockClear();
    vi.mocked(handlers.setGraphData).mockClear();

    publishAnalyzedGraph(state, handlers, nextGraphData, true);

    expect(sendGraphNodeMetricsUpdated).not.toHaveBeenCalled();
    expect(handlers.sendGraphDataUpdated).toHaveBeenCalledWith(nextGraphData);
  });

  it('skips unrelated edge serialization when a changed node metric already differs', () => {
    let serializedUnrelatedEdgeCount = 0;
    const affectedEdge = {
      id: 'src/index.ts->src/view.ts#import',
      from: 'src/index.ts',
      to: 'src/view.ts',
      kind: 'import',
      sources: [],
    } satisfies IGraphData['edges'][number];
    const unrelatedEdge = {
      id: 'src/other.ts->src/leaf.ts#import',
      from: 'src/other.ts',
      to: 'src/leaf.ts',
      kind: 'import',
      sources: [],
      toJSON: () => {
        serializedUnrelatedEdgeCount += 1;
        return {
          id: 'src/other.ts->src/leaf.ts#import',
          from: 'src/other.ts',
          to: 'src/leaf.ts',
          kind: 'import',
          sources: [],
        };
      },
    } as IGraphData['edges'][number] & { toJSON(): unknown };
    const currentGraphData: IGraphData = {
      nodes: [{
        id: 'src/index.ts',
        label: 'index.ts',
        color: '#ffffff',
        fileSize: 100,
      }],
      edges: [affectedEdge, unrelatedEdge],
    };
    const nextGraphData: IGraphData = {
      nodes: [{
        id: 'src/index.ts',
        label: 'index.ts',
        color: '#ffffff',
        fileSize: 120,
      }],
      edges: [affectedEdge, unrelatedEdge],
    };
    const state = createExecutionState({
      mode: 'incremental',
      changedFilePaths: ['/workspace/src/index.ts'],
      analyzer: createExecutionAnalyzer(),
    });
    const sendGraphNodeMetricsUpdated = vi.fn();
    const { handlers } = createExecutionHandlers({
      applyViewTransform: vi.fn(() => {
        handlers.setGraphData(nextGraphData);
      }),
      sendGraphNodeMetricsUpdated,
    });
    handlers.setRawGraphData(currentGraphData);
    handlers.setGraphData(currentGraphData);
    vi.mocked(handlers.setRawGraphData).mockClear();
    vi.mocked(handlers.setGraphData).mockClear();

    publishAnalyzedGraph(state, handlers, nextGraphData, true);

    expect(serializedUnrelatedEdgeCount).toBe(0);
    expect(sendGraphNodeMetricsUpdated).toHaveBeenCalledWith([
      { id: 'src/index.ts', fileSize: 120 },
    ]);
  });
});
