import type { IGraphEdge, IGraphNode } from '../graph/contracts';
import { filterEdgesToNodes } from './model';

export function projectCollapsedEdges(
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
