/**
 * @fileoverview The main CodeGraphy API surface exposed to v2 plugins.
 * Passed to the plugin's `onLoad(api)` lifecycle hook.
 * @module @codegraphy-vscode/plugin-api/api
 */

import type { Disposable } from './disposable';
import type { EventPayloads } from './events';
import type { NodeDecoration, EdgeDecoration } from './decorations';
import type { GraphEdgeKind, IGraphData, IGraphNode, IGraphEdge } from './graph';
import type { IView } from './views';
import type { ICommand, IContextMenuItem } from './commands';

export interface ExportRequest {
  /** Default filename shown in the save dialog. */
  filename: string;

  /** File content to write. */
  content: string | Uint8Array;

  /** Optional save-dialog filters keyed by human-readable label. */
  filters?: Record<string, string[]>;

  /** Optional custom save-dialog title. */
  title?: string;

  /** Optional success toast message after saving. */
  successMessage?: string;
}

export interface IExporter {
  /** Unique identifier within the plugin. */
  id: string;

  /** Human-readable label shown in the export menu. */
  label: string;

  /** Optional extra description for menus and docs. */
  description?: string;

  /** Optional menu grouping label. */
  group?: string;

  /** Export implementation. Usually calls `api.saveExport(...)`. */
  run(): void | Promise<void>;
}

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

  /** Get all edges that point into the given node. */
  getIncomingEdges(nodeId: string): IGraphEdge[];

  /** Get all edges that originate from the given node. */
  getOutgoingEdges(nodeId: string): IGraphEdge[];

  /** Get all edges where the given node is either `from` or `to`. */
  getEdgesFor(nodeId: string): IGraphEdge[];

  /** Filter the graph's edges by one or more semantic kinds. */
  filterEdgesByKind(kind: GraphEdgeKind | GraphEdgeKind[]): IGraphEdge[];

  /** Build an induced subgraph around a seed node for the requested hop depth. */
  getSubgraph(nodeId: string, hops: number): IGraphData;

  /** Find the shortest directed path between two nodes, if one exists. */
  findPath(fromId: string, toId: string): IGraphNode[] | null;

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

  /**
   * Register an exporter that appears in the main export menu.
   */
  registerExporter(exporter: IExporter): Disposable;

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

  /**
   * Save plugin-generated export content through the host's file-save flow.
   * Useful for plugin toolbar actions, custom views, and semantic exporters.
   */
  saveExport(request: ExportRequest): Promise<void>;

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
