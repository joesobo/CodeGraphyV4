/**
 * @fileoverview Hook that derives filtered and colored graph data from raw store state.
 * Memoizes both the filter pass and the color-application pass.
 * @module webview/useFilteredGraph
 */

import { useMemo } from 'react';
import type { SearchOptions } from '../components/searchBar/field/model';
import { applyFilterPatterns } from './filtering/patterns';
import { applyLegendRules } from './filtering/rules';
import { filterGraphData } from './filtering/graph';
import type { IGraphData } from '../../shared/graph/contracts';
import type { IGraphEdgeTypeDefinition } from '../../shared/graphControls/contracts';
import type { IGroup } from '../../shared/settings/groups';
import type { EdgeDecorationPayload } from '../../shared/plugins/decorations';
import { applyGraphControls } from '../graphControls/filtering';

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
): IFilteredGraph {
  const filteredGraphData = useMemo(
    () => applyFilterPatterns(graphData, filterPatterns),
    [filterPatterns, graphData],
  );

  const { graphData: controlsData, edgeDecorations: controlsEdgeDecorations } = useMemo(
    () =>
      applyGraphControls({
        graphData: filteredGraphData,
        nodeColors,
        nodeVisibility,
        edgeVisibility,
        edgeTypes,
        edgeDecorations,
      }),
    [edgeDecorations, edgeTypes, edgeVisibility, filteredGraphData, nodeColors, nodeVisibility],
  );

  const { filteredData, regexError } = useMemo(
    () => filterGraphData(controlsData, searchQuery, searchOptions),
    [controlsData, searchQuery, searchOptions],
  );

  const coloredData = useMemo(
    () => applyLegendRules(filteredData, legends),
    [filteredData, legends],
  );

  return {
    filteredData,
    coloredData,
    edgeDecorations: controlsEdgeDecorations,
    regexError,
  };
}
