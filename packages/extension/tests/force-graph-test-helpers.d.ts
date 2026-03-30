/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
declare module 'react-force-graph-2d' {
  import type * as React from 'react';

  type MockableFunction<Fn extends (...args: any[]) => any> = Fn & {
    mock?: { calls: unknown[][] };
    mockClear?(): unknown;
    mockImplementation?(implementation: Fn): unknown;
    mockImplementationOnce?(implementation: Fn): unknown;
  };

  export type NodeObject = {
    id?: string | number;
    x?: number;
    y?: number;
    z?: number;
    fx?: number;
    fy?: number;
    fz?: number;
    label?: string;
    size?: number;
    color?: string;
    borderColor?: string;
    borderWidth?: number;
    baseOpacity?: number;
    isFavorite?: boolean;
    [key: string]: unknown;
  };

  export type LinkObject = {
    id?: string;
    from?: string;
    to?: string;
    source?: NodeObject | string | number;
    target?: NodeObject | string | number;
    [key: string]: unknown;
  };

  export interface ForceGraphMethods<NodeType = NodeObject, LinkType = LinkObject> {
    zoom?: MockableFunction<{
      (): number;
      (scale: number, duration?: number): void;
    }>;
    zoomToFit?: MockableFunction<
      (duration?: number, padding?: number, filter?: (node: NodeType) => boolean) => void
    >;
    centerAt?: MockableFunction<(x: number, y: number, duration?: number) => void>;
    d3Force?: MockableFunction<{
      (name: string): unknown;
      (name: string, force: unknown): void;
    }>;
    d3ReheatSimulation?: MockableFunction<() => void>;
    pauseAnimation?: MockableFunction<() => void>;
    resumeAnimation?: MockableFunction<() => void>;
    graph2ScreenCoords?: MockableFunction<(x: number, y: number) => { x: number; y: number }>;
    screen2GraphCoords?: MockableFunction<(x: number, y: number) => { x: number; y: number }>;
    getGraphBbox?: MockableFunction<() => { x: [number, number]; y: [number, number] }>;
  }

  export interface ForceGraph2DProps<NodeType = NodeObject, LinkType = LinkObject> {
    backgroundColor?: string;
    graphData?: { nodes?: NodeType[]; links?: LinkType[] };
    nodeCanvasObject?: (
      node: NodeType,
      ctx: CanvasRenderingContext2D,
      globalScale: number,
    ) => void;
    nodeCanvasObjectMode?: (node: NodeType) => 'before' | 'after' | 'replace';
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
    linkCanvasObjectMode?: (link: LinkType) => 'before' | 'after' | 'replace';
    onRenderFramePost?: (ctx: CanvasRenderingContext2D, globalScale: number) => void;
    autoPauseRedraw?: boolean;
    [key: string]: unknown;
  }

  interface ForceGraph2DTestHelpers {
    clearAllHandlers(): void;
    clearMockPositions(): void;
    getMockMethods(): any;
    getLastProps(): any;
    simulateBackgroundClick(eventInit?: MouseEventInit): void;
    simulateBackgroundRightClick(): void;
    simulateEngineStop(): void;
    simulateLinkClick(link: any, eventInit?: MouseEventInit): void;
    simulateLinkRightClick(link: any): void;
    simulateNodeClick(node: any, eventInit?: MouseEventInit): void;
    simulateNodeHover(node: any): void;
    simulateNodeRightClick(node: any): void;
    mockGetNodeAt(nodeId: string | undefined): void;
    setMockNodeAtPosition(position: { x: number; y: number }, nodeId: string): void;
  }

  const ForceGraph2D: React.ForwardRefExoticComponent<
    ForceGraph2DProps<NodeObject, LinkObject> &
      React.RefAttributes<ForceGraphMethods<NodeObject, LinkObject> | undefined>
  > &
    ForceGraph2DTestHelpers;

  export default ForceGraph2D;
}

declare module 'react-force-graph-3d' {
  import type * as React from 'react';
  import type { LinkObject, NodeObject } from 'react-force-graph-2d';

  export interface ForceGraphMethods<NodeType = NodeObject, LinkType = LinkObject> {
    zoomToFit?: MockableFunction<
      (duration?: number, padding?: number, filter?: (node: NodeType) => boolean) => void
    >;
    cameraPosition?: MockableFunction<
      (
        position: { x: number; y: number; z: number },
        lookAt?: { x: number; y: number; z: number },
        duration?: number,
      ) => void
    >;
    d3Force?: MockableFunction<{
      (name: string): unknown;
      (name: string, force: unknown): void;
    }>;
    d3ReheatSimulation?: MockableFunction<() => void>;
    pauseAnimation?: MockableFunction<() => void>;
    resumeAnimation?: MockableFunction<() => void>;
  }

  export interface ForceGraph3DProps<NodeType = NodeObject, LinkType = LinkObject> {
    backgroundColor?: string;
    graphData?: { nodes?: NodeType[]; links?: LinkType[] };
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
    [key: string]: unknown;
  }

  interface ForceGraph3DTestHelpers {
    clearAllHandlers(): void;
    getMockMethods(): any;
    getLastProps(): any;
    simulateBackgroundClick(eventInit?: MouseEventInit): void;
    simulateBackgroundRightClick(): void;
    simulateLinkClick(link: any, eventInit?: MouseEventInit): void;
    simulateLinkRightClick(link: any): void;
    simulateNodeClick(node: any, eventInit?: MouseEventInit): void;
    simulateNodeRightClick(node: any): void;
  }

  const ForceGraph3D: React.ForwardRefExoticComponent<
    ForceGraph3DProps<NodeObject, LinkObject> &
      React.RefAttributes<ForceGraphMethods<NodeObject, LinkObject> | undefined>
  > &
    ForceGraph3DTestHelpers;

  export default ForceGraph3D;
}

declare module 'three' {
  interface Color {
    getHexString(): string;
  }

  interface Sprite {
    visible: boolean;
  }
}
