/* eslint-disable @typescript-eslint/no-unused-vars */
import type * as React from 'react';
import type { MockedFunction } from 'vitest';
import type {
  ForceGraphMethods as ForceGraph2DMethods,
  GraphData,
  LinkObject,
  NodeObject,
} from './react-force-graph-2d';

export interface ForceGraphMethods<NodeType = NodeObject, _LinkType = LinkObject> {
  zoomToFit(duration?: number, padding?: number, nodeFilter?: (node: NodeType) => boolean): void;
  cameraPosition(
    position: { x: number; y: number; z: number },
    lookAt?: { x: number; y: number; z: number },
    duration?: number,
  ): void;
  d3Force(name: string): unknown;
  d3Force(name: string, force: unknown): void;
  d3ReheatSimulation(): void;
  pauseAnimation(): void;
  resumeAnimation(): void;
}

export interface ForceGraph3DProps<NodeType = NodeObject, LinkType = LinkObject> {
  backgroundColor?: string;
  graphData?: GraphData<NodeType, LinkType>;
  nodeVal?: (node: NodeType) => number;
  nodeLabel?: string | ((node: NodeType) => string);
  nodeThreeObjectExtend?: boolean;
  nodeThreeObject?: (node: NodeType) => unknown;
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
  linkCurveRotation?: string | ((link: LinkType) => string | number);
  onBackgroundClick?: (event: MouseEvent) => void;
  onBackgroundRightClick?: (event: MouseEvent) => void;
  onEngineStop?: () => void;
  onLinkClick?: (link: LinkType, event: MouseEvent) => void;
  onLinkRightClick?: (link: LinkType, event: MouseEvent) => void;
  onNodeClick?: (node: NodeType, event: MouseEvent) => void;
  onNodeHover?: (node: NodeType | null, previousNode: NodeType | null) => void;
  onNodeRightClick?: (node: NodeType, event: MouseEvent) => void;
  enableNodeDrag?: boolean;
  enablePointerInteraction?: boolean;
  showPointerCursor?: boolean | ((obj: NodeType | LinkType | undefined) => boolean);
  [key: string]: unknown;
}

export interface ForceGraph3DLastProps<NodeType = NodeObject, LinkType = LinkObject>
  extends ForceGraph3DProps<NodeType, LinkType> {
  backgroundColor: string;
  graphData: GraphData<NodeType, LinkType>;
  nodeVal: (node: NodeType) => number;
  nodeLabel: string;
  nodeThreeObjectExtend: boolean;
  nodeThreeObject: (node: NodeType) => unknown;
  linkColor: string | ((link: LinkType) => string);
  linkWidth: number | ((link: LinkType) => number);
  linkDirectionalArrowLength: number | ((link: LinkType) => number);
  linkDirectionalArrowRelPos: number | ((link: LinkType) => number);
  linkDirectionalArrowColor: string | ((link: LinkType) => string);
  linkDirectionalParticles: number | ((link: LinkType) => number);
  linkDirectionalParticleWidth: number;
  linkDirectionalParticleSpeed: number;
  linkDirectionalParticleColor: string | ((link: LinkType) => string);
  linkCurvature: number | ((link: LinkType) => number);
  linkCurveRotation: string | ((link: LinkType) => string | number);
}

export interface ForceGraph3DMockMethods<NodeType = NodeObject, LinkType = LinkObject> {
  zoomToFit: MockedFunction<ForceGraphMethods<NodeType, LinkType>['zoomToFit']>;
  cameraPosition: MockedFunction<ForceGraphMethods<NodeType, LinkType>['cameraPosition']>;
  d3Force: MockedFunction<ForceGraphMethods<NodeType, LinkType>['d3Force']>;
  d3ReheatSimulation: MockedFunction<ForceGraphMethods<NodeType, LinkType>['d3ReheatSimulation']>;
  pauseAnimation: MockedFunction<ForceGraphMethods<NodeType, LinkType>['pauseAnimation']>;
  resumeAnimation: MockedFunction<ForceGraphMethods<NodeType, LinkType>['resumeAnimation']>;
}

export interface ForceGraph3DTestHelpers<NodeType = NodeObject, LinkType = LinkObject> {
  clearAllHandlers(): void;
  getMockMethods(): ForceGraph3DMockMethods<NodeType, LinkType> & ForceGraph2DMethods<NodeType, LinkType>;
  getLastProps(): ForceGraph3DLastProps<NodeType, LinkType>;
  simulateBackgroundClick(eventInit?: MouseEventInit): void;
  simulateBackgroundRightClick(): void;
  simulateLinkClick(
    link: { id: string; from?: string; to?: string; source?: string; target?: string },
    eventInit?: MouseEventInit,
  ): void;
  simulateLinkRightClick(
    link: { id: string; from?: string; to?: string; source?: string; target?: string },
  ): void;
  simulateNodeClick(node: { id: string }, eventInit?: MouseEventInit): void;
  simulateNodeRightClick(node: { id: string }): void;
}

export type ForceGraph3DComponent<NodeType = NodeObject, LinkType = LinkObject> =
  React.ForwardRefExoticComponent<
    ForceGraph3DProps<NodeType, LinkType> &
      React.RefAttributes<ForceGraphMethods<NodeType, LinkType> | undefined>
  > &
    ForceGraph3DTestHelpers<NodeType, LinkType>;

declare const ForceGraph3D: ForceGraph3DComponent;

export default ForceGraph3D;
