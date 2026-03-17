/**
 * @fileoverview Hook that derives filtered and colored graph data from raw store state.
 * Memoizes both the filter pass and the color-application pass.
 * @module webview/useFilteredGraph
 */

import { useMemo } from 'react';
import type { IGraphData, IGroup } from '../shared/types';
import type { SearchOptions } from './components/SearchBar';
import { filterGraphData, applyGroupColors } from './appSearch';

export interface IFilteredGraph {
  /** Graph after node/edge search filtering (null when no graph data). */
  filteredData: IGraphData | null;
  /** Graph after group colors applied (null when no graph data). */
  coloredData: IGraphData | null;
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
): IFilteredGraph {
  const { filteredData, regexError } = useMemo(
    () => filterGraphData(graphData, searchQuery, searchOptions),
    [graphData, searchQuery, searchOptions],
  );

  const coloredData = useMemo(
    () => applyGroupColors(filteredData, groups),
    [filteredData, groups],
  );

  return { filteredData, coloredData, regexError };
}
