import type { Disposable } from './disposable';
import type { EventName, EventPayloads } from './eventBus';
import type { CodeGraphyApiContext } from './codeGraphyApi';

type EventContext = Pick<CodeGraphyApiContext, 'eventBus' | 'pluginId'>;

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
