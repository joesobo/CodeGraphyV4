/**
 * @fileoverview Types for the Tier 2 webview plugin host.
 * @module webview/pluginHost/types
 */

import type { IGraphNode, IGraphEdge, NodeDecorationPayload } from '../../shared/types';

/** Disposable returned by registration methods */
export interface WebviewDisposable {
  dispose(): void;
}

/** Context passed to custom node renderers */
export interface NodeRenderContext {
  node: IGraphNode;
  ctx: CanvasRenderingContext2D;
  globalScale: number;
  decoration?: NodeDecorationPayload;
}

/** Custom node render function */
export type NodeRenderFn = (context: NodeRenderContext) => void;

/** Context passed to overlay render functions */
export interface OverlayRenderContext {
  ctx: CanvasRenderingContext2D;
  width: number;
  height: number;
  globalScale: number;
}

/** Overlay render function drawn on top of the graph */
export type OverlayRenderFn = (context: OverlayRenderContext) => void;

/** Context for tooltip providers */
export interface TooltipContext {
  node: IGraphNode;
  neighbors: IGraphNode[];
  edges: IGraphEdge[];
}

/** Custom tooltip content returned by a provider */
export interface TooltipContent {
  sections: Array<{ title: string; content: string }>;
}

/** Tooltip provider function */
export type TooltipProviderFn = (context: TooltipContext) => TooltipContent | null;

/** Drawing helper: badge options */
export interface BadgeOpts {
  text: string;
  x: number;
  y: number;
  color?: string;
  bgColor?: string;
  fontSize?: number;
}

/** Drawing helper: ring options */
export interface RingOpts {
  x: number;
  y: number;
  radius: number;
  color: string;
  width?: number;
  progress?: number;
}

/** Drawing helper: label options */
export interface LabelOpts {
  text: string;
  x: number;
  y: number;
  color?: string;
  fontSize?: number;
  align?: CanvasTextAlign;
}

/**
 * API available to Tier 2 plugin scripts running in the webview.
 */
export interface CodeGraphyWebviewAPI {
  /** Get a scoped container div for this plugin */
  getContainer(): HTMLDivElement;

  /** Register a custom node renderer for a specific node type */
  registerNodeRenderer(type: string, fn: NodeRenderFn): WebviewDisposable;

  /** Register a canvas overlay drawn on top of the graph */
  registerOverlay(id: string, fn: OverlayRenderFn): WebviewDisposable;

  /** Register a tooltip provider for additional tooltip sections */
  registerTooltipProvider(fn: TooltipProviderFn): WebviewDisposable;

  /** Drawing helpers */
  helpers: {
    drawBadge(ctx: CanvasRenderingContext2D, opts: BadgeOpts): void;
    drawProgressRing(ctx: CanvasRenderingContext2D, opts: RingOpts): void;
    drawLabel(ctx: CanvasRenderingContext2D, opts: LabelOpts): void;
  };

  /** Send a message to the extension host (plugin-scoped) */
  sendMessage(msg: { type: string; data: unknown }): void;

  /** Listen for messages from the extension host */
  onMessage(handler: (msg: { type: string; data: unknown }) => void): WebviewDisposable;
}
