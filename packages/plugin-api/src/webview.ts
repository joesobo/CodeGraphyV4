/**
 * @fileoverview CodeGraphy webview plugin API contracts.
 * @module @codegraphy-dev/plugin-api/webview
 */

import type { Disposable } from './disposable';
import type { IGraphEdge, IGraphNode } from './graph';
import type { IGraphViewContributions, IGraphViewNodeDragState } from './graphView';

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
  | 'timeline-panel'
  | 'graph-overlay';

export type WebviewPluginActivationCleanup = void | (() => void) | Disposable;

export type WebviewPluginActivate = (
  api: CodeGraphyWebviewAPI,
) => WebviewPluginActivationCleanup | Promise<WebviewPluginActivationCleanup>;

export type PluginSlotRenderCleanup = void | (() => void) | Disposable;

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
  graphToScreen(x: number, y: number): GraphViewPoint2D;
  nodes: readonly GraphViewViewportNode[];
  reheatSimulation(): void;
  resumeAnimation(): void;
  screenToGraph(x: number, y: number): GraphViewPoint2D;
  timelineActive: boolean;
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
  action(this: void): void | Promise<void>;
}

export interface TooltipContent {
  sections: Array<{ title: string; content: string }>;
  actions?: TooltipAction[];
}

export type TooltipProviderFn = (context: TooltipContext) => TooltipContent | null;

export interface BadgeOptions {
  text: string;
  x: number;
  y: number;
  color?: string;
  bgColor?: string;
  fontSize?: number;
}

export interface RingOptions {
  x: number;
  y: number;
  radius: number;
  color: string;
  width?: number;
  progress?: number;
}

export interface LabelOptions {
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
  registerSlotContribution(slot: GraphPluginSlot, contribution: PluginSlotContribution): Disposable;
  getHostState(): Record<string, unknown>;
  getPluginData(): unknown;
  setPluginData(data: unknown): void;
  getGraphViewViewportState(): GraphViewViewportState | null;
  onGraphViewViewportState(handler: (state: GraphViewViewportState | null) => void): Disposable;
  registerNodeRenderer(type: string, fn: NodeRenderFn): Disposable;
  registerOverlay(id: string, fn: OverlayRenderFn): Disposable;
  registerTooltipProvider(fn: TooltipProviderFn): Disposable;
  registerGraphViewContributions(contributions: IGraphViewContributions): Disposable;
  helpers: {
    drawBadge(ctx: CanvasRenderingContext2D, options: BadgeOptions): void;
    drawProgressRing(ctx: CanvasRenderingContext2D, options: RingOptions): void;
    drawLabel(ctx: CanvasRenderingContext2D, options: LabelOptions): void;
  };
  sendMessage(message: { type: string; data: unknown }): void;
  postHostMessage(message: unknown): void;
  onMessage(handler: (message: { type: string; data: unknown }) => void): Disposable;
}
