import type { IGraphData } from '../../../shared/graph/contracts';
import type { ExtensionToWebviewMessage } from '../../../shared/protocol/extensionToWebview';
import type { NodeSizeMode } from '../../../shared/settings/modes';
import type { IHandlerContext, PartialState } from '../messageTypes';

type GraphNodeMetricsUpdateMessage = Extract<ExtensionToWebviewMessage, { type: 'GRAPH_NODE_METRICS_UPDATED' }>;
type GraphNodeMetricsUpdate = GraphNodeMetricsUpdateMessage['payload']['nodes'][number];

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

function shouldSkipDuplicateGraphData(
  state: ReturnType<NonNullable<IHandlerContext['getState']>>,
  payload: IGraphData,
): boolean {
  if (!state.graphData || state.graphIsIndexing || !areGraphDataPayloadsEqual(state.graphData, payload)) {
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

function nodeSizeModeUsesNodeMetrics(mode: NodeSizeMode): boolean {
  return mode === 'file-size' || mode === 'churn';
}

function nodeMetricsDiffer(
  node: IGraphData['nodes'][number],
  update: GraphNodeMetricsUpdate,
): boolean {
  return node.fileSize !== update.fileSize || node.churn !== update.churn;
}

function applyMetricUpdatesInPlace(
  graphData: IGraphData,
  updatesById: ReadonlyMap<string, GraphNodeMetricsUpdate>,
): boolean {
  let changed = false;

  for (const node of graphData.nodes) {
    const update = updatesById.get(node.id);
    if (!update || !nodeMetricsDiffer(node, update)) {
      continue;
    }

    node.fileSize = update.fileSize;
    node.churn = update.churn;
    changed = true;
  }

  return changed;
}

export function handleGraphDataUpdated(
  message: Extract<ExtensionToWebviewMessage, { type: 'GRAPH_DATA_UPDATED' }>,
  ctx?: Pick<IHandlerContext, 'getState'>,
): PartialState | void {
  const state = ctx?.getState();
  if (state && shouldSkipDuplicateGraphData(state, message.payload)) {
    return undefined;
  }

  const waitingForInitialBootstrap = Boolean(
    state?.awaitingInitialBootstrap
    && !state.bootstrapComplete,
  );
  const initialBootstrapFinished = Boolean(
    state?.awaitingInitialBootstrap
    && state.bootstrapComplete
  );

  return {
    graphData: message.payload,
    ...(initialBootstrapFinished ? { awaitingInitialBootstrap: false } : {}),
    isLoading: waitingForInitialBootstrap,
    graphIsIndexing: false,
    graphIndexProgress: null,
  };
}

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
    // Metrics do not affect the current visual graph, so keep graphData referentially stable.
    applyMetricUpdatesInPlace(state.graphData, updatesById);

    return {
      isLoading: waitingForInitialBootstrap,
      graphIsIndexing: false,
      graphIndexProgress: null,
    };
  }

  let changed = false;
  const nodes = state.graphData.nodes.map((node) => {
    const update = updatesById.get(node.id);
    if (!update || !nodeMetricsDiffer(node, update)) {
      return node;
    }

    changed = true;
    return {
      ...node,
      fileSize: update.fileSize,
      churn: update.churn,
    };
  });

  if (!changed) {
    return {
      graphIsIndexing: false,
      graphIndexProgress: null,
    };
  }

  return {
    graphData: {
      ...state.graphData,
      nodes,
    },
    isLoading: waitingForInitialBootstrap,
    graphIsIndexing: false,
    graphIndexProgress: null,
  };
}

export function handleAppBootstrapComplete(
  _message: Extract<ExtensionToWebviewMessage, { type: 'APP_BOOTSTRAP_COMPLETE' }>,
  ctx: Pick<IHandlerContext, 'getState'>,
): PartialState {
  const state = ctx.getState();
  const graphReady = state.graphData !== null;

  return {
    bootstrapComplete: true,
    awaitingInitialBootstrap: graphReady ? false : state.awaitingInitialBootstrap,
    isLoading: graphReady ? false : state.isLoading,
  };
}
