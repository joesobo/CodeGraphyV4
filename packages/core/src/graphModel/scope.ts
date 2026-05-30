import type { IGraphData } from '../graph/contracts';
import type { GraphModelScopeConfig } from './contracts';
import { filterEdgesToNodes, getDisabledTypes } from './model';
import {
  getDisabledNodeTypes,
  getDisabledScopedSymbolDefinitions,
  getDisabledSymbolKinds,
} from './scopeDisabled';
import { nodeMatchesScope } from './scopeMatch';

export function applyGraphScope(
  graphData: IGraphData,
  scope: GraphModelScopeConfig,
): IGraphData {
  const disabledNodeTypes = getDisabledNodeTypes(scope);
  const disabledSymbolKinds = getDisabledSymbolKinds(scope);
  const disabledScopedSymbolDefinitions = getDisabledScopedSymbolDefinitions(scope);
  const disabledEdgeTypes = getDisabledTypes(scope.edges);
  const nodes = graphData.nodes.filter((node) => nodeMatchesScope(
    node,
    disabledNodeTypes,
    disabledSymbolKinds,
    disabledScopedSymbolDefinitions,
  ));
  const scopedEdges = graphData.edges.filter((edge) => !disabledEdgeTypes.has(edge.kind));

  return {
    nodes,
    edges: filterEdgesToNodes(scopedEdges, nodes),
  };
}
