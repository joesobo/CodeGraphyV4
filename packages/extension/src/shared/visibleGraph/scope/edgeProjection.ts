import type { IGraphData } from '../../graph/contracts';
import { getVisibleEdgeEndpoint } from './edgeEndpointProjection';

export function projectEdgesToVisibleNodes(
  edges: IGraphData['edges'],
  graphNodes: IGraphData['nodes'],
  visibleNodes: IGraphData['nodes'],
): IGraphData['edges'] {
  const allNodeById = new Map(graphNodes.map((node) => [node.id, node]));
  const visibleNodeIds = new Set(visibleNodes.map((node) => node.id));
  const projectedEdges: IGraphData['edges'] = [];

  for (const edge of edges) {
    const projectedEdge = projectEdgeToVisibleNodes(edge, allNodeById, visibleNodeIds);
    if (projectedEdge) {
      projectedEdges.push(projectedEdge);
    }
  }

  return projectedEdges;
}

function projectEdgeToVisibleNodes(
  edge: IGraphData['edges'][number],
  allNodeById: ReadonlyMap<string, IGraphData['nodes'][number]>,
  visibleNodeIds: ReadonlySet<string>,
): IGraphData['edges'][number] | undefined {
  if (edge.kind === 'contains') {
    return edge;
  }

  const from = getVisibleEdgeEndpoint(edge.from, allNodeById, visibleNodeIds);
  const to = getVisibleEdgeEndpoint(edge.to, allNodeById, visibleNodeIds);
  if (!from || !to) {
    return undefined;
  }

  if (from === edge.from && to === edge.to) {
    return edge;
  }

  return {
    ...edge,
    id: `${from}->${to}${getEdgeKindSuffix(edge)}`,
    from,
    to,
  };
}

function getEdgeKindSuffix(edge: IGraphData['edges'][number]): string {
  const marker = edge.id.lastIndexOf('#');
  return marker >= 0 ? edge.id.slice(marker) : `#${edge.kind}`;
}
