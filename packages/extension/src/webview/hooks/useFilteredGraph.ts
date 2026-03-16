/**
 * @fileoverview Hook for filtering and coloring graph data based on search and groups.
 */

import { useMemo } from 'react';
import { globMatch } from '../lib/globMatch';
import { filterNodesAdvanced } from '../lib/nodeMatching';
import { IGraphData, IGroup, DEFAULT_NODE_COLOR } from '../../shared/types';
import type { SearchOptions } from '../components/SearchBar';

export interface UseFilteredGraphResult {
  filteredData: IGraphData | null;
  coloredData: IGraphData | null;
  regexError: string | null;
}

/**
 * Filters graph data by the current search query, then applies group colors.
 */
export function useFilteredGraph(
  graphData: IGraphData | null,
  searchQuery: string,
  searchOptions: SearchOptions,
  groups: IGroup[],
): UseFilteredGraphResult {
  const { filteredData, regexError } = useMemo((): { filteredData: IGraphData | null; regexError: string | null } => {
    if (!graphData) return { filteredData: null, regexError: null };
    if (!searchQuery.trim()) return { filteredData: graphData, regexError: null };

    const result = filterNodesAdvanced(graphData.nodes, searchQuery, searchOptions);
    const matchingNodeIds = result.matchingIds;
    const error = result.regexError;

    const filteredNodes = graphData.nodes.filter(node => matchingNodeIds.has(node.id));
    const filteredEdges = graphData.edges.filter(
      edge => matchingNodeIds.has(edge.from) && matchingNodeIds.has(edge.to)
    );

    return { filteredData: { nodes: filteredNodes, edges: filteredEdges }, regexError: error };
  }, [graphData, searchQuery, searchOptions]);

  const coloredData = useMemo((): IGraphData | null => {
    const base = filteredData;
    if (!base) return null;
    if (groups.length === 0) return base;

    const coloredNodes = base.nodes.map(node => {
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
    });

    return { ...base, nodes: coloredNodes };
  }, [filteredData, groups]);

  return { filteredData, coloredData, regexError };
}
