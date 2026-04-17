import type { Disposable } from '../../../../disposable';
import type { EventName, EventPayloads } from '../../../../events/bus';
import type { ApiContext } from './context';

type EventContext = Pick<ApiContext, 'eventBus' | 'pluginId'>;

export function onCodeGraphyEvent<E extends EventName>(
  context: EventContext,
  event: E,
  handler: (payload: EventPayloads[E]) => void,
): Disposable {
  return context.eventBus.on(event, handler, context.pluginId);
}

export function onceCodeGraphyEvent<E extends EventName>(
  context: EventContext,
  event: E,
  handler: (payload: EventPayloads[E]) => void,
): Disposable {
  return context.eventBus.once(event, handler, context.pluginId);
}

export function offCodeGraphyEvent<E extends EventName>(
  context: EventContext,
  event: E,
  handler: (payload: EventPayloads[E]) => void,
): void {
  context.eventBus.off(event, handler);
}
