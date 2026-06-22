import type { IGraphData } from '../graph/contracts';
import { createGlobMatcher } from '../globMatch';
import type { VisibleGraphFilterConfig } from './contracts';
import { filterEdgesToNodes } from './model';

type GlobMatcher = ReturnType<typeof createGlobMatcher>;
interface CompiledFilterPattern {
  matches: GlobMatcher;
  pattern: string;
}

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

function compileFilterPatterns(patterns: readonly string[]): CompiledFilterPattern[] {
  return patterns.map(pattern => ({
    matches: createGlobMatcher(pattern),
    pattern,
  }));
}

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
  const edgePatternMatchers = compiledPatterns
    .filter(({ pattern }) => canFilterEdgeDirectly(pattern))
    .map(({ matches }) => matches);
  if (edgePatternMatchers.length === 0) {
    return { nodes, edges: nodeFilteredEdges };
  }

  const edges = nodeFilteredEdges.filter(
    (edge) => !edgePatternMatchers.some((matches) => edgeMatchesPattern(edge, matches)),
  );

  return { nodes, edges };
}
