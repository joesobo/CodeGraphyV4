import type { SearchOptions } from '../components/searchBar/field/model';
import { globMatch } from '../globMatch';
import { filterNodesAdvanced } from './matching';
import { DEFAULT_NODE_COLOR } from '../../shared/fileColors';
import type { IGraphData } from '../../shared/graph/types';
import type { IGroup } from '../../shared/settings/groups';

export { filterNodesAdvanced } from './matching';

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
