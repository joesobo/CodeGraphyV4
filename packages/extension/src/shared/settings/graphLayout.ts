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
  collapsedNodes: Record<string, boolean>;
  pinnedNodes: Record<string, GraphLayoutPinnedNode>;
}

export function createDefaultGraphLayoutSettings(): GraphLayoutSettings {
  return {
    collapsedNodes: {},
    pinnedNodes: {},
  };
}

export const DEFAULT_GRAPH_LAYOUT_SETTINGS: GraphLayoutSettings = createDefaultGraphLayoutSettings();

export function getCollapsedGraphNodeIds(graphLayout: GraphLayoutSettings): string[] {
  return Object.entries(graphLayout.collapsedNodes)
    .filter(([, collapsed]) => collapsed)
    .map(([nodeId]) => nodeId);
}

export function setGraphLayoutNodeCollapsed(
  graphLayout: GraphLayoutSettings,
  nodeId: string,
  collapsed: boolean,
): GraphLayoutSettings {
  const collapsedNodes = { ...graphLayout.collapsedNodes };
  if (collapsed) {
    collapsedNodes[nodeId] = true;
  } else {
    delete collapsedNodes[nodeId];
  }

  return { ...graphLayout, collapsedNodes };
}

export function getGraphLayoutPinCoordinate(
  pinnedNode: GraphLayoutPinnedNode | undefined,
  graphMode: GraphLayoutMode,
): GraphLayoutCoordinate2D | GraphLayoutCoordinate3D | undefined {
  return graphMode === '2d'
    ? pinnedNode?.['2D']
    : pinnedNode?.['3D'];
}
