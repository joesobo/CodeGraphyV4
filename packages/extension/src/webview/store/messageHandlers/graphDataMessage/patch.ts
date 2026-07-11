import { applyGraphDataPatchInPlace, graphDataPatchSchema } from '../../../../shared/graph/patch';
import { emitGraphPayloadBytes } from '../../../perf/payload';
import type { IHandlerContext, PartialState } from '../../messageTypes';
import type { GraphDataPatchedMessage } from './contracts';

export function handleGraphDataPatched(
  message: GraphDataPatchedMessage,
  context?: Pick<IHandlerContext, 'getState'> & Partial<Pick<IHandlerContext, 'postMessage'>>,
  emitPayloadBytes: (payload: unknown) => boolean = emitGraphPayloadBytes,
): PartialState | void {
  emitPayloadBytes(message.payload);
  const state = context?.getState();
  if (!state?.graphData) {
    requestFullGraphReplay(context);
    return undefined;
  }
  if (state.graphRevision !== message.baseGraphRevision) {
    requestFullGraphReplay(context);
    return undefined;
  }

  const parsed = graphDataPatchSchema.safeParse(message.payload);
  if (!parsed.success) {
    requestFullGraphReplay(context);
    return undefined;
  }

  const authoritativeGraphData = Object.values(state.pendingFileMutations)[0]
    ?? state.graphData;
  try {
    applyGraphDataPatchInPlace(authoritativeGraphData, parsed.data);
  } catch {
    requestFullGraphReplay(context);
    return undefined;
  }

  const waitingForInitialBootstrap = Boolean(
    state.awaitingInitialBootstrap
    && !state.bootstrapComplete,
  );
  return {
    graphData: { ...authoritativeGraphData },
    pendingFileMutations: {},
    inlineEdit: null,
    graphRevision: validGraphRevision(message.graphRevision)
      ? message.graphRevision
      : state.graphRevision,
    isLoading: waitingForInitialBootstrap,
    graphIsIndexing: false,
    graphIndexProgress: null,
  };
}

function validGraphRevision(value: number | undefined): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;
}

function requestFullGraphReplay(
  context: Partial<Pick<IHandlerContext, 'postMessage'>> | undefined,
): void {
  context?.postMessage?.({ type: 'REQUEST_GRAPH_DATA', payload: null });
}
