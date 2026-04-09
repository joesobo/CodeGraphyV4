import {
  buildContainmentEdges,
  collectFolderPaths,
  createFolderNodes,
} from '../../shared/graphControls/nests';
import {
  buildWorkspacePackageEdges,
  collectWorkspacePackageRoots,
  createWorkspacePackageNodes,
} from '../../shared/graphControls/packages';
import type { EdgeDecorationPayload } from '../../shared/plugins/decorations';
import type { IGraphData, IGraphNode } from '../../shared/graph/types';
import { STRUCTURAL_NESTS_EDGE_KIND } from '../../shared/graphControls/defaults';
import {
  DEFAULT_FOLDER_NODE_COLOR,
  DEFAULT_PACKAGE_NODE_COLOR,
} from '../../shared/fileColors';

export interface GraphControlsFilteringOptions {
  graphData: IGraphData | null;
  nodeColors: Record<string, string>;
  nodeVisibility: Record<string, boolean>;
  edgeVisibility: Record<string, boolean>;
  edgeColors: Record<string, string>;
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

function applyNodeTypeColors(
  nodes: IGraphNode[],
  nodeColors: Record<string, string>,
): IGraphNode[] {
  return nodes.map((node) => ({
    ...node,
    color: nodeColors[getResolvedNodeType(node)] ?? node.color,
  }));
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
  const folderEnabled = nodeVisibility.folder ?? false;
  const packageEnabled = nodeVisibility.package ?? false;
  const nestsEnabled = edgeVisibility[STRUCTURAL_NESTS_EDGE_KIND] ?? true;

  const fileNodes = baseNodes.filter((node) => getResolvedNodeType(node) === 'file');
  const folderPaths = folderEnabled ? collectFolderPaths(fileNodes).paths : new Set<string>();
  const folderNodes = folderEnabled
    ? createFolderNodes(folderPaths, nodeColors.folder ?? DEFAULT_FOLDER_NODE_COLOR)
    : [];
  const workspacePackageRoots = packageEnabled
    ? collectWorkspacePackageRoots(fileNodes)
    : new Set<string>();
  const packageNodes = packageEnabled
    ? createWorkspacePackageNodes(
      workspacePackageRoots,
      nodeColors.package ?? DEFAULT_PACKAGE_NODE_COLOR,
    )
    : [];

  const nodes = [...visibleBaseNodes, ...folderNodes, ...packageNodes];
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
  const packageEdges = packageEnabled && nestsEnabled
    ? buildWorkspacePackageEdges(
      workspacePackageRoots,
      visibleBaseNodes.filter((node) => getResolvedNodeType(node) === 'file'),
    )
    : [];

  const edges = [...semanticEdges, ...structuralEdges, ...packageEdges];
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
