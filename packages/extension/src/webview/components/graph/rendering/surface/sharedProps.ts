import type { DagMode } from '../../../../../shared/settings/modes';
import type { FGLink, FGNode } from '../../model/build';

export const INTERACTIVE_COOLDOWN_TICKS = 60;

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
  graphData: { nodes: FGNode[]; links: FGLink[] };
  height: number | undefined;
  nodeId: 'id';
  onBackgroundClick(this: void, event?: MouseEvent): void;
  onBackgroundRightClick(this: void, event: MouseEvent): void;
  onEngineStop(this: void): void;
  onLinkClick(this: void, link: FGLink, event: MouseEvent): void;
  onLinkRightClick(this: void, link: FGLink, event: MouseEvent): void;
  onNodeClick(this: void, node: FGNode, event: MouseEvent): void;
  onNodeDrag?(this: void, node: FGNode, translate: { x: number; y: number }): void;
  onNodeDragEnd?(this: void, node: FGNode): void;
  onNodeHover(this: void, node: FGNode | null): void;
  onNodeRightClick(this: void, node: FGNode, event: MouseEvent): void;
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
  onLinkClick(this: void, link: FGLink, event: MouseEvent): void;
  onLinkRightClick(this: void, link: FGLink, event: MouseEvent): void;
  onNodeClick(this: void, node: FGNode, event: MouseEvent): void;
  onNodeDrag?(this: void, node: FGNode, translate: { x: number; y: number }): void;
  onNodeDragEnd?(this: void, node: FGNode): void;
  onNodeHover(this: void, node: FGNode | null): void;
  onNodeRightClick(this: void, node: FGNode, event: MouseEvent): void;
  damping: number;
}

export function normalizeGraphDimension(value: number): number | undefined {
  return value === 0 ? undefined : value;
}

export function buildSharedGraphProps(
  options: BuildSharedGraphPropsOptions,
): GraphSurfaceSharedProps {
  return {
    graphData: options.graphData,
    width: normalizeGraphDimension(options.containerSize.width),
    height: normalizeGraphDimension(options.containerSize.height),
    onNodeClick: options.onNodeClick,
    ...(options.onNodeDrag
      ? {
          onNodeDrag: options.onNodeDrag,
        }
      : {}),
    ...(options.onNodeDragEnd
      ? {
          onNodeDragEnd: options.onNodeDragEnd,
        }
      : {}),
    onNodeRightClick: options.onNodeRightClick,
    onLinkClick: options.onLinkClick,
    onLinkRightClick: options.onLinkRightClick,
    onBackgroundClick: (event) => options.onBackgroundClick(event),
    onBackgroundRightClick: (event) => options.onBackgroundRightClick(event),
    onEngineStop: () => options.onEngineStop(),
    d3VelocityDecay: options.damping,
    d3AlphaDecay: 0.0228,
    warmupTicks: 0,
    cooldownTicks: INTERACTIVE_COOLDOWN_TICKS,
    nodeId: 'id',
    onNodeHover: options.onNodeHover,
    dagMode: options.dagMode ?? undefined,
    dagLevelDistance: options.dagMode ? 60 : undefined,
  };
}
