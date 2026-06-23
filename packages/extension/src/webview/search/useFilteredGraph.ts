/**
 * @fileoverview Hook that derives filtered and colored graph data from raw store state.
 * Memoizes both the filter pass and the color-application pass.
 * @module webview/useFilteredGraph
 */

import { useMemo, useRef } from 'react';
import type { SearchOptions } from '../components/searchBar/field/model';
import { applyLegendRules } from './filtering/rules';
import { deriveVisibleGraph } from '../../shared/visibleGraph';
import type { VisibleGraphResult } from '../../shared/visibleGraph';
import type { IGraphData } from '../../shared/graph/contracts';
import type {
  IGraphEdgeTypeDefinition,
  IGraphNodeTypeDefinition,
} from '../../shared/graphControls/contracts';
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
import { measureWebviewPerformance } from '../performance/marks';

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

const VISIBLE_GRAPH_CACHE_LIMIT = 6;

interface VisibleGraphCache {
  entries: Map<string, VisibleGraphResult>;
  graphData: IGraphData | null | undefined;
}

function createVisibleGraphCache(): VisibleGraphCache {
  return {
    entries: new Map(),
    graphData: undefined,
  };
}

function sortedRecordEntries<TValue>(record: Record<string, TValue>): [string, TValue][] {
  return Object.entries(record).sort(([left], [right]) => left.localeCompare(right));
}

function createVisibleGraphCacheKey({
  edgeTypes,
  edgeVisibility,
  filterPatterns,
  nodeTypes,
  nodeVisibility,
  searchOptions,
  searchQuery,
  showOrphans,
}: {
  edgeTypes: IGraphEdgeTypeDefinition[];
  edgeVisibility: Record<string, boolean>;
  filterPatterns: readonly string[];
  nodeTypes: IGraphNodeTypeDefinition[];
  nodeVisibility: Record<string, boolean>;
  searchOptions: SearchOptions;
  searchQuery: string;
  showOrphans: boolean;
}): string {
  return JSON.stringify({
    edgeTypes: edgeTypes.map(({ defaultVisible, id }) => [id, defaultVisible]),
    edgeVisibility: sortedRecordEntries(edgeVisibility),
    filterPatterns,
    nodeTypes: nodeTypes.map(({ defaultVisible, id }) => [id, defaultVisible]),
    nodeVisibility: sortedRecordEntries(nodeVisibility),
    searchOptions,
    searchQuery,
    showOrphans,
  });
}

function cacheVisibleGraphResult(
  cache: VisibleGraphCache,
  key: string,
  result: VisibleGraphResult,
): void {
  if (cache.entries.has(key)) {
    cache.entries.delete(key);
  }

  cache.entries.set(key, result);

  while (cache.entries.size > VISIBLE_GRAPH_CACHE_LIMIT) {
    const oldestKey = cache.entries.keys().next().value;
    if (!oldestKey) {
      return;
    }

    cache.entries.delete(oldestKey);
  }
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
  const visibleGraphCache = useRef(createVisibleGraphCache());
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
    const cache = visibleGraphCache.current;
    if (cache.graphData !== graphData) {
      cache.graphData = graphData;
      cache.entries.clear();
    }

    const cached = cache.entries.get(visibleGraphCacheKey);
    if (cached) {
      cache.entries.delete(visibleGraphCacheKey);
      cache.entries.set(visibleGraphCacheKey, cached);
      return cached;
    }

    const result = measureWebviewPerformance('visibleGraph.derive', {
      edgeCount: graphData?.edges.length ?? 0,
      filterPatternCount: filterPatterns.length,
      nodeCount: graphData?.nodes.length ?? 0,
      searchActive: searchQuery.trim().length > 0,
    }, () => deriveVisibleGraph(graphData, buildVisibleGraphConfig({
      edgeTypes,
      edgeVisibility,
      filterPatterns,
      nodeTypes,
      nodeVisibility,
      searchOptions,
      searchQuery,
      showOrphans,
    })));
    cacheVisibleGraphResult(cache, visibleGraphCacheKey, result);
    return result;
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
    const graph = visibleGraph.graphData;
    if (!graph) {
      return null;
    }

    const edgeTypesForStyling = withSharedEdgeTypeAliases(edgeTypes);

    return measureWebviewPerformance('visibleGraph.style', {
      edgeCount: graph.edges.length,
      nodeCount: graph.nodes.length,
    }, () => ({
      nodes: applyNodeTypeColors(withResolvedNodeTypes(graph.nodes), nodeColors),
      edges: applyEdgeTypeDefaultColors(graph.edges, edgeTypesForStyling),
    }));
  }, [edgeTypes, nodeColors, visibleGraph.graphData]);

  const coloredData = useMemo(
    () => measureWebviewPerformance('visibleGraph.applyLegendRules', {
      edgeCount: filteredData?.edges.length ?? 0,
      legendCount: legends.length,
      nodeCount: filteredData?.nodes.length ?? 0,
    }, () => applyLegendRules(filteredData, legends)),
    [filteredData, legends],
  );

  const controlsEdgeDecorations = useMemo(
    () => measureWebviewPerformance('visibleGraph.edgeDecorations', {
      edgeCount: filteredData?.edges.length ?? 0,
    }, () => filterVisibleEdgeDecorations(filteredData?.edges ?? [], edgeDecorations)),
    [edgeDecorations, filteredData],
  );

  return {
    filteredData,
    coloredData,
    edgeDecorations: controlsEdgeDecorations,
    regexError: visibleGraph.regexError,
  };
}
