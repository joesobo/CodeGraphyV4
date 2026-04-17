import type { SearchOptions } from '../../components/searchBar/field/model';
import type { IGraphData } from '../../../shared/graph/contracts';
import { filterNodesAdvanced } from '../matching';

export function filterGraphData(
  graphData: IGraphData | null,
  searchQuery: string,
  searchOptions: SearchOptions,
): { filteredData: IGraphData | null; regexError: string | null } {
  if (!graphData) {
    return { filteredData: null, regexError: null };
  }

  if (!searchQuery.trim()) {
    return { filteredData: graphData, regexError: null };
  }

  const result = filterNodesAdvanced(graphData.nodes, searchQuery, searchOptions);
  const filteredNodes = graphData.nodes.filter((node) => result.matchingIds.has(node.id));
  const filteredEdges = graphData.edges.filter(
    (edge) => result.matchingIds.has(edge.from) && result.matchingIds.has(edge.to),
  );

  return {
    filteredData: { nodes: filteredNodes, edges: filteredEdges },
    regexError: result.regexError,
  };
}
