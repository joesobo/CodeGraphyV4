import {
  buildContainmentEdges,
} from '../../core/views/folder/edges';
import {
  collectFolderPaths,
  createFolderNodes,
} from '../../core/views/folder/nodes';
import type { EdgeDecorationPayload } from '../../shared/plugins/decorations';
import type { IGraphData, IGraphNode } from '../../shared/graph/types';
import { STRUCTURAL_NESTS_EDGE_KIND } from '../../shared/graphControls/defaults';

export interface GraphControlsFilteringOptions {
  graphData: IGraphData | null;
  nodeVisibility: Record<string, boolean>;
  edgeVisibility: Record<string, boolean>;
  edgeColors: Record<string, string>;
  folderNodeColor: string;
  edgeDecorations?: Record<string, EdgeDecorationPayload>;
}

function getResolvedNodeType(node: IGraphNode): string {
  return node.nodeType ?? 'file';
}

function isNodeVisible(node: IGraphNode, visibility: Record<string, boolean>): boolean {
  return visibility[getResolvedNodeType(node)] ?? true;
}

function withResolvedNodeTypes(nodes: IGraphNode[]): IGraphNode[] {
  return nodes.map((node) => ({
    ...node,
    nodeType: node.nodeType ?? 'file',
  }));
}

export function applyGraphControls({
  graphData,
  nodeVisibility,
  edgeVisibility,
  edgeColors,
  folderNodeColor,
  edgeDecorations,
}: GraphControlsFilteringOptions): {
  graphData: IGraphData | null;
  edgeDecorations: Record<string, EdgeDecorationPayload> | undefined;
} {
  if (!graphData) {
    return { graphData: null, edgeDecorations };
  }

  const baseNodes = withResolvedNodeTypes(graphData.nodes);
  const visibleBaseNodes = baseNodes.filter((node) => isNodeVisible(node, nodeVisibility));
  const folderEnabled = nodeVisibility.folder ?? false;
  const nestsEnabled = edgeVisibility[STRUCTURAL_NESTS_EDGE_KIND] ?? true;

  const fileNodes = baseNodes.filter((node) => getResolvedNodeType(node) === 'file');
  const folderPaths = folderEnabled ? collectFolderPaths(fileNodes).paths : new Set<string>();
  const folderNodes = folderEnabled ? createFolderNodes(folderPaths, folderNodeColor) : [];

  const nodes = [...visibleBaseNodes, ...folderNodes];
  const visibleNodeIds = new Set(nodes.map((node) => node.id));

  const semanticEdges = graphData.edges.filter((edge) => {
    if (!(edgeVisibility[edge.kind] ?? true)) {
      return false;
    }

    return visibleNodeIds.has(edge.from) && visibleNodeIds.has(edge.to);
  });

  const structuralEdges = folderEnabled && nestsEnabled
    ? buildContainmentEdges(folderPaths, visibleBaseNodes.filter((node) => getResolvedNodeType(node) === 'file'))
    : [];

  const edges = [...semanticEdges, ...structuralEdges];
  const nextEdgeDecorations = Object.fromEntries(
    edges.map((edge) => [
      edge.id,
      {
        color: edgeColors[edge.kind],
      },
    ]),
  ) as Record<string, EdgeDecorationPayload>;

  return {
    graphData: {
      nodes,
      edges,
    },
    edgeDecorations: {
      ...nextEdgeDecorations,
      ...edgeDecorations,
    },
  };
}
