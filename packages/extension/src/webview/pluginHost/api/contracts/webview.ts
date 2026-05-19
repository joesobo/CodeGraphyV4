/**
 * @fileoverview Extension-local webview plugin contracts.
 * @module webview/pluginHost/contracts
 */

import type { IGraphEdge, IGraphNode } from '../../../../shared/graph/contracts';
import type { Disposable } from '../../../../core/plugins/disposable';

export type WebviewDisposable = Disposable;

export type GraphPluginSlot =
  | 'toolbar'
  | 'graph.toolbar'
  | 'graph.panelSlot'
  | 'graph.stage.worldOverlay'
  | 'graph.stage.viewportOverlay'
  | 'node-details'
  | 'tooltip'
  | 'timeline-panel'
  | 'graph-overlay';

export interface NodeRenderContext {
  node: IGraphNode;
  ctx: CanvasRenderingContext2D;
  globalScale: number;
  decoration?: unknown;
}

export type NodeRenderFn = (context: NodeRenderContext) => void;

export interface OverlayRenderContext {
  ctx: CanvasRenderingContext2D;
  width: number;
  height: number;
  globalScale: number;
}

export type OverlayRenderFn = (context: OverlayRenderContext) => void;

export interface TooltipContext {
  node: IGraphNode;
  neighbors: IGraphNode[];
  edges: IGraphEdge[];
}

export interface TooltipAction {
  id: string;
  label: string;
  icon?: string;
  action: (this: void) => void | Promise<void>;
}

export interface TooltipContent {
  sections: Array<{ title: string; content: string }>;
  actions?: TooltipAction[];
}

export type TooltipProviderFn = (context: TooltipContext) => TooltipContent | null;

export interface BadgeOpts {
  text: string;
  x: number;
  y: number;
  color?: string;
  bgColor?: string;
  fontSize?: number;
}

export interface RingOpts {
  x: number;
  y: number;
  radius: number;
  color: string;
  width?: number;
  progress?: number;
}

export interface LabelOpts {
  text: string;
  x: number;
  y: number;
  color?: string;
  fontSize?: number;
  align?: CanvasTextAlign;
}

export interface CodeGraphyWebviewAPI {
  getContainer(): HTMLDivElement;
  getSlotContainer(slot: GraphPluginSlot): HTMLDivElement;
  registerNodeRenderer(type: string, fn: NodeRenderFn): Disposable;
  registerOverlay(id: string, fn: OverlayRenderFn): Disposable;
  registerTooltipProvider(fn: TooltipProviderFn): Disposable;
  helpers: {
    drawBadge(ctx: CanvasRenderingContext2D, opts: BadgeOpts): void;
    drawProgressRing(ctx: CanvasRenderingContext2D, opts: RingOpts): void;
    drawLabel(ctx: CanvasRenderingContext2D, opts: LabelOpts): void;
  };
  sendMessage(msg: { type: string; data: unknown }): void;
  onMessage(handler: (msg: { type: string; data: unknown }) => void): Disposable;
}
