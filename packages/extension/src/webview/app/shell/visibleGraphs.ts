import { useMemo } from 'react';
import { deriveVisibleGraph } from '../../../shared/visibleGraph';
import type { GraphState } from '../../store/state';
import { buildVisibleGraphConfig } from '../../search/visibleGraphConfig';

interface ShellVisibleGraphsInput {
  activeFilterPatterns: string[];
  edgeVisibility: GraphState['edgeVisibility'];
  graphData: GraphState['graphData'];
  graphEdgeTypes: GraphState['graphEdgeTypes'];
  graphNodeTypes: GraphState['graphNodeTypes'];
  nodeVisibility: GraphState['nodeVisibility'];
  searchOptions: GraphState['searchOptions'];
  showOrphans: GraphState['showOrphans'];
}

function deriveShellVisibleGraph(
  input: Omit<ShellVisibleGraphsInput, 'activeFilterPatterns'>,
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
  graphData,
  graphEdgeTypes,
  graphNodeTypes,
  nodeVisibility,
  searchOptions,
  showOrphans,
}: ShellVisibleGraphsInput) {
  const countBaseData = useMemo(
    () => deriveShellVisibleGraph({
      edgeVisibility,
      graphData,
      graphEdgeTypes,
      graphNodeTypes,
      nodeVisibility,
      searchOptions,
      showOrphans,
    }, []),
    [edgeVisibility, graphData, graphEdgeTypes, graphNodeTypes, nodeVisibility, searchOptions, showOrphans],
  );
  const filterVisibleData = useMemo(
    () => deriveShellVisibleGraph({
      edgeVisibility,
      graphData,
      graphEdgeTypes,
      graphNodeTypes,
      nodeVisibility,
      searchOptions,
      showOrphans,
    }, activeFilterPatterns),
    [activeFilterPatterns, edgeVisibility, graphData, graphEdgeTypes, graphNodeTypes, nodeVisibility, searchOptions, showOrphans],
  );

  return {
    countBaseData,
    filterVisibleData,
  };
}
