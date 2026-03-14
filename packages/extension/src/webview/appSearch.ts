import { DEFAULT_NODE_COLOR, IGraphData, IGraphNode, IGroup } from '../shared/types';
import type { SearchOptions } from './components/SearchBar';
import { globMatch } from './lib/globMatch';

export function filterNodesAdvanced(
  nodes: IGraphNode[],
  query: string,
  options: SearchOptions,
): { matchingIds: Set<string>; regexError: string | null } {
  const matchingIds = new Set<string>();
  let regexError: string | null = null;

  if (!query.trim()) {
    nodes.forEach((node) => matchingIds.add(node.id));
    return { matchingIds, regexError };
  }

  let pattern: RegExp | null = null;

  if (options.regex) {
    try {
      const flags = options.matchCase ? '' : 'i';
      pattern = new RegExp(query, flags);
    } catch (error) {
      regexError = error instanceof Error ? error.message : 'Invalid regex';
      return { matchingIds, regexError };
    }
  } else if (options.wholeWord) {
    const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const flags = options.matchCase ? '' : 'i';
    pattern = new RegExp(`\\b${escaped}\\b`, flags);
  }

  for (const node of nodes) {
    const searchText = `${node.label} ${node.id}`;
    let isMatch = false;

    if (pattern) {
      isMatch = pattern.test(searchText);
    } else {
      const normalizedText = options.matchCase ? searchText : searchText.toLowerCase();
      const normalizedQuery = options.matchCase ? query : query.toLowerCase();
      isMatch = normalizedText.includes(normalizedQuery);
    }

    if (isMatch) {
      matchingIds.add(node.id);
    }
  }

  return { matchingIds, regexError };
}

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

export function applyGroupColors(
  data: IGraphData | null,
  groups: IGroup[],
): IGraphData | null {
  if (!data) {
    return null;
  }

  if (groups.length === 0) {
    return data;
  }

  return {
    ...data,
    nodes: data.nodes.map((node) => {
      for (const group of groups) {
        if (!group.disabled && globMatch(node.id, group.pattern)) {
          return {
            ...node,
            color: group.color,
            shape2D: group.shape2D,
            shape3D: group.shape3D,
            imageUrl: group.imageUrl,
          };
        }
      }

      return { ...node, color: node.color || DEFAULT_NODE_COLOR };
    }),
  };
}
