import type { GraphEdgeKind, IGraphEdge } from '../graph/contracts';
import type { GraphQueryEdgeReportItem } from './model';

export function readEdgeValue(edge: IGraphEdge, field: string): string | readonly string[] {
  switch (field) {
    case 'from':
      return edge.from;
    case 'to':
      return edge.to;
    case 'edgeType':
    case 'edgeTypes':
      return edge.kind;
    default:
      return '';
  }
}

function edgeGroupKey(edge: IGraphEdge): string {
  return `${edge.from}\u0000${edge.to}`;
}

export function groupEdges(edges: readonly IGraphEdge[]): GraphQueryEdgeReportItem[] {
  const groups = new Map<string, GraphQueryEdgeReportItem>();

  for (const edge of edges) {
    const key = edgeGroupKey(edge);
    const group = groups.get(key);

    if (group) {
      if (!group.edgeTypes.includes(edge.kind)) {
        group.edgeTypes.push(edge.kind);
      }
      continue;
    }

    groups.set(key, {
      from: edge.from,
      to: edge.to,
      edgeTypes: [edge.kind],
    });
  }

  return [...groups.values()];
}

export function readEdgeReportValue(item: GraphQueryEdgeReportItem, field: string): string | readonly GraphEdgeKind[] {
  switch (field) {
    case 'from':
      return item.from;
    case 'to':
      return item.to;
    case 'edgeType':
    case 'edgeTypes':
      return item.edgeTypes;
    default:
      return '';
  }
}
