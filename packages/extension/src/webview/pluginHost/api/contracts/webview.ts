/**
 * @fileoverview Extension-local webview plugin contracts.
 * @module webview/pluginHost/contracts
 */

import type { IGraphEdge, IGraphNode } from '../../../../shared/graph/contracts';
import type {
  IGraphViewContributions,
  IGraphViewNodeDragState,
} from '../../../../../../plugin-api/src';
import type { WebviewDisposable } from '../../disposable';

export type { IGraphViewContributions };
export type { WebviewDisposable };

export type GraphPluginSlot =
  | 'toolbar'
  | 'graph.toolbar'
  | 'graph.panelSlot'
  | 'theme.panel'
  | 'graph.stage.worldBackground'
  | 'graph.stage.worldOverlay'
  | 'graph.stage.viewportOverlay'
  | 'node-details'
  | 'tooltip'
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

export interface GraphViewPoint2D {
  x: number;
  y: number;
}

export interface GraphViewViewportNode extends Partial<IGraphViewNodeDragState> {
  [key: string]: unknown;
  id: string;
}

export type GraphViewViewportNodeUpdate = Partial<IGraphViewNodeDragState> & Record<string, unknown>;

export interface GraphViewViewportState {
  graphMode: '2d';
  graphToScreen(x: number, y: number): GraphViewPoint2D;
  nodes: readonly GraphViewViewportNode[];
  reheatSimulation(): void;
  resumeAnimation(): void;
  screenToGraph(x: number, y: number): GraphViewPoint2D;
  updateNode(nodeId: string, updates: GraphViewViewportNodeUpdate): boolean;
  zoom: number;
}

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

export type PluginSlotRenderCleanup = void | (() => void) | WebviewDisposable;

export interface PluginSlotRenderContext {
  api: CodeGraphyWebviewAPI;
}

export interface PluginSlotContribution {
  id: string;
  order?: number;
  render(
    container: HTMLDivElement,
    context: PluginSlotRenderContext,
  ): PluginSlotRenderCleanup;
}

export interface CodeGraphyWebviewAPI {
  getContainer(): HTMLDivElement;
  getSlotContainer(slot: GraphPluginSlot): HTMLDivElement;
  registerSlotContribution(slot: GraphPluginSlot, contribution: PluginSlotContribution): WebviewDisposable;
  getHostState(): Record<string, unknown>;
  getPluginData(): unknown;
  setPluginData(data: unknown): void;
  getGraphViewViewportState(): GraphViewViewportState | null;
  onGraphViewViewportState(handler: (state: GraphViewViewportState | null) => void): WebviewDisposable;
  registerNodeRenderer(type: string, fn: NodeRenderFn): WebviewDisposable;
  registerOverlay(id: string, fn: OverlayRenderFn): WebviewDisposable;
  registerTooltipProvider(fn: TooltipProviderFn): WebviewDisposable;
  registerGraphViewContributions(contributions: IGraphViewContributions): WebviewDisposable;
  helpers: {
    drawBadge(ctx: CanvasRenderingContext2D, opts: BadgeOpts): void;
    drawProgressRing(ctx: CanvasRenderingContext2D, opts: RingOpts): void;
    drawLabel(ctx: CanvasRenderingContext2D, opts: LabelOpts): void;
  };
  sendMessage(msg: { type: string; data: unknown }): void;
  postHostMessage(msg: unknown): void;
  onMessage(handler: (msg: { type: string; data: unknown }) => void): WebviewDisposable;
}
