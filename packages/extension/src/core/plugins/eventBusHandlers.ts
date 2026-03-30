/**
 * @fileoverview Event handler management utilities for EventBus.
 * @module core/plugins/eventBusHandlers
 */

import type { EventName } from '../../../../plugin-api/src/events';

/** Handler function for a specific event */
export type EventHandler = (payload: unknown) => void;

/**
 * Remove a handler from the event handler map and optionally from the plugin tracking set.
 */
export function removeHandler(
  event: EventName,
  handler: EventHandler,
  handlers: Map<EventName, Set<EventHandler>>,
  pluginId?: string,
  pluginHandlers?: Map<string, Set<{ event: EventName; handler: EventHandler }>>,
): void {
  const eventHandlers = handlers.get(event);
  if (eventHandlers) {
    eventHandlers.delete(handler);
    if (eventHandlers.size === 0) {
      handlers.delete(event);
    }
  }

  if (pluginId && pluginHandlers) {
    const pluginSet = pluginHandlers.get(pluginId);
    if (pluginSet) {
      for (const entry of pluginSet) {
        if (entry.event === event && entry.handler === handler) {
          pluginSet.delete(entry);
          break;
        }
      }
      if (pluginSet.size === 0) {
        pluginHandlers.delete(pluginId);
      }
    }
  }
}

/**
 * Remove all event handlers registered by a specific plugin.
 */
export function removeAllHandlersForPlugin(
  pluginId: string,
  handlers: Map<EventName, Set<EventHandler>>,
  pluginHandlers: Map<string, Set<{ event: EventName; handler: EventHandler }>>,
): void {
  const pluginSet = pluginHandlers.get(pluginId);
  if (!pluginSet) return;

  for (const { event, handler } of pluginSet) {
    const eventHandlers = handlers.get(event);
    if (eventHandlers) {
      eventHandlers.delete(handler);
      if (eventHandlers.size === 0) {
        handlers.delete(event);
      }
    }
  }

  pluginHandlers.delete(pluginId);
}
