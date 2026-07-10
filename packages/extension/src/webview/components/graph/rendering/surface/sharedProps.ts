import type { DagMode } from '../../../../../shared/settings/modes';
import type { LinkObject, NodeObject } from 'react-force-graph-2d';
import type { FGLink, FGNode } from '../../model/build';

export const INTERACTIVE_COOLDOWN_TICKS = 60;
export const TIMELINE_COOLDOWN_TICKS = 50;
export const MAX_INTERACTIVE_PHYSICS_NODES = 50_000;
export const MAX_INTERACTIVE_PHYSICS_EDGES = 100_000;

export function resolveGraphCooldownTicks(
  nodeCount: number,
  edgeCount: number,
  timelineActive: boolean,
): number {
  if (
    nodeCount > MAX_INTERACTIVE_PHYSICS_NODES
    || edgeCount > MAX_INTERACTIVE_PHYSICS_EDGES
  ) {
    return 0;
  }
  return timelineActive ? TIMELINE_COOLDOWN_TICKS : INTERACTIVE_COOLDOWN_TICKS;
}

export interface GraphContainerSize {
  height: number;
  width: number;
}

export interface GraphSurfaceSharedProps {
  cooldownTicks: number;
  d3AlphaDecay: number;
  d3VelocityDecay: number;
  dagLevelDistance: number | undefined;
  dagMode: Exclude<DagMode, null> | undefined;
  graphData: { nodes: NodeObject[]; links: LinkObject[] };
  height: number | undefined;
  nodeId: 'id';
  onBackgroundClick(this: void, event?: MouseEvent): void;
  onBackgroundRightClick(this: void, event: MouseEvent): void;
  onEngineStop(this: void): void;
  onEngineTick?(this: void): void;
  onLinkClick(this: void, link: LinkObject, event: MouseEvent): void;
  onLinkRightClick(this: void, link: LinkObject, event: MouseEvent): void;
  onNodeClick(this: void, node: NodeObject, event: MouseEvent): void;
  onNodeDrag?(this: void, node: NodeObject, translate: { x: number; y: number }): void;
  onNodeDragEnd?(this: void, node: NodeObject): void;
  onNodeHover(this: void, node: NodeObject | null): void;
  onNodeRightClick(this: void, node: NodeObject, event: MouseEvent): void;
  warmupTicks: number;
  width: number | undefined;
}

export interface BuildSharedGraphPropsOptions {
  containerSize: GraphContainerSize;
  dagMode: DagMode;
  graphData: { nodes: FGNode[]; links: FGLink[] };
  onBackgroundClick(this: void, event?: MouseEvent): void;
  onBackgroundRightClick(this: void, event: MouseEvent): void;
  onEngineStop(this: void): void;
  onEngineTick?: (this: void) => void;
  onLinkClick(this: void, link: FGLink, event: MouseEvent): void;
  onLinkRightClick(this: void, link: FGLink, event: MouseEvent): void;
  onNodeClick(this: void, node: FGNode, event: MouseEvent): void;
  onNodeDrag?(this: void, node: FGNode, translate: { x: number; y: number }): void;
  onNodeDragEnd?(this: void, node: FGNode): void;
  onNodeHover(this: void, node: FGNode | null): void;
  onNodeRightClick(this: void, node: FGNode, event: MouseEvent): void;
  damping: number;
  timelineActive: boolean;
}

export function normalizeGraphDimension(value: number): number | undefined {
  return value === 0 ? undefined : value;
}

export function buildSharedGraphProps(
  options: BuildSharedGraphPropsOptions,
): GraphSurfaceSharedProps {
  return {
    graphData: options.graphData as unknown as { nodes: NodeObject[]; links: LinkObject[] },
    width: normalizeGraphDimension(options.containerSize.width),
    height: normalizeGraphDimension(options.containerSize.height),
    onNodeClick: (node, event) => options.onNodeClick(node as FGNode, event),
    ...(options.onNodeDrag
      ? {
          onNodeDrag: (node: NodeObject, translate: { x: number; y: number }) =>
            options.onNodeDrag?.(node as FGNode, translate),
        }
      : {}),
    ...(options.onNodeDragEnd
      ? {
          onNodeDragEnd: (node: NodeObject) => options.onNodeDragEnd?.(node as FGNode),
        }
      : {}),
    onNodeRightClick: (node, event) => options.onNodeRightClick(node as FGNode, event),
    onLinkClick: (link, event) => options.onLinkClick(link as FGLink, event),
    onLinkRightClick: (link, event) => options.onLinkRightClick(link as FGLink, event),
    onBackgroundClick: (event) => options.onBackgroundClick(event),
    onBackgroundRightClick: (event) => options.onBackgroundRightClick(event),
    onEngineStop: () => options.onEngineStop(),
    ...(options.onEngineTick
      ? { onEngineTick: () => options.onEngineTick?.() }
      : {}),
    d3VelocityDecay: options.damping,
    d3AlphaDecay: 0.0228,
    warmupTicks: 0,
    cooldownTicks: resolveGraphCooldownTicks(
      options.graphData.nodes.length,
      options.graphData.links.length,
      options.timelineActive,
    ),
    nodeId: 'id',
    onNodeHover: (node) => options.onNodeHover(node as FGNode | null),
    dagMode: options.dagMode ?? undefined,
    dagLevelDistance: options.dagMode ? 60 : undefined,
  };
}
