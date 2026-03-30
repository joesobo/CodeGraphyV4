/**
 * @fileoverview Typed event bus for the plugin system.
 * @module core/plugins/EventBus
 */

import { Disposable, toDisposable } from './disposable';
import type { EventPayloads, EventName } from '../../../../plugin-api/src/events';
import { removeHandler, removeAllHandlersForPlugin } from './eventBusHandlers';
import type { EventHandler } from './eventBusHandlers';

export type { EventPayloads, EventName };

/**
 * Typed event bus for the plugin system.
 * Supports per-plugin handler tracking for automatic cleanup on plugin unload.
 */
export class EventBus {
  private readonly _handlers = new Map<EventName, Set<EventHandler>>();
  private readonly _pluginHandlers = new Map<string, Set<{ event: EventName; handler: EventHandler }>>();
  private readonly _handlerWrappers = new Map<EventName, WeakMap<object, EventHandler>>();

  on<E extends EventName>(
    event: E,
    handler: (payload: EventPayloads[E]) => void,
    pluginId?: string,
  ): Disposable {
    const typedHandler: EventHandler = payload => {
      handler(payload as EventPayloads[E]);
    };

    let handlers = this._handlers.get(event);
    if (!handlers) {
      handlers = new Set();
      this._handlers.set(event, handlers);
    }
    handlers.add(typedHandler);

    let wrapperMap = this._handlerWrappers.get(event);
    if (!wrapperMap) {
      wrapperMap = new WeakMap();
      this._handlerWrappers.set(event, wrapperMap);
    }
    wrapperMap.set(handler, typedHandler);

    if (pluginId) {
      let pluginSet = this._pluginHandlers.get(pluginId);
      if (!pluginSet) {
        pluginSet = new Set();
        this._pluginHandlers.set(pluginId, pluginSet);
      }
      pluginSet.add({ event, handler: typedHandler });
    }

    return toDisposable(() => {
      this._handlerWrappers.get(event)?.delete(handler);
      removeHandler(event, typedHandler, this._handlers, pluginId, this._pluginHandlers);
    });
  }

  once<E extends EventName>(
    event: E,
    handler: (payload: EventPayloads[E]) => void,
    pluginId?: string,
  ): Disposable {
    const disposable = this.on(event, (payload) => {
      disposable.dispose();
      handler(payload);
    }, pluginId);
    return disposable;
  }

  off<E extends EventName>(
    event: E,
    handler: (payload: EventPayloads[E]) => void,
  ): void {
    const typedHandler = this._handlerWrappers.get(event)?.get(handler);
    if (!typedHandler) return;

    this._handlerWrappers.get(event)?.delete(handler);
    removeHandler(event, typedHandler, this._handlers);
  }

  emit<E extends EventName>(event: E, payload: EventPayloads[E]): void {
    const handlers = this._handlers.get(event);
    if (!handlers || handlers.size === 0) return;

    for (const handler of [...handlers]) {
      try {
        handler(payload);
      } catch (e) {
        console.error(`[CodeGraphy] Error in event handler for '${event}':`, e);
      }
    }
  }

  removeAllForPlugin(pluginId: string): void {
    removeAllHandlersForPlugin(pluginId, this._handlers, this._pluginHandlers);
  }

  listenerCount(event: EventName): number {
    return this._handlers.get(event)?.size ?? 0;
  }
}
