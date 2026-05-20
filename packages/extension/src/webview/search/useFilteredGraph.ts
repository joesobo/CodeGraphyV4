/**
 * @fileoverview Hook that derives filtered and colored graph data from raw store state.
 * Memoizes both the filter pass and the color-application pass.
 * @module webview/useFilteredGraph
 */

import { useMemo } from 'react';
import type { SearchOptions } from '../components/searchBar/field/model';
import { applyLegendRules } from './filtering/rules';
import { deriveVisibleGraph } from '../../shared/visibleGraph';
import type { IGraphData } from '../../shared/graph/contracts';
import type { IGraphEdgeTypeDefinition } from '../../shared/graphControls/contracts';
import type { IGroup } from '../../shared/settings/groups';
import type { EdgeDecorationPayload } from '../../shared/plugins/decorations';
import {
  applyEdgeTypeDefaultColors,
  filterVisibleEdgeDecorations,
} from '../graphControls/filtering/edges';
import { applyNodeTypeColors, withResolvedNodeTypes } from '../graphControls/filtering/nodes';
import {
  buildVisibleGraphConfig,
  withSharedEdgeTypeAliases,
} from './visibleGraphConfig';

export interface IFilteredGraph {
  /** Graph after node/edge search filtering (null when no graph data). */
  filteredData: IGraphData | null;
  /** Graph after group colors applied (null when no graph data). */
  coloredData: IGraphData | null;
  /** Edge decorations merged with edge-kind colors after controls filtering. */
  edgeDecorations: Record<string, EdgeDecorationPayload> | undefined;
  /** Regex parse error when regex search option is active. */
  regexError: string | null;
}

/**
 * Derives the filtered + colored graph data.
 * Both memos recompute only when their specific inputs change.
 */
export function useFilteredGraph(
  graphData: IGraphData | null,
  searchQuery: string,
  searchOptions: SearchOptions,
  legends: IGroup[],
  nodeColors: Record<string, string> = {},
  nodeVisibility: Record<string, boolean> = {},
  edgeVisibility: Record<string, boolean> = {},
  edgeTypes: IGraphEdgeTypeDefinition[] = [],
  edgeDecorations?: Record<string, EdgeDecorationPayload>,
  filterPatterns: readonly string[] = [],
  showOrphans = true,
): IFilteredGraph {
  const visibleGraph = useMemo(() => {
    return deriveVisibleGraph(graphData, buildVisibleGraphConfig({
      edgeTypes,
      edgeVisibility,
      filterPatterns,
      nodeVisibility,
      searchOptions,
      searchQuery,
      showOrphans,
    }));
  }, [
    edgeTypes,
    edgeVisibility,
    filterPatterns,
    graphData,
    nodeVisibility,
    searchOptions,
    searchQuery,
    showOrphans,
  ]);

  const filteredData = useMemo(() => {
    if (!visibleGraph.graphData) {
      return null;
    }

    const edgeTypesForStyling = withSharedEdgeTypeAliases(edgeTypes);

    return {
      nodes: applyNodeTypeColors(withResolvedNodeTypes(visibleGraph.graphData.nodes), nodeColors),
      edges: applyEdgeTypeDefaultColors(visibleGraph.graphData.edges, edgeTypesForStyling),
    };
  }, [edgeTypes, nodeColors, visibleGraph.graphData]);

  const coloredData = useMemo(
    () => applyLegendRules(filteredData, legends),
    [filteredData, legends],
  );

  const controlsEdgeDecorations = useMemo(
    () => filterVisibleEdgeDecorations(filteredData?.edges ?? [], edgeDecorations),
    [edgeDecorations, filteredData],
  );

  return {
    filteredData,
    coloredData,
    edgeDecorations: controlsEdgeDecorations,
    regexError: visibleGraph.regexError,
  };
}
