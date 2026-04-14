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

function getFileNodes(nodes: IGraphNode[]): IGraphNode[] {
  return nodes.filter((node) => getResolvedNodeType(node) === 'file');
}

function filterSemanticEdges(
  edges: IGraphData['edges'],
  visibleNodeIds: Set<string>,
  edgeVisibility: Record<string, boolean>,
): IGraphData['edges'] {
  return edges.filter((edge) =>
    (edgeVisibility[edge.kind] ?? true)
    && visibleNodeIds.has(edge.from)
    && visibleNodeIds.has(edge.to),
  );
}

function filterVisibleStructuralEdges(
  edges: IGraphData['edges'],
  visibleNodeIds: Set<string>,
): IGraphData['edges'] {
  return edges.filter((edge) => visibleNodeIds.has(edge.from) && visibleNodeIds.has(edge.to));
}

function buildStructuralGraphNodes(
  fileNodes: IGraphNode[],
  nodeVisibility: Record<string, boolean>,
  nodeColors: Record<string, string>,
): {
  folderPaths: Set<string>;
  folderNodes: IGraphNode[];
  packageNodes: IGraphNode[];
  workspacePackageRoots: Set<string>;
} {
  const folderEnabled = nodeVisibility.folder ?? false;
  const packageEnabled = nodeVisibility.package ?? false;
  const folderPaths = folderEnabled ? collectFolderPaths(fileNodes).paths : new Set<string>();
  const workspacePackageRoots = packageEnabled
    ? collectWorkspacePackageRoots(fileNodes)
    : new Set<string>();

  return {
    folderPaths,
    folderNodes: folderEnabled
      ? createFolderNodes(folderPaths, nodeColors.folder ?? DEFAULT_FOLDER_NODE_COLOR)
      : [],
    packageNodes: packageEnabled
      ? createWorkspacePackageNodes(
          workspacePackageRoots,
          nodeColors.package ?? DEFAULT_PACKAGE_NODE_COLOR,
        )
      : [],
    workspacePackageRoots,
  };
}

function buildStructuralEdges(
  visibleFileNodes: IGraphNode[],
  nodeVisibility: Record<string, boolean>,
  edgeVisibility: Record<string, boolean>,
  folderPaths: Set<string>,
  workspacePackageRoots: Set<string>,
): IGraphData['edges'] {
  const folderEnabled = nodeVisibility.folder ?? false;
  const packageEnabled = nodeVisibility.package ?? false;
  const nestsEnabled = edgeVisibility[STRUCTURAL_NESTS_EDGE_KIND] ?? true;

  if (!nestsEnabled) {
    return [];
  }

  return [
    ...(folderEnabled ? buildContainmentEdges(folderPaths, visibleFileNodes) : []),
    ...(packageEnabled ? buildWorkspacePackageEdges(workspacePackageRoots, visibleFileNodes) : []),
  ];
}

function mergeEdgeDecorations(
  edges: IGraphData['edges'],
  edgeColors: Record<string, string>,
  edgeDecorations?: Record<string, EdgeDecorationPayload>,
): Record<string, EdgeDecorationPayload> {
  return Object.fromEntries(
    edges.map((edge) => {
      const existingDecoration = edgeDecorations?.[edge.id] ?? {};
      return [
        edge.id,
        {
          ...existingDecoration,
          color: edgeColors[edge.kind] ?? existingDecoration.color,
        },
      ];
    }),
  ) as Record<string, EdgeDecorationPayload>;
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
