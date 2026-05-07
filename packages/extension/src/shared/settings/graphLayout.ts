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
  twoDimensional?: GraphLayoutCoordinate2D;
  threeDimensional?: GraphLayoutCoordinate3D;
  updatedAt: string;
}

export interface GraphLayoutSection {
  id: string;
  label: string;
  color: string;
  x: number;
  y: number;
  width: number;
  height: number;
  collapsed: boolean;
  updatedAt: string;
}

export interface GraphLayoutOwnership {
  itemId: string;
  itemKind: 'node' | 'section';
  ownerSectionId: string | null;
  updatedAt: string;
}

export interface GraphLayoutSettings {
  pinnedNodes: Record<string, GraphLayoutPinnedNode>;
  sections: Record<string, GraphLayoutSection>;
  ownership: Record<string, GraphLayoutOwnership>;
}

export function createDefaultGraphLayoutSettings(): GraphLayoutSettings {
  return {
    pinnedNodes: {},
    sections: {},
    ownership: {},
  };
}

export function getGraphLayoutPinCoordinate(
  pinnedNode: GraphLayoutPinnedNode | undefined,
  graphMode: GraphLayoutMode,
): GraphLayoutCoordinate2D | GraphLayoutCoordinate3D | undefined {
  return graphMode === '2d'
    ? pinnedNode?.twoDimensional
    : pinnedNode?.threeDimensional;
}
