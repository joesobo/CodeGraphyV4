/* eslint-disable @typescript-eslint/no-unused-vars */
import type * as React from 'react';
import type { MockedFunction } from 'vitest';

type CanvasCustomRenderMode = 'replace' | 'before' | 'after';

export type ForceGraphNodeBase = Record<string, never>;

export type ForceGraphLinkBase = Record<string, never>;

export type NodeObject<NodeType extends object = ForceGraphNodeBase> = NodeType & {
  id?: string | number;
  x?: number;
  y?: number;
  z?: number;
  fx?: number;
  fy?: number;
  fz?: number;
  [others: string]: unknown;
};

export type LinkObject<NodeType extends object = ForceGraphNodeBase, LinkType extends object = ForceGraphLinkBase> = LinkType & {
  source?: string | number | NodeObject<NodeType>;
  target?: string | number | NodeObject<NodeType>;
  [others: string]: unknown;
};

export interface GraphData<NodeType extends object = ForceGraphNodeBase, LinkType extends object = ForceGraphLinkBase> {
  nodes: NodeObject<NodeType>[];
  links: LinkObject<NodeType, LinkType>[];
}

export interface ForceGraphMethods<NodeType = NodeObject, _LinkType = LinkObject> {
  zoom(): number;
  zoom(scale: number, duration?: number): void;
  zoomToFit(duration?: number, padding?: number, nodeFilter?: (node: NodeType) => boolean): void;
  centerAt(x: number, y: number, duration?: number): void;
  d3Force(name: string): unknown;
  d3Force(name: string, force: unknown): void;
  d3ReheatSimulation(): void;
  pauseAnimation(): void;
  resumeAnimation(): void;
  graph2ScreenCoords(x: number, y: number): { x: number; y: number };
  screen2GraphCoords(x: number, y: number): { x: number; y: number };
  getGraphBbox(): { x: [number, number]; y: [number, number] };
}

export interface ForceGraph2DProps<NodeType = NodeObject, LinkType = LinkObject> {
  backgroundColor?: string;
  graphData?: GraphData<NodeType, LinkType>;
  nodeCanvasObject?: (
    node: NodeType,
    ctx: CanvasRenderingContext2D,
    globalScale: number,
  ) => void;
  nodeCanvasObjectMode?: (node: NodeType) => CanvasCustomRenderMode;
  nodePointerAreaPaint?: (
    node: NodeType,
    color: string,
    ctx: CanvasRenderingContext2D,
  ) => void;
  nodeVal?: (node: NodeType) => number;
  nodeRelSize?: number;
  linkColor?: string | ((link: LinkType) => string);
  linkWidth?: number | ((link: LinkType) => number);
  linkDirectionalArrowLength?: number | ((link: LinkType) => number);
  linkDirectionalArrowRelPos?: number | ((link: LinkType) => number);
  linkDirectionalArrowColor?: string | ((link: LinkType) => string);
  linkDirectionalParticles?: number | ((link: LinkType) => number);
  linkDirectionalParticleWidth?: number;
  linkDirectionalParticleSpeed?: number;
  linkDirectionalParticleColor?: string | ((link: LinkType) => string);
  linkCurvature?: number | ((link: LinkType) => number);
  linkCanvasObject?: (
    link: LinkType,
    ctx: CanvasRenderingContext2D,
    globalScale: number,
  ) => void;
  linkCanvasObjectMode?: (link: LinkType) => CanvasCustomRenderMode;
  onRenderFramePost?: (ctx: CanvasRenderingContext2D, globalScale: number) => void;
  autoPauseRedraw?: boolean;
  onBackgroundClick?: (event: MouseEvent) => void;
  onBackgroundRightClick?: (event: MouseEvent) => void;
  onEngineStop?: () => void;
  onLinkClick?: (link: LinkType, event: MouseEvent) => void;
  onLinkRightClick?: (link: LinkType, event: MouseEvent) => void;
  onNodeClick?: (node: NodeType, event: MouseEvent) => void;
  onNodeHover?: (node: NodeType | null, previousNode: NodeType | null) => void;
  onNodeRightClick?: (node: NodeType, event: MouseEvent) => void;
  enableNodeDrag?: boolean;
  enableZoomInteraction?: boolean | ((event: MouseEvent) => boolean);
  enablePanInteraction?: boolean | ((event: MouseEvent) => boolean);
  enablePointerInteraction?: boolean;
  showPointerCursor?: boolean | ((obj: NodeType | LinkType | undefined) => boolean);
  [key: string]: unknown;
}

export interface ForceGraph2DLastProps<NodeType = NodeObject, LinkType = LinkObject>
  extends ForceGraph2DProps<NodeType, LinkType> {
  backgroundColor: string;
  graphData: GraphData<NodeType, LinkType>;
  nodeCanvasObject?: (
    node: NodeType,
    ctx: CanvasRenderingContext2D,
    globalScale: number,
  ) => void;
  nodeCanvasObjectMode: (node: NodeType) => CanvasCustomRenderMode;
  nodePointerAreaPaint?: (
    node: NodeType,
    color: string,
    ctx: CanvasRenderingContext2D,
  ) => void;
  nodeRelSize: number;
  nodeVal: (node: NodeType) => number;
  linkColor: string | ((link: LinkType) => string);
  linkWidth: number | ((link: LinkType) => number);
  linkDirectionalArrowLength: number | ((link: LinkType) => number);
  linkDirectionalArrowRelPos: (link: LinkType) => number;
  linkDirectionalArrowColor: string | ((link: LinkType) => string);
  linkDirectionalParticles: number | ((link: LinkType) => number);
  linkDirectionalParticleWidth: number;
  linkDirectionalParticleSpeed: number;
  linkDirectionalParticleColor: string | ((link: LinkType) => string);
  linkCurvature: number | ((link: LinkType) => number);
  linkCanvasObject: (
    link: LinkType,
    ctx: CanvasRenderingContext2D,
    globalScale: number,
  ) => void;
  linkCanvasObjectMode: (link: LinkType) => CanvasCustomRenderMode;
  onRenderFramePost: (ctx: CanvasRenderingContext2D, globalScale: number) => void;
  autoPauseRedraw: boolean;
  d3VelocityDecay?: number;
}

export interface ForceGraph2DMockMethods<NodeType = NodeObject, LinkType = LinkObject> {
  zoomToFit: MockedFunction<ForceGraphMethods<NodeType, LinkType>['zoomToFit']>;
  zoom: MockedFunction<ForceGraphMethods<NodeType, LinkType>['zoom']>;
  centerAt: MockedFunction<ForceGraphMethods<NodeType, LinkType>['centerAt']>;
  refresh: MockedFunction<() => void>;
  linkDirectionalArrowLength: MockedFunction<(value: unknown) => unknown>;
  linkDirectionalArrowRelPos: MockedFunction<(value: unknown) => unknown>;
  linkDirectionalArrowColor: MockedFunction<(value: unknown) => unknown>;
  linkDirectionalParticles: MockedFunction<(value: unknown) => unknown>;
  linkDirectionalParticleWidth: MockedFunction<(value: unknown) => unknown>;
  linkDirectionalParticleSpeed: MockedFunction<(value: unknown) => unknown>;
  linkDirectionalParticleColor: MockedFunction<(value: unknown) => unknown>;
  d3Force: MockedFunction<ForceGraphMethods<NodeType, LinkType>['d3Force']>;
  d3ReheatSimulation: MockedFunction<ForceGraphMethods<NodeType, LinkType>['d3ReheatSimulation']>;
  pauseAnimation: MockedFunction<ForceGraphMethods<NodeType, LinkType>['pauseAnimation']>;
  resumeAnimation: MockedFunction<ForceGraphMethods<NodeType, LinkType>['resumeAnimation']>;
  screen2GraphCoords: MockedFunction<ForceGraphMethods<NodeType, LinkType>['screen2GraphCoords']>;
  graph2ScreenCoords: MockedFunction<ForceGraphMethods<NodeType, LinkType>['graph2ScreenCoords']>;
  getGraphBbox: MockedFunction<ForceGraphMethods<NodeType, LinkType>['getGraphBbox']>;
}

export interface ForceGraph2DTestHelpers<NodeType = NodeObject, LinkType = LinkObject> {
  clearAllHandlers(): void;
  clearMockPositions(): void;
  getMockMethods(): ForceGraph2DMockMethods<NodeType, LinkType>;
  getLastProps(): ForceGraph2DLastProps<NodeType, LinkType>;
  simulateBackgroundClick(eventInit?: MouseEventInit): void;
  simulateBackgroundRightClick(): void;
  simulateEngineStop(): void;
  simulateLinkClick(
    link: { id: string; from?: string; to?: string; source?: string; target?: string },
    eventInit?: MouseEventInit,
  ): void;
  simulateLinkRightClick(
    link: { id: string; from?: string; to?: string; source?: string; target?: string },
  ): void;
  simulateNodeClick(node: { id: string }, eventInit?: MouseEventInit): void;
  simulateNodeHover(node: { id: string } | null): void;
  simulateNodeRightClick(node: { id: string }): void;
  mockGetNodeAt(nodeId: string | undefined): void;
  setMockNodeAtPosition(position: { x: number; y: number }, nodeId: string): void;
}

export type ForceGraph2DComponent<NodeType = NodeObject, LinkType = LinkObject> =
  React.ForwardRefExoticComponent<
    ForceGraph2DProps<NodeType, LinkType> &
      React.RefAttributes<ForceGraphMethods<NodeType, LinkType> | undefined>
  > &
    ForceGraph2DTestHelpers<NodeType, LinkType>;

declare const ForceGraph2D: ForceGraph2DComponent;

export default ForceGraph2D;
