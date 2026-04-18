import { globMatch } from '../../globMatch';
import type { IGraphData } from '../../../shared/graph/contracts';

export function applyFilterPatterns(
  graphData: IGraphData | null,
  filterPatterns: readonly string[],
): IGraphData | null {
  if (!graphData || filterPatterns.length === 0) {
    return graphData;
  }

  const visibleNodes = graphData.nodes.filter(
    node => !filterPatterns.some(pattern => globMatch(node.id, pattern)),
  );
  const visibleNodeIds = new Set(visibleNodes.map(node => node.id));
  const visibleEdges = graphData.edges.filter(
    edge => visibleNodeIds.has(edge.from) && visibleNodeIds.has(edge.to),
  );

  return {
    nodes: visibleNodes,
    edges: visibleEdges,
  };
}
