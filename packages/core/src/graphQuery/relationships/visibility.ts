import type { GraphEdgeKind, IGraphEdge } from '../../graph/contracts';
import type { GraphQueryData } from '../data';
import type { GraphQueryConnectionConfig } from '../model';
import {
  applySearchAndOrphans,
  deriveScopedGraphQueryData,
  filterEdgesToReportNodes,
} from '../visible';

export function edgeKey(edge: Pick<IGraphEdge, 'from' | 'kind' | 'to'>): string {
  return `${edge.from}\u0000${edge.to}\u0000${edge.kind}`;
}

export function applyDomainConnectionFilters<T extends { from: string; to: string; kind: GraphEdgeKind }>(
  items: readonly T[],
  config: GraphQueryConnectionConfig,
): T[] {
  return items.filter((item) => {
    if (config.from && item.from !== config.from) {
      return false;
    }
    if (config.to && item.to !== config.to) {
      return false;
    }
    if (config.edgeType && item.kind !== config.edgeType) {
      return false;
    }
    return true;
  });
}

export function createVisibleEdgeSet(data: GraphQueryData, config: GraphQueryConnectionConfig): Set<string> {
  const scopedGraph = deriveScopedGraphQueryData(data.graphData, config);
  const domainFilteredEdges = applyDomainConnectionFilters(
    filterEdgesToReportNodes(scopedGraph.edges, scopedGraph.nodes),
    config,
  );
  const visibleGraph = applySearchAndOrphans({
    nodes: scopedGraph.nodes,
    edges: domainFilteredEdges,
  }, config);

  return new Set(filterEdgesToReportNodes(visibleGraph.edges, visibleGraph.nodes).map(edgeKey));
}
