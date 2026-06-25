import type { IHandlerContext, PartialState } from '../messageTypes';
import { handleAppBootstrapComplete as handleAppBootstrapCompleteImpl } from './graphDataMessage/bootstrap';
import type {
  AppBootstrapCompleteMessage,
  GraphDataUpdatedMessage,
  GraphNodeMetricsUpdateMessage,
} from './graphDataMessage/contracts';
import { handleGraphNodeMetricsUpdated as handleGraphNodeMetricsUpdatedImpl } from './graphDataMessage/metrics';
import { handleGraphDataUpdated as handleGraphDataUpdatedImpl } from './graphDataMessage/payload';

export function handleGraphDataUpdated(
  message: GraphDataUpdatedMessage,
  ctx?: Pick<IHandlerContext, 'getState'>,
): PartialState | void {
  return handleGraphDataUpdatedImpl(message, ctx);
}

export function handleGraphNodeMetricsUpdated(
  message: GraphNodeMetricsUpdateMessage,
  ctx?: Pick<IHandlerContext, 'getState'>,
): PartialState | void {
  return handleGraphNodeMetricsUpdatedImpl(message, ctx);
}

export function handleAppBootstrapComplete(
  message: AppBootstrapCompleteMessage,
  ctx: Pick<IHandlerContext, 'getState'>,
): PartialState {
  return handleAppBootstrapCompleteImpl(message, ctx);
}
