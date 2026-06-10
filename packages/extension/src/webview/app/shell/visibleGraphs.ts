import { useMemo } from 'react';
import { deriveVisibleGraph } from '../../../shared/visibleGraph';
import type { GraphState } from '../../store/state';
import { buildVisibleGraphConfig } from '../../search/visibleGraphConfig';

interface ShellVisibleGraphsInput {
  activeFilterPatterns: string[];
  edgeVisibility: GraphState['edgeVisibility'];
  filteredData: GraphState['graphData'];
  graphData: GraphState['graphData'];
  graphEdgeTypes: GraphState['graphEdgeTypes'];
  graphNodeTypes: GraphState['graphNodeTypes'];
  nodeVisibility: GraphState['nodeVisibility'];
  searchQuery: string;
  searchOptions: GraphState['searchOptions'];
  showOrphans: GraphState['showOrphans'];
}

function deriveShellVisibleGraph(
  input: Omit<ShellVisibleGraphsInput, 'activeFilterPatterns' | 'filteredData' | 'searchQuery'>,
  filterPatterns: string[],
) {
  return deriveVisibleGraph(input.graphData, buildVisibleGraphConfig({
    edgeTypes: input.graphEdgeTypes,
    edgeVisibility: input.edgeVisibility,
    filterPatterns,
    nodeTypes: input.graphNodeTypes,
    nodeVisibility: input.nodeVisibility,
    searchOptions: input.searchOptions,
    searchQuery: '',
    showOrphans: input.showOrphans,
  })).graphData;
}

export function useShellVisibleGraphs({
  activeFilterPatterns,
  edgeVisibility,
  filteredData,
  graphData,
  graphEdgeTypes,
  graphNodeTypes,
  nodeVisibility,
  searchQuery,
  searchOptions,
  showOrphans,
}: ShellVisibleGraphsInput) {
  const hasActiveFilters = activeFilterPatterns.length > 0;
  const hasSearchQuery = searchQuery.trim().length > 0;

  const countBaseData = useMemo(
    () => {
      if (!hasActiveFilters && !hasSearchQuery) {
        return filteredData;
      }

      return deriveShellVisibleGraph({
        edgeVisibility,
        graphData,
        graphEdgeTypes,
        graphNodeTypes,
        nodeVisibility,
        searchOptions,
        showOrphans,
      }, []);
    },
    [
      edgeVisibility,
      filteredData,
      graphData,
      graphEdgeTypes,
      graphNodeTypes,
      hasActiveFilters,
      hasSearchQuery,
      nodeVisibility,
      searchOptions,
      showOrphans,
    ],
  );
  const filterVisibleData = useMemo(
    () => {
      if (!hasSearchQuery) {
        return filteredData;
      }

      if (!hasActiveFilters) {
        return countBaseData;
      }

      return deriveShellVisibleGraph({
        edgeVisibility,
        graphData,
        graphEdgeTypes,
        graphNodeTypes,
        nodeVisibility,
        searchOptions,
        showOrphans,
      }, activeFilterPatterns);
    },
    [
      activeFilterPatterns,
      countBaseData,
      edgeVisibility,
      filteredData,
      graphData,
      graphEdgeTypes,
      graphNodeTypes,
      hasActiveFilters,
      hasSearchQuery,
      nodeVisibility,
      searchOptions,
      showOrphans,
    ],
  );

  return {
    countBaseData,
    filterVisibleData,
  };
}
