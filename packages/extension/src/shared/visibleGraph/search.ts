import type { IGraphData, IGraphNode } from '../graph/contracts';
import type { VisibleGraphSearchConfig, VisibleGraphSearchOptions } from './contracts';
import { filterEdgesToNodes } from './model';

function normalizeOptions(options: VisibleGraphSearchOptions | undefined): Required<VisibleGraphSearchOptions> {
  return {
    matchCase: options?.matchCase ?? false,
    wholeWord: options?.wholeWord ?? false,
    regex: options?.regex ?? false,
  };
}

function compilePattern(
  query: string,
  options: Required<VisibleGraphSearchOptions>,
): { pattern: RegExp | null; regexError: string | null } {
  if (options.regex) {
    try {
      const flags = options.matchCase ? '' : 'i';
      return { pattern: new RegExp(query, flags), regexError: null };
    } catch (error) {
      return {
        pattern: null,
        regexError: error instanceof Error ? error.message : 'Invalid regex',
      };
    }
  }

  if (options.wholeWord) {
    const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const flags = options.matchCase ? '' : 'i';
    return { pattern: new RegExp(`\\b${escaped}\\b`, flags), regexError: null };
  }

  return { pattern: null, regexError: null };
}

function getMatchingNodeIds(
  nodes: IGraphNode[],
  query: string,
  options: Required<VisibleGraphSearchOptions>,
): { matchingIds: Set<string>; regexError: string | null } {
  const matchingIds = new Set<string>();

  if (!query.trim()) {
    nodes.forEach((node) => matchingIds.add(node.id));
    return { matchingIds, regexError: null };
  }

  const { pattern, regexError } = compilePattern(query, options);
  if (regexError !== null) {
    return { matchingIds, regexError };
  }

  for (const node of nodes) {
    const searchText = `${node.label} ${node.id}`;
    const isMatch = pattern
      ? pattern.test(searchText)
      : (options.matchCase ? searchText : searchText.toLowerCase())
          .includes(options.matchCase ? query : query.toLowerCase());

    if (isMatch) {
      matchingIds.add(node.id);
    }
  }

  return { matchingIds, regexError: null };
}

export function applySearch(
  graphData: IGraphData,
  search: VisibleGraphSearchConfig,
): { graphData: IGraphData; regexError: string | null } {
  if (!search.query.trim()) {
    return { graphData, regexError: null };
  }

  const { matchingIds, regexError } = getMatchingNodeIds(
    graphData.nodes,
    search.query,
    normalizeOptions(search.options),
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
