import type { IGraphData } from '../graph/contracts';
import type { VisibleGraphFilterConfig } from './contracts';
import { filterEdgesToNodes } from './model';
import {
  compileFilterPatterns,
  edgeMatchesPattern,
  getDirectEdgePatternMatchers,
  nodeMatchesPattern,
} from './filterPatterns';

export function applyFilterPatterns(
  graphData: IGraphData,
  filter: VisibleGraphFilterConfig,
): IGraphData {
  if (filter.patterns.length === 0) {
    return graphData;
  }

  const compiledPatterns = compileFilterPatterns(filter.patterns);
  const nodes = graphData.nodes.filter(
    (node) => !compiledPatterns.some(({ matches }) => nodeMatchesPattern(node, matches)),
  );
  const nodeFilteredEdges = filterEdgesToNodes(graphData.edges, nodes);
  const edgePatternMatchers = getDirectEdgePatternMatchers(compiledPatterns);
  if (edgePatternMatchers.length === 0) {
    return { nodes, edges: nodeFilteredEdges };
  }

  const edges = nodeFilteredEdges.filter(
    (edge) => !edgePatternMatchers.some((matches) => edgeMatchesPattern(edge, matches)),
  );

  return { nodes, edges };
}
