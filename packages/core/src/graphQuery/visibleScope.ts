import type { IGraphData } from '../graph/contracts';
import type { VisibleGraphScopeConfig } from '../visibleGraph';
import {
  DEFAULT_FILE_NODE_TYPE,
  filterEdgesToNodes,
  getNodeType,
} from '../visibleGraph/model';
import type { GraphQueryConfig, GraphQueryScope } from './model';

export function toVisibleScope(scope: GraphQueryScope | undefined): VisibleGraphScopeConfig | undefined {
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

  return new Set(Object.keys(scopeTypes ?? {}).length > 0 ? enabledTypes : defaultTypes);
}

export function applyExplicitScope(
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
