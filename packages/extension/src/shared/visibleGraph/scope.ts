import type { IGraphData } from '../graph/contracts';
import type { VisibleGraphScopeConfig } from './contracts';
import { filterEdgesToNodes, getDisabledTypes } from './model';
import { getScopedSymbolDefinitions } from './scope/definitions';
import { nodeMatchesScope } from './scope/nodes';

export function applyGraphScope(
  graphData: IGraphData,
  scope: VisibleGraphScopeConfig,
): IGraphData {
  const disabledNodeTypes = getDisabledTypes(scope.nodes);
  const scopedSymbolDefinitions = getScopedSymbolDefinitions(scope);
  const disabledEdgeTypes = getDisabledTypes(scope.edges);
  const nodes = graphData.nodes.filter((node) => nodeMatchesScope(
    node,
    disabledNodeTypes,
    scopedSymbolDefinitions,
  ));
  const scopedEdges = graphData.edges.filter((edge) => !disabledEdgeTypes.has(edge.kind));

  return {
    nodes,
    edges: filterEdgesToNodes(scopedEdges, nodes),
  };
}
