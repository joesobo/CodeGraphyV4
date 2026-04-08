/**
 * @fileoverview Hook that derives filtered and colored graph data from raw store state.
 * Memoizes both the filter pass and the color-application pass.
 * @module webview/useFilteredGraph
 */

import { useMemo } from 'react';
import type { SearchOptions } from '../components/searchBar/field/model';
import { filterGraphData, applyGroupColors } from './filtering';
import type { IGraphData } from '../../shared/graph/types';
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
  groups: IGroup[],
  nodeColors: Record<string, string> = {},
  nodeVisibility: Record<string, boolean> = {},
  edgeVisibility: Record<string, boolean> = {},
  edgeColors: Record<string, string> = {},
  edgeDecorations?: Record<string, EdgeDecorationPayload>,
): IFilteredGraph {
  const { graphData: controlsData, edgeDecorations: controlsEdgeDecorations } = useMemo(
    () =>
      applyGraphControls({
        graphData,
        nodeColors,
        nodeVisibility,
        edgeVisibility,
        edgeColors,
        edgeDecorations,
      }),
    [edgeColors, edgeDecorations, edgeVisibility, graphData, nodeColors, nodeVisibility],
  );

  const { filteredData, regexError } = useMemo(
    () => filterGraphData(controlsData, searchQuery, searchOptions),
    [controlsData, searchQuery, searchOptions],
  );

  const coloredData = useMemo(
    () => applyGroupColors(filteredData, groups),
    [filteredData, groups],
  );

  return {
    filteredData,
    coloredData,
    edgeDecorations: controlsEdgeDecorations,
    regexError,
  };
}
