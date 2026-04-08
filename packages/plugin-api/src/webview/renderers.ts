/**
 * @fileoverview Webview rendering extension points.
 * @module @codegraphy-vscode/plugin-api/webview/renderers
 */

import type { IGraphNode, IGraphEdge } from '../graph';

export type GraphPluginSlot =
  | 'toolbar'
  | 'node-details'
  | 'tooltip'
  | 'timeline-panel'
  | 'graph-overlay';

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

/** Lightweight tooltip action contributed by a plugin. */
export interface TooltipAction {
  id: string;
  label: string;
  icon?: string;
  action: (this: void) => void | Promise<void>;
}

/** Tooltip sections and actions contributed by plugins. */
export interface TooltipContent {
  sections: Array<{ title: string; content: string }>;
  actions?: TooltipAction[];
}

/** Tooltip provider callback. */
export type TooltipProviderFn = (context: TooltipContext) => TooltipContent | null;
