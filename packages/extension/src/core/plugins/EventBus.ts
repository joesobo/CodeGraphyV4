/**
 * @fileoverview Typed event bus for the plugin system.
 * Provides a hub-and-spoke event system with per-plugin tracking for auto-cleanup.
 * @module core/plugins/EventBus
 */

import { Disposable, toDisposable } from './Disposable';
import type { EventPayloads, EventName } from '../../../../plugin-api/src/events';

export type { EventPayloads, EventName };

/** Handler function for a specific event */
type EventHandler<E extends EventName> = (payload: EventPayloads[E]) => void;

/**
 * Typed event bus for the plugin system.
 * Supports per-plugin handler tracking for automatic cleanup on plugin unload.
 */
export class EventBus {
  /** Map of event name → set of handlers */
  private readonly _handlers = new Map<EventName, Set<EventHandler<never>>>();

  /** Map of plugin ID → set of handlers registered by that plugin */
  private readonly _pluginHandlers = new Map<string, Set<{ event: EventName; handler: EventHandler<never> }>>();

  /**
   * Subscribe to a typed event.
   * @param event - Event name
   * @param handler - Handler function
   * @param pluginId - Optional plugin ID for auto-cleanup tracking
   * @returns Disposable to unsubscribe
   */
  on<E extends EventName>(
    event: E,
    handler: (payload: EventPayloads[E]) => void,
    pluginId?: string,
  ): Disposable {
    const typedHandler = handler as EventHandler<never>;

    let handlers = this._handlers.get(event);
    if (!handlers) {
      handlers = new Set();
      this._handlers.set(event, handlers);
    }
    handlers.add(typedHandler);

    // Track for plugin auto-cleanup
    if (pluginId) {
      let pluginSet = this._pluginHandlers.get(pluginId);
      if (!pluginSet) {
        pluginSet = new Set();
        this._pluginHandlers.set(pluginId, pluginSet);
      }
      pluginSet.add({ event, handler: typedHandler });
    }

    return toDisposable(() => {
      this._removeHandler(event, typedHandler, pluginId);
    });
  }

  /**
   * Subscribe to an event, auto-removed after first fire.
   */
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

  /**
   * Manually remove a specific handler.
   */
  off<E extends EventName>(
    event: E,
    handler: (payload: EventPayloads[E]) => void,
  ): void {
    this._removeHandler(event, handler as EventHandler<never>);
  }

  /**
   * Emit an event to all registered handlers.
   */
  emit<E extends EventName>(event: E, payload: EventPayloads[E]): void {
    const handlers = this._handlers.get(event);
    if (!handlers || handlers.size === 0) return;

    // Iterate over a copy to allow handlers to unsubscribe during iteration
    for (const handler of [...handlers]) {
      try {
        handler(payload as never);
      } catch (e) {
        console.error(`[CodeGraphy] Error in event handler for '${event}':`, e);
      }
    }
  }

  /**
   * Remove all event handlers registered by a specific plugin.
   * Called automatically when a plugin is unloaded.
   */
  removeAllForPlugin(pluginId: string): void {
    const pluginSet = this._pluginHandlers.get(pluginId);
    if (!pluginSet) return;

    for (const { event, handler } of pluginSet) {
      const handlers = this._handlers.get(event);
      if (handlers) {
        handlers.delete(handler);
        if (handlers.size === 0) {
          this._handlers.delete(event);
        }
      }
    }

    this._pluginHandlers.delete(pluginId);
  }

  /**
   * Get the number of handlers registered for an event.
   */
  listenerCount(event: EventName): number {
    return this._handlers.get(event)?.size ?? 0;
  }

  /**
   * Remove a specific handler from an event.
   */
  private _removeHandler(event: EventName, handler: EventHandler<never>, pluginId?: string): void {
    const handlers = this._handlers.get(event);
    if (handlers) {
      handlers.delete(handler);
      if (handlers.size === 0) {
        this._handlers.delete(event);
      }
    }

    if (pluginId) {
      const pluginSet = this._pluginHandlers.get(pluginId);
      if (pluginSet) {
        for (const entry of pluginSet) {
          if (entry.event === event && entry.handler === handler) {
            pluginSet.delete(entry);
            break;
          }
        }
        if (pluginSet.size === 0) {
          this._pluginHandlers.delete(pluginId);
        }
      }
    }
  }
}
