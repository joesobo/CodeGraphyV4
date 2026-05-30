import { useMemo } from 'react';
import { buildGraphModel } from '@codegraphy-dev/core/graphModel';
import type { GraphState } from '../../store/state';
import { buildVisibleGraphConfig } from '../../search/visibleGraphConfig';

interface ShellVisibleGraphsInput {
  activeFilterPatterns: string[];
  edgeVisibility: GraphState['edgeVisibility'];
  graphData: GraphState['graphData'];
  graphEdgeTypes: GraphState['graphEdgeTypes'];
  nodeVisibility: GraphState['nodeVisibility'];
  searchOptions: GraphState['searchOptions'];
  showOrphans: GraphState['showOrphans'];
}

function deriveShellVisibleGraph(
  input: Omit<ShellVisibleGraphsInput, 'activeFilterPatterns'>,
  filterPatterns: string[],
) {
  return buildGraphModel(input.graphData, buildVisibleGraphConfig({
    edgeTypes: input.graphEdgeTypes,
    edgeVisibility: input.edgeVisibility,
    filterPatterns,
    nodeVisibility: input.nodeVisibility,
    searchOptions: input.searchOptions,
    searchQuery: '',
    showOrphans: input.showOrphans,
  })).graphData;
}

export function useShellVisibleGraphs({
  activeFilterPatterns,
  edgeVisibility,
  graphData,
  graphEdgeTypes,
  nodeVisibility,
  searchOptions,
  showOrphans,
}: ShellVisibleGraphsInput) {
  const countBaseData = useMemo(
    () => deriveShellVisibleGraph({
      edgeVisibility,
      graphData,
      graphEdgeTypes,
      nodeVisibility,
      searchOptions,
      showOrphans,
    }, []),
    [edgeVisibility, graphData, graphEdgeTypes, nodeVisibility, searchOptions, showOrphans],
  );
  const filterVisibleData = useMemo(
    () => deriveShellVisibleGraph({
      edgeVisibility,
      graphData,
      graphEdgeTypes,
      nodeVisibility,
      searchOptions,
      showOrphans,
    }, activeFilterPatterns),
    [activeFilterPatterns, edgeVisibility, graphData, graphEdgeTypes, nodeVisibility, searchOptions, showOrphans],
  );

  return {
    countBaseData,
    filterVisibleData,
  };
}
