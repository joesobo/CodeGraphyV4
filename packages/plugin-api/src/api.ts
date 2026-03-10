/**
 * @fileoverview The main CodeGraphy API surface exposed to v2 plugins.
 * Passed to the plugin's `onLoad(api)` lifecycle hook.
 * @module @codegraphy/plugin-api/api
 */

import type { Disposable } from './disposable';
import type { EventPayloads } from './events';
import type { NodeDecoration, EdgeDecoration } from './decorations';
import type { IGraphData, IGraphNode, IGraphEdge } from './graph';
import type { IView } from './views';
import type { ICommand, IContextMenuItem } from './commands';

/**
 * The host API provided to v2 plugins via the `onLoad(api)` lifecycle hook.
 *
 * Provides access to the event bus, graph data, decoration system,
 * view/command registration, webview messaging, and logging.
 *
 * All registration methods return a {@link Disposable} that unregisters
 * the resource when disposed. Plugins should collect disposables and
 * release them in their `onUnload()` hook.
 *
 * @example
 * ```typescript
 * const plugin: IPlugin = {
 *   id: 'myplugin',
 *   name: 'My Plugin',
 *   version: '1.0.0',
 *   apiVersion: '^2.0.0',
 *   supportedExtensions: ['.ts'],
 *
 *   async detectConnections() { return []; },
 *
 *   onLoad(api) {
 *     const sub = api.on('graph:nodeClick', ({ node }) => {
 *       api.log('info', `Clicked: ${node.id}`);
 *     });
 *     // store sub for cleanup in onUnload
 *   }
 * };
 * ```
 */
export interface CodeGraphyAPI {
  /** Current API version string (e.g., '2.0.0'). */
  version: string;

  // ---------------------------------------------------------------------------
  // Event bus
  // ---------------------------------------------------------------------------

  /**
   * Subscribe to a typed event.
   * @returns A disposable that removes the listener when disposed.
   */
  on<E extends keyof EventPayloads>(
    event: E,
    handler: (payload: EventPayloads[E]) => void
  ): Disposable;

  /**
   * Subscribe to a typed event, automatically removing the listener after
   * the first invocation.
   */
  once<E extends keyof EventPayloads>(
    event: E,
    handler: (payload: EventPayloads[E]) => void
  ): Disposable;

  /**
   * Remove a previously registered event handler.
   */
  off<E extends keyof EventPayloads>(
    event: E,
    handler: (payload: EventPayloads[E]) => void
  ): void;

  // ---------------------------------------------------------------------------
  // Decorations
  // ---------------------------------------------------------------------------

  /**
   * Apply a visual decoration to a node.
   * Multiple decorations can be stacked; later ones take precedence.
   * @returns A disposable that removes the decoration when disposed.
   */
  decorateNode(nodeId: string, decoration: NodeDecoration): Disposable;

  /**
   * Apply a visual decoration to an edge.
   * @returns A disposable that removes the decoration when disposed.
   */
  decorateEdge(edgeId: string, decoration: EdgeDecoration): Disposable;

  /**
   * Remove all decorations applied by the calling plugin.
   */
  clearDecorations(): void;

  // ---------------------------------------------------------------------------
  // Graph queries
  // ---------------------------------------------------------------------------

  /** Get the current graph data (snapshot — not a live reference). */
  getGraph(): IGraphData;

  /** Look up a single node by its ID. Returns null if not found. */
  getNode(id: string): IGraphNode | null;

  /** Get all nodes directly connected to the given node. */
  getNeighbors(id: string): IGraphNode[];

  /** Get all edges where the given node is either `from` or `to`. */
  getEdgesFor(nodeId: string): IGraphEdge[];

  // ---------------------------------------------------------------------------
  // Registration
  // ---------------------------------------------------------------------------

  /**
   * Register a custom view.
   * The view will appear in the view switcher and can transform graph data.
   */
  registerView(view: IView): Disposable;

  /**
   * Register a command that can be invoked programmatically
   * or from the command palette.
   */
  registerCommand(command: ICommand): Disposable;

  /**
   * Register a context menu item that appears on right-click
   * in the graph canvas.
   */
  registerContextMenuItem(item: IContextMenuItem): Disposable;

  // ---------------------------------------------------------------------------
  // Webview messaging
  // ---------------------------------------------------------------------------

  /**
   * Send a custom message to the webview.
   * The webview-side plugin code can listen for these messages.
   */
  sendToWebview(msg: { type: string; data: unknown }): void;

  /**
   * Listen for custom messages from the webview.
   * @returns A disposable that removes the handler when disposed.
   */
  onWebviewMessage(
    handler: (msg: { type: string; data: unknown }) => void
  ): Disposable;

  // ---------------------------------------------------------------------------
  // Utilities
  // ---------------------------------------------------------------------------

  /** Get the absolute path to the current workspace root. */
  getWorkspaceRoot(): string;

  /**
   * Write to the CodeGraphy output channel.
   * Messages are prefixed with the plugin ID automatically.
   */
  log(level: 'info' | 'warn' | 'error', ...args: unknown[]): void;
}
