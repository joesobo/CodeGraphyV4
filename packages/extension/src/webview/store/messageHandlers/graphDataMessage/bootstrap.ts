import type { IHandlerContext, PartialState } from '../../messageTypes';
import type { AppBootstrapCompleteMessage } from './contracts';

export function handleAppBootstrapComplete(
  _message: AppBootstrapCompleteMessage,
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
