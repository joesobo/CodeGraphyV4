/**
 * @fileoverview Webview rendering extension points.
 * @module @codegraphy-vscode/plugin-api/webview/renderers
 */

import type { IGraphNode, IGraphEdge } from '../graph';

/** Context passed to custom node renderers. */
export interface NodeRenderContext {
  node: IGraphNode;
  ctx: CanvasRenderingContext2D;
  globalScale: number;
  decoration?: unknown;
}

/** Custom node render callback. */
export type NodeRenderFn = (context: NodeRenderContext) => void;

/** Context passed to overlay renderers. */
export interface OverlayRenderContext {
  ctx: CanvasRenderingContext2D;
  width: number;
  height: number;
  globalScale: number;
}

/** Overlay render callback. */
export type OverlayRenderFn = (context: OverlayRenderContext) => void;

/** Context for tooltip providers. */
export interface TooltipContext {
  node: IGraphNode;
  neighbors: IGraphNode[];
  edges: IGraphEdge[];
}

/** Tooltip sections contributed by plugins. */
export interface TooltipContent {
  sections: Array<{ title: string; content: string }>;
}

/** Tooltip provider callback. */
export type TooltipProviderFn = (context: TooltipContext) => TooltipContent | null;
