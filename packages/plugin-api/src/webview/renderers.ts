/**
 * @fileoverview Custom renderer function types for the webview.
 * Plugins can provide render functions to customize how nodes, overlays,
 * and tooltips are drawn on the graph canvas.
 * @module @codegraphy/plugin-api/webview/renderers
 */

import type { IGraphNode, IGraphEdge } from '../graph';
import type { NodeDecoration } from '../decorations';

/**
 * Context passed to custom node render functions.
 */
export interface NodeRenderContext {
  /** The node being rendered. */
  node: IGraphNode;
  /** Active decorations for this node (merged from all plugins). */
  decoration: NodeDecoration | null;
  /** The 2D canvas rendering context. */
  ctx: CanvasRenderingContext2D;
  /** Current global scale (zoom level). */
  globalScale: number;
  /** Whether this node is currently selected. */
  isSelected: boolean;
  /** Whether this node is currently hovered. */
  isHovered: boolean;
}

/**
 * Custom node rendering function.
 *
 * Called for each node on every frame. The function receives the canvas
 * context positioned at the node's center. Return `true` if the plugin
 * handled rendering (prevents the default renderer from drawing).
 * Return `false` or `undefined` to let the default renderer draw as usual.
 *
 * @example
 * ```typescript
 * const renderFn: NodeRenderFn = (ctx) => {
 *   if (ctx.node.id.endsWith('.test.ts')) {
 *     // draw a custom test-file indicator
 *     drawTestBadge(ctx.ctx, ctx.node);
 *     return false; // still let the default renderer draw the base node
 *   }
 *   return false;
 * };
 * ```
 */
export type NodeRenderFn = (context: NodeRenderContext) => boolean | void;

/**
 * Context passed to overlay render functions.
 */
export interface OverlayRenderContext {
  /** The 2D canvas rendering context (full canvas, not node-local). */
  ctx: CanvasRenderingContext2D;
  /** Current global scale (zoom level). */
  globalScale: number;
  /** Canvas width in pixels. */
  width: number;
  /** Canvas height in pixels. */
  height: number;
  /** All nodes in the current graph. */
  nodes: IGraphNode[];
  /** All edges in the current graph. */
  edges: IGraphEdge[];
}

/**
 * Overlay rendering function.
 *
 * Called after all nodes and edges have been rendered. Use this to draw
 * additional visual layers on top of the graph (e.g., region boundaries,
 * heat maps, connection highlights).
 */
export type OverlayRenderFn = (context: OverlayRenderContext) => void;

/**
 * Context passed to tooltip provider functions.
 */
export interface TooltipContext {
  /** The node being hovered. */
  node: IGraphNode;
  /** Active decorations for this node. */
  decoration: NodeDecoration | null;
  /** All edges connected to this node. */
  edges: IGraphEdge[];
}

/**
 * Tooltip content returned by a tooltip provider.
 */
export interface TooltipContent {
  /** Heading text for the tooltip section contributed by this plugin. */
  heading: string;
  /** Lines of content. Can contain plain text. */
  lines: string[];
}

/**
 * Tooltip provider function.
 *
 * Called when a node is hovered. Returns additional tooltip content
 * to be appended to the default tooltip. Return `null` to contribute
 * nothing for this node.
 */
export type TooltipProviderFn = (
  context: TooltipContext
) => TooltipContent | null;
