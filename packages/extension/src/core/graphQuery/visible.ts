import type { IGraphData, IGraphEdge, IGraphNode } from '../../shared/graph/contracts';
import { deriveVisibleGraph, type VisibleGraphScopeConfig } from '../../shared/visibleGraph';
import {
  DEFAULT_FILE_NODE_TYPE,
  filterEdgesToNodes,
  getNodeType,
} from '../../shared/visibleGraph/model';
import type { GraphQueryConfig, GraphQueryScope } from './model';

function toVisibleScope(scope: GraphQueryScope | undefined): VisibleGraphScopeConfig | undefined {
  if (!scope) {
    return undefined;
  }

  return {
    nodes: Object.entries(scope.nodes ?? {}).map(([type, enabled]) => ({ type, enabled })),
    edges: Object.entries(scope.edges ?? {}).map(([type, enabled]) => ({ type, enabled })),
  };
}

function getEnabledScopeTypes(scopeTypes: Record<string, boolean> | undefined, defaultTypes: readonly string[]): Set<string> {
  const enabledTypes = Object.entries(scopeTypes ?? {})
    .filter(([, enabled]) => enabled)
    .map(([type]) => type);

  return new Set(enabledTypes.length > 0 ? enabledTypes : defaultTypes);
}

function applyExplicitScope(
  graphData: IGraphData,
  config: GraphQueryConfig,
): IGraphData {
  const enabledNodeTypes = getEnabledScopeTypes(config.scope?.nodes, [DEFAULT_FILE_NODE_TYPE]);
  const enabledEdgeTypes = getEnabledScopeTypes(config.scope?.edges, []);
  const hasExplicitEdgeScope = Object.keys(config.scope?.edges ?? {}).length > 0;
  const nodes = graphData.nodes.filter((node) => enabledNodeTypes.has(getNodeType(node)));
  const scopedEdges = hasExplicitEdgeScope
    ? graphData.edges.filter((edge) => enabledEdgeTypes.has(edge.kind))
    : graphData.edges;

  return {
    nodes,
    edges: filterEdgesToNodes(scopedEdges, nodes),
  };
}

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
  const scopedGraph = deriveVisibleGraph(graphData, { scope: toVisibleScope(config.scope) }).graphData;
  return applyExplicitScope(scopedGraph, config);
}

export function filterEdgesToReportNodes(
  edges: readonly IGraphEdge[],
  nodes: readonly IGraphNode[],
): IGraphEdge[] {
  return filterEdgesToNodes([...edges], [...nodes]);
}
