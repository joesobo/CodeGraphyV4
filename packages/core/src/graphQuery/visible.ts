import type { IGraphData, IGraphEdge, IGraphNode } from '../graph/contracts';
import { deriveVisibleGraph } from '../visibleGraph';
import {
  filterEdgesToNodes,
} from '../visibleGraph/model';
import type { GraphQueryConfig } from './model';
import { applyExplicitScope, toVisibleScope } from './visibleScope';

export function applySearchAndOrphans(
  graphData: IGraphData,
  config: GraphQueryConfig,
): IGraphData {
  let current = graphData;

  if (config.search !== undefined) {
    current = deriveVisibleGraph(current, { search: { query: config.search } }).graphData;
  }

  if (config.showOrphans !== undefined) {
    current = deriveVisibleGraph(current, { showOrphans: config.showOrphans }).graphData;
  }

  return current;
}

export function deriveScopedGraphQueryData(
  graphData: IGraphData,
  config: GraphQueryConfig = {},
): IGraphData {
  const scopedGraph = deriveVisibleGraph(graphData, {
    scope: toVisibleScope(config.scope, config.nodeTypeDefinitions),
  }).graphData;
  return applyExplicitScope(scopedGraph, config);
}

export function filterEdgesToReportNodes(
  edges: readonly IGraphEdge[],
  nodes: readonly IGraphNode[],
): IGraphEdge[] {
  return filterEdgesToNodes([...edges], [...nodes]);
}
