import type { IGraphData } from '../graph/contracts';
import type { VisibleGraphScopeConfig } from './contracts';
import { filterEdgesToNodes, getDisabledTypes } from './model';
import {
  getDisabledNodeTypes,
  getDisabledScopedSymbolDefinitions,
  getDisabledSymbolKinds,
} from './scopeDisabled';
import { nodeMatchesScope } from './scopeMatch';

function pruneDisconnectedSymbolNodes(
  nodes: IGraphData['nodes'],
  edges: IGraphData['edges'],
): IGraphData['nodes'] {
  if (edges.length === 0) {
    return nodes;
  }

  const connectedNodeIds = new Set(edges.flatMap(edge => [edge.from, edge.to]));
  return nodes.filter((node) => !node.symbol || connectedNodeIds.has(node.id));
}

export function applyGraphScope(
  graphData: IGraphData,
  scope: VisibleGraphScopeConfig,
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
  const edges = filterEdgesToNodes(scopedEdges, nodes);
  const connectedNodes = pruneDisconnectedSymbolNodes(nodes, edges);

  return {
    nodes: connectedNodes,
    edges: filterEdgesToNodes(edges, connectedNodes),
  };
}
