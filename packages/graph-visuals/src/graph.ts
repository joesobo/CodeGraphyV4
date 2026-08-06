export const FILE_TYPE_COLORS: Readonly<Record<string, string>> = Object.freeze({
  '.ts': '#93C5FD',
  '.tsx': '#67E8F9',
  '.js': '#FDE68A',
  '.jsx': '#FDBA74',
  '.css': '#F9A8D4',
  '.scss': '#E879F9',
  '.json': '#86EFAC',
  '.md': '#CBD5E1',
  '.html': '#FCA5A5',
  '.svg': '#C4B5FD',
});

export const DEFAULT_NODE_COLOR = '#A1A1AA';
export const DEFAULT_FOLDER_NODE_COLOR = '#A1A1AA';
export const DEFAULT_PACKAGE_NODE_COLOR = '#F59E0B';
export const DEFAULT_DIRECTION_COLOR = '#475569';

export const MIN_NODE_SIZE = 8;
export const MAX_NODE_SIZE = 30;
export const DEFAULT_NODE_SIZE = 16;

export const GRAPH_NODE_BORDER_WIDTH = 2;
export const GRAPH_NODE_SELECTION_BORDER_WIDTH = 3;
export const GRAPH_NODE_LABEL_FONT = '12px Sans-Serif';
export const GRAPH_NODE_LABEL_PADDING = 2;
export const OWNED_GRAPH_COLLISION_RADIUS_PADDING = 4;

export const FILE_ICON_SCALE = 1.2;
export const FOLDER_ICON_SCALE = 2;

export const ORDINARY_LINK_OPACITY = 0.3;
export const CONNECTED_LINK_OPACITY = 0.9;
export const MUTED_LINK_OPACITY = 0.12;
export const LINK_BASE_WIDTH = 1;

export const MATERIAL_TRANSPARENT_NODE_COLOR = 'rgba(0, 0, 0, 0)';

interface GraphVisualNode {
  id: string;
}

interface GraphVisualEdge {
  from: string;
  to: string;
}

export function getFileColor(extension: string): string {
  return FILE_TYPE_COLORS[extension.toLowerCase()] ?? DEFAULT_NODE_COLOR;
}

export function fileIconSize(nodeSize: number): number {
  return nodeSize * FILE_ICON_SCALE;
}

export function folderIconSize(nodeSize: number): number {
  return nodeSize * FOLDER_ICON_SCALE;
}

export function graphNodeLabelTop(
  nodeY: number,
  nodeHalfHeight: number,
  globalScale: number,
): number {
  return nodeY + nodeHalfHeight + GRAPH_NODE_LABEL_PADDING / globalScale;
}

export function computeConnectionSizes<
  Node extends GraphVisualNode,
  Edge extends GraphVisualEdge,
>(
  nodes: readonly Node[],
  edges: readonly Edge[],
): Map<string, number> {
  const relatedNodeIds = new Map(nodes.map(node => [node.id, new Set<string>()]));
  for (const edge of edges) {
    const sourceRelations = relatedNodeIds.get(edge.from);
    const targetRelations = relatedNodeIds.get(edge.to);
    if (!sourceRelations || !targetRelations) continue;
    sourceRelations.add(edge.to);
    targetRelations.add(edge.from);
  }

  return new Map(nodes.map(node => [
    node.id,
    connectionSize(relatedNodeIds.get(node.id)?.size ?? 0),
  ]));
}

function connectionSize(connectionCount: number): number {
  return Math.max(MIN_NODE_SIZE, Math.min(3 * Math.sqrt(connectionCount + 1), MAX_NODE_SIZE));
}
