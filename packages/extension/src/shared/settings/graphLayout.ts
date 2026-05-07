export type GraphLayoutMode = '2d' | '3d';

export const DEFAULT_GRAPH_SECTION_COLOR = '#60a5fa';
export const DEFAULT_GRAPH_SECTION_WIDTH = 280;
export const DEFAULT_GRAPH_SECTION_HEIGHT = 180;
export const GRAPH_SECTION_SELECTION_PADDING = 64;

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

export interface GraphLayoutSectionCreate {
  color?: string;
  height: number;
  label?: string;
  memberNodeIds?: string[];
  width: number;
  x: number;
  y: number;
}

export interface GraphLayoutSectionUpdate {
  collapsed?: boolean;
  color?: string;
  height?: number;
  label?: string;
  width?: number;
  x?: number;
  y?: number;
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
