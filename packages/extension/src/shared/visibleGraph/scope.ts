import type { IGraphData } from '../graph/contracts';
import { CORE_GRAPH_NODE_TYPES } from '../graphControls/defaults/definitions';
import type { VisibleGraphScopeConfig } from './contracts';
import { getDisabledTypes } from './model';
import { getScopedSymbolDefinitions } from './scope/definitions';
import { resolveScopedEdges } from './scope/edges';
import { nodeMatchesScope } from './scope/nodes';

export function applyGraphScope(
  graphData: IGraphData,
  scope: VisibleGraphScopeConfig,
): IGraphData {
  const nodeTypes = [
    ...new Map(
      [...CORE_GRAPH_NODE_TYPES, ...(scope.nodeTypes ?? [])]
        .map(definition => [definition.id, definition]),
    ).values(),
  ];
  const disabledNodeTypes = getDisabledTypes(scope.nodes);
  const scopedSymbolDefinitions = getScopedSymbolDefinitions(scope, nodeTypes);
  const disabledEdgeTypes = getDisabledTypes(scope.edges);
  const nodes = graphData.nodes.filter((node) => nodeMatchesScope(
    node,
    disabledNodeTypes,
    scopedSymbolDefinitions,
    nodeTypes,
  ));
  const scopedEdges = graphData.edges.filter((edge) => !disabledEdgeTypes.has(edge.kind));
  return {
    nodes,
    edges: resolveScopedEdges(nodes, graphData.nodes, scopedEdges),
  };
}
