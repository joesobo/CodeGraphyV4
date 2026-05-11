import type { IGraphData, IGraphEdge, IGraphNode } from '../graph/contracts';
import type { VisibleGraphCollapseConfig } from './contracts';
import { filterEdgesToNodes, FOLDER_NODE_TYPE, getNodeType } from './model';

export function applyCollapseProjection(
  graphData: IGraphData,
  config?: VisibleGraphCollapseConfig,
): IGraphData {
  const folderIds = new Set(
    graphData.nodes
      .filter((node) => getNodeType(node) === FOLDER_NODE_TYPE)
      .map((node) => node.id),
  );
  const collapsedFolderIds = new Set(
    (config?.collapsedNodeIds ?? []).filter((nodeId) => folderIds.has(nodeId)),
  );

  if (collapsedFolderIds.size === 0) {
    return annotateCollapsibleFolders(graphData, folderIds);
  }

  const hiddenByNodeId = new Map<string, string>();
  const nodes = graphData.nodes
    .filter((node) => {
      const ownerId = findVisibleCollapsedAncestor(node.id, collapsedFolderIds);
      if (!ownerId || ownerId === node.id) {
        return true;
      }

      hiddenByNodeId.set(node.id, ownerId);
      return false;
    })
    .map((node) => annotateFolderNode(node, folderIds, graphData.nodes, collapsedFolderIds, hiddenByNodeId));

  return {
    nodes,
    edges: projectCollapsedEdges(graphData.edges, nodes, hiddenByNodeId),
  };
}

function annotateCollapsibleFolders(graphData: IGraphData, folderIds: ReadonlySet<string>): IGraphData {
  return {
    nodes: graphData.nodes.map((node) => annotateFolderNode(node, folderIds, graphData.nodes, new Set(), new Map())),
    edges: graphData.edges,
  };
}

function annotateFolderNode(
  node: IGraphNode,
  folderIds: ReadonlySet<string>,
  sourceNodes: readonly IGraphNode[],
  collapsedFolderIds: ReadonlySet<string>,
  hiddenByNodeId: ReadonlyMap<string, string>,
): IGraphNode {
  if (!folderIds.has(node.id)) {
    return node;
  }

  const collapsedDescendantCount = countCollapsedDescendants(node.id, hiddenByNodeId);
  const nextNode: IGraphNode = {
    ...node,
    isCollapsible: hasDescendant(node.id, sourceNodes),
    isCollapsed: collapsedFolderIds.has(node.id),
  };

  if (nextNode.isCollapsed) {
    nextNode.collapsedDescendantCount = collapsedDescendantCount;
  }

  return nextNode;
}

function countCollapsedDescendants(
  folderId: string,
  hiddenByNodeId: ReadonlyMap<string, string>,
): number {
  let count = 0;
  for (const ownerId of hiddenByNodeId.values()) {
    if (ownerId === folderId) {
      count += 1;
    }
  }

  return count;
}

function hasDescendant(folderId: string, nodes: readonly IGraphNode[]): boolean {
  return nodes.some((node) => isDescendantOf(folderId, node.id));
}

function projectCollapsedEdges(
  edges: readonly IGraphEdge[],
  nodes: readonly IGraphNode[],
  hiddenByNodeId: ReadonlyMap<string, string>,
): IGraphEdge[] {
  const visibleNodeIds = new Set(nodes.map((node) => node.id));
  const projectedEdges = new Map<string, IGraphEdge>();

  for (const edge of edges) {
    const from = resolveProjectedEndpoint(edge.from, visibleNodeIds, hiddenByNodeId);
    const to = resolveProjectedEndpoint(edge.to, visibleNodeIds, hiddenByNodeId);
    if (!from || !to || from === to) {
      continue;
    }

    const projectedEdge = {
      ...edge,
      id: `${from}->${to}#${edge.kind}`,
      from,
      to,
    };
    mergeProjectedEdge(projectedEdges, projectedEdge);
  }

  return filterEdgesToNodes(Array.from(projectedEdges.values()), nodes);
}

function resolveProjectedEndpoint(
  nodeId: string,
  visibleNodeIds: ReadonlySet<string>,
  hiddenByNodeId: ReadonlyMap<string, string>,
): string | undefined {
  return visibleNodeIds.has(nodeId)
    ? nodeId
    : hiddenByNodeId.get(nodeId);
}

function mergeProjectedEdge(edges: Map<string, IGraphEdge>, edge: IGraphEdge): void {
  const existing = edges.get(edge.id);
  if (!existing) {
    edges.set(edge.id, { ...edge, sources: [...edge.sources] });
    return;
  }

  existing.sources = mergeEdgeSources(existing.sources, edge.sources);
  existing.color ??= edge.color;
}

function mergeEdgeSources(
  currentSources: IGraphEdge['sources'],
  nextSources: IGraphEdge['sources'],
): IGraphEdge['sources'] {
  const sourceIds = new Set(currentSources.map((source) => source.id));
  const merged = [...currentSources];
  for (const source of nextSources) {
    if (!sourceIds.has(source.id)) {
      merged.push(source);
      sourceIds.add(source.id);
    }
  }

  return merged;
}

function findVisibleCollapsedAncestor(
  nodeId: string,
  collapsedFolderIds: ReadonlySet<string>,
): string | undefined {
  return Array.from(collapsedFolderIds)
    .filter((folderId) => folderId === nodeId || isDescendantOf(folderId, nodeId))
    .sort((left, right) => getPathDepth(left) - getPathDepth(right))[0];
}

function isDescendantOf(folderId: string, nodeId: string): boolean {
  if (folderId === nodeId) {
    return false;
  }

  if (folderId === '(root)') {
    return nodeId !== '(root)';
  }

  return nodeId.startsWith(`${folderId}/`);
}

function getPathDepth(nodeId: string): number {
  return nodeId === '(root)' ? 0 : nodeId.split('/').length;
}
