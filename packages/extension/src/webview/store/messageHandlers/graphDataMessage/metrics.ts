import type { IHandlerContext, PartialState } from '../../messageTypes';
import type { GraphNodeMetricsUpdateMessage } from './contracts';
import {
  applyMetricUpdates,
  applyMetricUpdatesInPlace,
  nodeSizeModeUsesNodeMetrics,
} from './metricUpdates';

export function handleGraphNodeMetricsUpdated(
  message: GraphNodeMetricsUpdateMessage,
  ctx?: Pick<IHandlerContext, 'getState'>,
): PartialState | void {
  const state = ctx?.getState();
  if (!state?.graphData) {
    return undefined;
  }

  const updatesById = new Map(message.payload.nodes.map(node => [node.id, node]));
  const waitingForInitialBootstrap = Boolean(
    state.awaitingInitialBootstrap
    && !state.bootstrapComplete,
  );

  if (!nodeSizeModeUsesNodeMetrics(state.nodeSizeMode)) {
    applyMetricUpdatesInPlace(state.graphData, updatesById);

    return {
      isLoading: waitingForInitialBootstrap,
      graphIsIndexing: false,
      graphIndexProgress: null,
    };
  }

  const nextNodes = applyMetricUpdates(state.graphData.nodes, updatesById);
  if (!nextNodes.changed) {
    return {
      graphIsIndexing: false,
      graphIndexProgress: null,
    };
  }

  return {
    graphData: {
      ...state.graphData,
      nodes: nextNodes.nodes,
    },
    isLoading: waitingForInitialBootstrap,
    graphIsIndexing: false,
    graphIndexProgress: null,
  };
}
