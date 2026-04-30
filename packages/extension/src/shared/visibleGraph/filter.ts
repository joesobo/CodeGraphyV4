import type { IGraphData } from '../graph/contracts';
import { globMatch } from '../globMatch';
import type { VisibleGraphFilterConfig } from './contracts';
import { filterEdgesToNodes } from './model';

function edgeMatchesPattern(edge: IGraphData['edges'][number], pattern: string): boolean {
  return (
    globMatch(edge.id, pattern)
    || globMatch(edge.kind, pattern)
    || globMatch(`${edge.from}->${edge.to}`, pattern)
    || globMatch(`${edge.from}->${edge.to}#${edge.kind}`, pattern)
  );
}

export function applyFilterPatterns(
  graphData: IGraphData,
  filter: VisibleGraphFilterConfig,
): IGraphData {
  if (filter.patterns.length === 0) {
    return graphData;
  }

  const nodes = graphData.nodes.filter(
    (node) => !filter.patterns.some((pattern) => globMatch(node.id, pattern)),
  );
  const nodeFilteredEdges = filterEdgesToNodes(graphData.edges, nodes);
  const edges = nodeFilteredEdges.filter(
    (edge) => !filter.patterns.some((pattern) => edgeMatchesPattern(edge, pattern)),
  );

  return { nodes, edges };
}
