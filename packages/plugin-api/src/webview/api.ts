/**
 * @fileoverview Webview-side API for CodeGraphy plugins.
 * This API is available inside the webview context (browser/canvas)
 * and provides hooks for custom rendering, tooltips, and overlays.
 * @module @codegraphy/plugin-api/webview/api
 */

import type { Disposable } from '../disposable';
import type { IGraphNode, IGraphEdge, IGraphData } from '../graph';
import type { NodeDecoration, EdgeDecoration } from '../decorations';
import type { NodeRenderFn, OverlayRenderFn, TooltipProviderFn } from './renderers';
import type { BadgeOpts, RingOpts, LabelOpts } from './helpers';

/**
 * The webview-side API provided to plugin code running in the webview context.
 *
 * Unlike {@link CodeGraphyAPI} (which runs in the extension host), this API
 * operates within the browser-like webview environment and provides access
 * to canvas rendering, visual helpers, and webview-specific messaging.
 *
 * @example
 * ```typescript
 * // In the plugin's webview entry point
 * export function activate(api: CodeGraphyWebviewAPI) {
 *   api.registerNodeRenderer((ctx) => {
 *     if (ctx.node.id.endsWith('.test.ts')) {
 *       drawTestIcon(ctx.ctx, ctx.node);
 *     }
 *     return false; // let default renderer also draw
 *   });
 * }
 * ```
 */
export interface CodeGraphyWebviewAPI {
  /** Current API version string (matches the extension-side version). */
  version: string;

  // ---------------------------------------------------------------------------
  // Custom renderers
  // ---------------------------------------------------------------------------

  /**
   * Register a custom node renderer.
   * Called for each node on every frame after the default renderer.
   * @returns A disposable that unregisters the renderer.
   */
  registerNodeRenderer(fn: NodeRenderFn): Disposable;

  /**
   * Register an overlay renderer.
   * Called after all nodes/edges are drawn. Use for custom visual layers.
   * @returns A disposable that unregisters the renderer.
   */
  registerOverlayRenderer(fn: OverlayRenderFn): Disposable;

  /**
   * Register a tooltip provider.
   * Called when a node is hovered; returned content is appended to the tooltip.
   * @returns A disposable that unregisters the provider.
   */
  registerTooltipProvider(fn: TooltipProviderFn): Disposable;

  // ---------------------------------------------------------------------------
  // Visual helpers (convenience wrappers over decorations)
  // ---------------------------------------------------------------------------

  /**
   * Draw a badge on a node.
   * @returns A disposable that removes the badge.
   */
  addBadge(nodeId: string, opts: BadgeOpts): Disposable;

  /**
   * Draw a colored ring around a node.
   * @returns A disposable that removes the ring.
   */
  addRing(nodeId: string, opts: RingOpts): Disposable;

  /**
   * Draw a custom label on or near a node.
   * @returns A disposable that removes the label.
   */
  addLabel(nodeId: string, opts: LabelOpts): Disposable;

  // ---------------------------------------------------------------------------
  // Decorations
  // ---------------------------------------------------------------------------

  /** Apply a visual decoration to a node. */
  decorateNode(nodeId: string, decoration: NodeDecoration): Disposable;

  /** Apply a visual decoration to an edge. */
  decorateEdge(edgeId: string, decoration: EdgeDecoration): Disposable;

  /** Remove all decorations applied by this plugin. */
  clearDecorations(): void;

  // ---------------------------------------------------------------------------
  // Graph queries (read-only snapshot)
  // ---------------------------------------------------------------------------

  /** Get the current graph data. */
  getGraph(): IGraphData;

  /** Look up a single node by ID. */
  getNode(id: string): IGraphNode | null;

  /** Get all edges where the given node is either `from` or `to`. */
  getEdgesFor(nodeId: string): IGraphEdge[];

  // ---------------------------------------------------------------------------
  // Messaging
  // ---------------------------------------------------------------------------

  /**
   * Send a message to the extension-side plugin code.
   */
  sendToExtension(msg: { type: string; data: unknown }): void;

  /**
   * Listen for messages from the extension-side plugin code.
   * @returns A disposable that removes the handler.
   */
  onExtensionMessage(
    handler: (msg: { type: string; data: unknown }) => void
  ): Disposable;

  // ---------------------------------------------------------------------------
  // Utilities
  // ---------------------------------------------------------------------------

  /**
   * Request a re-render of the graph canvas.
   * Call this after modifying decorations or renderer state to ensure
   * changes are reflected immediately.
   */
  requestRedraw(): void;

  /**
   * Log a message to the browser console with the plugin ID prefix.
   */
  log(level: 'info' | 'warn' | 'error', ...args: unknown[]): void;
}
