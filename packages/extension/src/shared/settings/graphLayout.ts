export type GraphLayoutMode = '2d' | '3d';

export interface GraphLayoutCoordinate2D {
  x: number;
  y: number;
}

export interface GraphLayoutCoordinate3D extends GraphLayoutCoordinate2D {
  z: number;
}

export interface GraphLayoutPinnedNode {
  nodeId: string;
  '2D'?: GraphLayoutCoordinate2D;
  '3D'?: GraphLayoutCoordinate3D;
}

export interface GraphLayoutSettings {
  pinnedNodes: Record<string, GraphLayoutPinnedNode>;
}

export function createDefaultGraphLayoutSettings(): GraphLayoutSettings {
  return {
    pinnedNodes: {},
  };
}

export function getGraphLayoutPinCoordinate(
  pinnedNode: GraphLayoutPinnedNode | undefined,
  graphMode: GraphLayoutMode,
): GraphLayoutCoordinate2D | GraphLayoutCoordinate3D | undefined {
  return graphMode === '2d'
    ? pinnedNode?.['2D']
    : pinnedNode?.['3D'];
}
