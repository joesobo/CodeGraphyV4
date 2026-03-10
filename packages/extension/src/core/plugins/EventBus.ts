/**
 * @fileoverview Typed event bus for the plugin system.
 * Provides a hub-and-spoke event system with per-plugin tracking for auto-cleanup.
 * @module core/plugins/EventBus
 */

import { Disposable, toDisposable } from './Disposable';

/**
 * All event payloads for the plugin event system.
 * Each key is an event name, each value is the payload type.
 */
export interface EventPayloads {
  // ── Graph Interaction (12 events) ──
  'graph:nodeClick': { node: { id: string; label: string }; event: { x: number; y: number } };
  'graph:nodeDoubleClick': { node: { id: string; label: string }; event: { x: number; y: number } };
  'graph:nodeHover': { node: { id: string; label: string }; event: { x: number; y: number } };
  'graph:nodeHoverEnd': { node: { id: string; label: string } };
  'graph:selectionChanged': { nodes: Array<{ id: string }>; edges: Array<{ id: string }> };
  'graph:edgeClick': { edge: { id: string; from: string; to: string }; event: { x: number; y: number } };
  'graph:edgeHover': { edge: { id: string; from: string; to: string }; event: { x: number; y: number } };
  'graph:dragEnd': { nodes: Array<{ id: string }>; positions: Record<string, { x: number; y: number }> };
  'graph:zoom': { level: number; center: { x: number; y: number } };
  'graph:stabilized': { iterations: number };
  'graph:contextMenu': { node?: { id: string }; edge?: { id: string }; position: { x: number; y: number } };
  'graph:backgroundClick': { position: { x: number; y: number } };

  // ── Analysis Pipeline (4 events) ──
  'analysis:started': { fileCount: number };
  'analysis:fileProcessed': { filePath: string; connections: Array<{ specifier: string; resolvedPath: string | null }> };
  'analysis:completed': { graph: { nodes: Array<{ id: string }>; edges: Array<{ id: string }> }; duration: number };
  'analysis:error': { error: Error; filePath?: string };

  // ── Workspace / Files (6 events) ──
  'workspace:fileCreated': { filePath: string };
  'workspace:fileDeleted': { filePath: string };
  'workspace:fileRenamed': { oldPath: string; newPath: string };
  'workspace:fileChanged': { filePath: string };
  'workspace:configChanged': { key: string; value: unknown; old: unknown };
  'workspace:activeEditorChanged': { filePath?: string };

  // ── Views & Navigation (6 events) ──
  'view:changed': { viewId: string; previousId?: string };
  'view:focusChanged': { filePath?: string };
  'view:folderChanged': { folderPath?: string };
  'view:depthChanged': { depth: number };
  'view:searchChanged': { query: string; results: string[] };
  'view:physicsChanged': { settings: Record<string, number> };

  // ── Plugin Ecosystem (6 events) ──
  'plugin:registered': { pluginId: string };
  'plugin:unregistered': { pluginId: string };
  'plugin:enabled': { pluginId: string };
  'plugin:disabled': { pluginId: string };
  'plugin:ruleToggled': { qualifiedId: string; enabled: boolean };
  'plugin:message': { from: string; to?: string; data: unknown };

  // ── Timeline (4 events) ──
  'timeline:commitSelected': { hash: string; date: string; author: string };
  'timeline:playbackStarted': { speed: number };
  'timeline:playbackStopped': { commitHash: string };
  'timeline:rangeChanged': { start: string; end: string };
}

/** Union of all event names */
export type EventName = keyof EventPayloads;

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
