/**
 * @fileoverview Hook that derives filtered and colored graph data from raw store state.
 * Memoizes both the filter pass and the color-application pass.
 * @module webview/useFilteredGraph
 */

import { useMemo, useRef } from 'react';
import type { SearchOptions } from '../components/searchBar/field/model';
import type { IGraphData } from '../../shared/graph/contracts';
import type {
  IGraphEdgeTypeDefinition,
  IGraphNodeTypeDefinition,
} from '../../shared/graphControls/contracts';
import type { IGroup } from '../../shared/settings/groups';
import type { EdgeDecorationPayload } from '../../shared/plugins/decorations';
import { filterVisibleEdgeDecorations } from '../graphControls/filtering/edges';
import { createLegendGraphCacheKey, createStyledGraphCacheKey, createVisibleGraphCacheKey } from './filteredGraph/cacheKeys';
import { getColoredGraphResult } from './filteredGraph/coloredResult';
import { createReferenceResultCache } from './filteredGraph/referenceCache';
import { getStyledGraphResult } from './filteredGraph/styledResult';
import { createVisibleGraphCache } from './filteredGraph/visibleCache';
import { getVisibleGraphResult } from './filteredGraph/visibleResult';

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
  nodeTypes: IGraphNodeTypeDefinition[] = [],
): IFilteredGraph {
  const coloredGraphCache = useRef(createReferenceResultCache<IGraphData>());
  const styledGraphCache = useRef(createReferenceResultCache<IGraphData>());
  const visibleGraphCache = useRef(createVisibleGraphCache());
  const legendGraphCacheKey = useMemo(() => createLegendGraphCacheKey(legends), [legends]);
  const styledGraphCacheKey = useMemo(() => createStyledGraphCacheKey({
    edgeTypes,
    nodeColors,
  }), [
    edgeTypes,
    nodeColors,
  ]);
  const visibleGraphCacheKey = useMemo(() => createVisibleGraphCacheKey({
    edgeTypes,
    edgeVisibility,
    filterPatterns,
    nodeTypes,
    nodeVisibility,
    searchOptions,
    searchQuery,
    showOrphans,
  }), [
    edgeTypes,
    edgeVisibility,
    filterPatterns,
    nodeTypes,
    nodeVisibility,
    searchOptions,
    searchQuery,
    showOrphans,
  ]);

  const visibleGraph = useMemo(() => {
    return getVisibleGraphResult({
      cache: visibleGraphCache.current,
      edgeTypes,
      edgeVisibility,
      filterPatterns,
      graphData,
      key: visibleGraphCacheKey,
      nodeTypes,
      nodeVisibility,
      searchOptions,
      searchQuery,
      showOrphans,
    });
  }, [
    edgeTypes,
    edgeVisibility,
    filterPatterns,
    graphData,
    nodeVisibility,
    nodeTypes,
    searchOptions,
    searchQuery,
    showOrphans,
    visibleGraphCacheKey,
  ]);

  const filteredData = useMemo(() => {
    return getStyledGraphResult({
      cache: styledGraphCache.current,
      edgeTypes,
      graph: visibleGraph.graphData,
      key: styledGraphCacheKey,
      nodeColors,
    });
  }, [edgeTypes, nodeColors, styledGraphCacheKey, visibleGraph.graphData]);

  const coloredData = useMemo(() => {
    return getColoredGraphResult({
      cache: coloredGraphCache.current,
      filteredData,
      key: legendGraphCacheKey,
      legends,
    });
  }, [filteredData, legendGraphCacheKey, legends]);

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
