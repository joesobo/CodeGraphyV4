import type { IGraphData } from '../graph/contracts';
import type { VisibleGraphSearchConfig } from './contracts';
import { filterEdgesToNodes } from './model';
import { collectMatchingNodeIds } from './searchQuery/matching';
import { normalizeSearchOptions } from './searchQuery/options';

export function applySearch(
  graphData: IGraphData,
  search: VisibleGraphSearchConfig,
): { graphData: IGraphData; regexError: string | null } {
  if (!search.query.trim()) {
    return { graphData, regexError: null };
  }

  const { matchingIds, regexError } = collectMatchingNodeIds(
    graphData.nodes,
    search.query,
    normalizeSearchOptions(search.options),
  );
  const nodes = graphData.nodes.filter((node) => matchingIds.has(node.id));

  return {
    graphData: {
      nodes,
      edges: filterEdgesToNodes(graphData.edges, nodes),
    },
    regexError,
  };
}
