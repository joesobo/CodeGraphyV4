import type { IGraphData } from '../graph/contracts';
import { createCombinedGlobMatcher } from '../globMatch';
import type { VisibleGraphFilterConfig } from './contracts';
import { filterEdgesToNodes } from './model';

type GlobMatcher = ReturnType<typeof createCombinedGlobMatcher>;

function nodeMatchesPattern(node: IGraphData['nodes'][number], matches: GlobMatcher): boolean {
  return matches(node.id)
    || (node.symbol?.filePath ? matches(node.symbol.filePath) : false);
}

function edgeMatchesPattern(edge: IGraphData['edges'][number], matches: GlobMatcher): boolean {
  return (
    matches(edge.id)
    || matches(edge.kind)
    || matches(`${edge.from}->${edge.to}`)
    || matches(`${edge.from}->${edge.to}#${edge.kind}`)
  );
}

function canFilterEdgeDirectly(pattern: string): boolean {
  return pattern.includes('->')
    || pattern.includes('#')
    || (!pattern.includes('*') && !pattern.includes('/'));
}

export function applyFilterPatterns(
  graphData: IGraphData,
  filter: VisibleGraphFilterConfig,
): IGraphData {
  if (filter.patterns.length === 0) {
    return graphData;
  }

  const nodePatternMatcher = createCombinedGlobMatcher(filter.patterns);
  const nodes = graphData.nodes.filter(
    (node) => !nodeMatchesPattern(node, nodePatternMatcher),
  );
  const nodeFilteredEdges = filterEdgesToNodes(graphData.edges, nodes);
  const directEdgePatterns = filter.patterns.filter(canFilterEdgeDirectly);
  if (directEdgePatterns.length === 0) {
    return { nodes, edges: nodeFilteredEdges };
  }

  const edgePatternMatcher = createCombinedGlobMatcher(directEdgePatterns);
  const edges = nodeFilteredEdges.filter(
    (edge) => !edgeMatchesPattern(edge, edgePatternMatcher),
  );

  return { nodes, edges };
}
