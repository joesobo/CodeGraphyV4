import type { IGraphData } from '../../../../shared/graph/contracts';
import type { IHandlerContext } from '../../messageTypes';

export function shouldSkipDuplicateGraphData(
  state: ReturnType<NonNullable<IHandlerContext['getState']>>,
  payload: IGraphData,
): boolean {
  if (
    !state.graphData
    || state.graphIsIndexing
    || Object.keys(state.pendingFileMutations).length > 0
    || areGraphDataPayloadsEqual(state.graphData, payload) === false
  ) {
    return false;
  }

  return (
    (
      state.bootstrapComplete
      && !state.awaitingInitialBootstrap
      && !state.isLoading
    )
    || (
      state.awaitingInitialBootstrap
      && !state.bootstrapComplete
    )
  );
}

function areGraphDataPayloadsEqual(left: IGraphData, right: IGraphData): boolean {
  if (left.nodes.length !== right.nodes.length || left.edges.length !== right.edges.length) {
    return false;
  }

  try {
    return JSON.stringify(left) === JSON.stringify(right);
  } catch {
    return false;
  }
}
