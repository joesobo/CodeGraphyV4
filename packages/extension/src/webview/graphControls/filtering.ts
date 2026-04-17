import type { EdgeDecorationPayload } from '../../shared/plugins/decorations';
import type { IGraphData } from '../../shared/graph/contracts';
import { filterSemanticEdges, filterVisibleStructuralEdges, mergeEdgeDecorations } from './filtering/edges';
import { applyNodeTypeColors, getFileNodes, isNodeVisible, withResolvedNodeTypes } from './filtering/nodes';
import { buildStructuralEdges, buildStructuralGraphNodes } from './filtering/structures';

export interface GraphControlsFilteringOptions {
  graphData: IGraphData | null;
  nodeColors: Record<string, string>;
  nodeVisibility: Record<string, boolean>;
  edgeVisibility: Record<string, boolean>;
  edgeColors: Record<string, string>;
  edgeDecorations?: Record<string, EdgeDecorationPayload>;
}

export function applyGraphControls({
  graphData,
  nodeColors,
  nodeVisibility,
  edgeVisibility,
  edgeColors,
  edgeDecorations,
}: GraphControlsFilteringOptions): {
  graphData: IGraphData | null;
  edgeDecorations: Record<string, EdgeDecorationPayload> | undefined;
} {
  if (!graphData) {
    return { graphData: null, edgeDecorations };
  }

  const baseNodes = applyNodeTypeColors(withResolvedNodeTypes(graphData.nodes), nodeColors);
  const visibleBaseNodes = baseNodes.filter((node) => isNodeVisible(node, nodeVisibility));
  const {
    folderPaths,
    folderNodes,
    packageNodes,
    workspacePackageRoots,
  } = buildStructuralGraphNodes(getFileNodes(baseNodes), nodeVisibility, nodeColors);

  const nodes = [...visibleBaseNodes, ...folderNodes, ...packageNodes];
  const visibleNodeIds = new Set(nodes.map((node) => node.id));
  const visibleFileNodes = getFileNodes(visibleBaseNodes);
  const semanticEdges = filterSemanticEdges(graphData.edges, visibleNodeIds, edgeVisibility);
  const visibleStructuralEdges = filterVisibleStructuralEdges(
    buildStructuralEdges(
      visibleFileNodes,
      nodeVisibility,
      edgeVisibility,
      folderPaths,
      workspacePackageRoots,
    ),
    visibleNodeIds,
  );

  const edges = [...semanticEdges, ...visibleStructuralEdges];
  const nextEdgeDecorations = mergeEdgeDecorations(
    edges,
    edgeColors,
    edgeDecorations,
  );

  return {
    graphData: {
      nodes,
      edges,
    },
    edgeDecorations: nextEdgeDecorations,
  };
}
