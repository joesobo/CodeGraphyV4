import type { FGLink, FGNode } from '../../model/build';

export interface GraphContainerSize {
  height: number;
  width: number;
}

export interface GraphSurfaceSharedProps {
  graphData: { nodes: FGNode[]; links: FGLink[] };
  onBackgroundClick(this: void, event?: MouseEvent): void;
  onBackgroundRightClick(this: void, event: MouseEvent): void;
  onEngineStop(this: void): void;
  onLinkClick(this: void, link: FGLink, event: MouseEvent): void;
  onLinkRightClick(this: void, link: FGLink, event: MouseEvent): void;
  onNodeClick(this: void, node: FGNode, event: MouseEvent): void;
  onNodeDrag(this: void, node: FGNode, translate: { x: number; y: number }): void;
  onNodeDragEnd(this: void, node: FGNode): void;
  onNodeHover(this: void, node: FGNode | null): void;
  onNodeRightClick(this: void, node: FGNode, event: MouseEvent): void;
  width: number | undefined;
}

export interface BuildSharedGraphPropsOptions extends Omit<GraphSurfaceSharedProps, 'width'> {
  width: number;
}

export function buildSharedGraphProps(
  options: BuildSharedGraphPropsOptions,
): GraphSurfaceSharedProps {
  return {
    ...options,
    width: options.width === 0 ? undefined : options.width,
  };
}
