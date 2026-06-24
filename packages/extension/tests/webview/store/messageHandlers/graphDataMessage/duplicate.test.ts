import { describe, expect, it } from 'vitest';
import type { IGraphData } from '../../../../../src/shared/graph/contracts';
import { shouldSkipDuplicateGraphData } from '../../../../../src/webview/store/messageHandlers/graphDataMessage/duplicate';
import { createState } from '../graph/fixture';

describe('webview/store/messageHandlers/graphDataMessage/duplicate', () => {
  it('skips an equal graph payload after bootstrap has settled', () => {
    const payload = createGraphData();
    const state = createState({
      awaitingInitialBootstrap: false,
      bootstrapComplete: true,
      graphData: cloneGraphData(payload),
      isLoading: false,
    });

    expect(shouldSkipDuplicateGraphData(state, payload)).toBe(true);
  });

  it('skips an equal graph payload while waiting for initial bootstrap completion', () => {
    const payload = createGraphData();
    const state = createState({
      awaitingInitialBootstrap: true,
      bootstrapComplete: false,
      graphData: cloneGraphData(payload),
      isLoading: true,
    });

    expect(shouldSkipDuplicateGraphData(state, payload)).toBe(true);
  });

  it('does not skip when there is no current graph data', () => {
    const state = createState({
      awaitingInitialBootstrap: false,
      bootstrapComplete: true,
      graphData: null,
      isLoading: false,
    });

    expect(shouldSkipDuplicateGraphData(state, createGraphData())).toBe(false);
  });

  it('does not skip while graph indexing is active', () => {
    const payload = createGraphData();
    const state = createState({
      awaitingInitialBootstrap: false,
      bootstrapComplete: true,
      graphData: cloneGraphData(payload),
      graphIsIndexing: true,
      isLoading: false,
    });

    expect(shouldSkipDuplicateGraphData(state, payload)).toBe(false);
  });

  it('does not skip when bootstrap has not settled into a duplicate-safe state', () => {
    const payload = createGraphData();

    expect(shouldSkipDuplicateGraphData(
      createState({
        awaitingInitialBootstrap: false,
        bootstrapComplete: true,
        graphData: cloneGraphData(payload),
        isLoading: true,
      }),
      payload,
    )).toBe(false);
    expect(shouldSkipDuplicateGraphData(
      createState({
        awaitingInitialBootstrap: true,
        bootstrapComplete: true,
        graphData: cloneGraphData(payload),
        isLoading: false,
      }),
      payload,
    )).toBe(false);
    expect(shouldSkipDuplicateGraphData(
      createState({
        awaitingInitialBootstrap: false,
        bootstrapComplete: false,
        graphData: cloneGraphData(payload),
        isLoading: false,
      }),
      payload,
    )).toBe(false);
  });

  it('does not skip when node counts differ', () => {
    const payload = createGraphData();
    const currentGraphData = createGraphData(['src/app.ts', 'src/extra.ts']);
    spoofSerializedGraphData(currentGraphData, payload);

    expect(shouldSkipDuplicateGraphData(
      createSettledState(currentGraphData),
      payload,
    )).toBe(false);
  });

  it('does not skip when edge counts differ', () => {
    const payload = createGraphData();
    const currentGraphData = createGraphData(['src/app.ts'], true);
    spoofSerializedGraphData(currentGraphData, payload);

    expect(shouldSkipDuplicateGraphData(
      createSettledState(currentGraphData),
      payload,
    )).toBe(false);
  });

  it('does not skip when graph payload content differs', () => {
    const payload = createGraphData();
    const currentGraphData = createGraphData(['src/other.ts']);

    expect(shouldSkipDuplicateGraphData(
      createSettledState(currentGraphData),
      payload,
    )).toBe(false);
  });

  it('does not skip when graph payload equality cannot be serialized', () => {
    const payload = createGraphData();
    const currentGraphData = createGraphData();
    const circularMetadata: Record<string, unknown> = {};
    circularMetadata.self = circularMetadata;
    currentGraphData.nodes[0]!.metadata = circularMetadata as never;

    expect(shouldSkipDuplicateGraphData(
      createSettledState(currentGraphData),
      payload,
    )).toBe(false);
  });
});

function createSettledState(graphData: IGraphData): ReturnType<typeof createState> {
  return createState({
    awaitingInitialBootstrap: false,
    bootstrapComplete: true,
    graphData,
    isLoading: false,
  });
}

function createGraphData(
  nodeIds: string[] = ['src/app.ts'],
  includeEdge = false,
): IGraphData {
  return {
    nodes: nodeIds.map((id) => ({
      id,
      label: id,
      color: '#94a3b8',
    })),
    edges: includeEdge
      ? [
          {
            id: 'src/app.ts->src/lib.ts#import',
            from: 'src/app.ts',
            to: 'src/lib.ts',
            kind: 'import',
            sources: [],
          },
        ]
      : [],
  };
}

function cloneGraphData(graphData: IGraphData): IGraphData {
  return JSON.parse(JSON.stringify(graphData)) as IGraphData;
}

function spoofSerializedGraphData(graphData: IGraphData, serializedAs: IGraphData): void {
  (graphData as IGraphData & { toJSON: () => IGraphData }).toJSON = () => serializedAs;
}
