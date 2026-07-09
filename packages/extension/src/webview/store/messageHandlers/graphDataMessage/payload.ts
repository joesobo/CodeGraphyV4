import type { PartialState, IHandlerContext } from '../../messageTypes';
import type { GraphDataUpdatedMessage } from './contracts';
import { shouldSkipDuplicateGraphData } from './duplicate';
import { emitGraphPayloadBytes } from '../../../perf/payload';

export function handleGraphDataUpdated(
  message: GraphDataUpdatedMessage,
  ctx?: Pick<IHandlerContext, 'getState'>,
  emitPayloadBytes: (payload: GraphDataUpdatedMessage['payload']) => boolean = emitGraphPayloadBytes,
): PartialState | void {
  emitPayloadBytes(message.payload);

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
