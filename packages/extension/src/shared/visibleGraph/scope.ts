import type { IGraphData } from '../graph/contracts';
import type { VisibleGraphScopeConfig, VisibleGraphScopeItem } from './contracts';
import { filterEdgesToNodes, getDisabledTypes, getNodeType } from './model';

function findScopeItem(
  items: readonly VisibleGraphScopeItem[],
  type: string,
): VisibleGraphScopeItem | undefined {
  return items.find((item) => item.type === type);
}

function getDisabledNodeTypes(scope: VisibleGraphScopeConfig): Set<string> {
  const disabledNodeTypes = getDisabledTypes(scope.nodes);
  if (findScopeItem(scope.nodes, 'symbol')?.enabled === false) {
    disabledNodeTypes.add('variable');
  }

  return disabledNodeTypes;
}

function getDisabledSymbolKinds(scope: VisibleGraphScopeConfig): Set<string> {
  return new Set(
    scope.nodes
      .filter((item) => item.type.startsWith('symbol:') && !item.enabled)
      .map((item) => item.type.slice('symbol:'.length)),
  );
}

function nodeMatchesScope(
  node: IGraphData['nodes'][number],
  disabledNodeTypes: ReadonlySet<string>,
  disabledSymbolKinds: ReadonlySet<string>,
): boolean {
  if (disabledNodeTypes.has(getNodeType(node))) {
    return false;
  }

  const symbolKind = node.symbol?.kind;
  return !symbolKind || !disabledSymbolKinds.has(symbolKind);
}

export function applyGraphScope(
  graphData: IGraphData,
  scope: VisibleGraphScopeConfig,
): IGraphData {
  const disabledNodeTypes = getDisabledNodeTypes(scope);
  const disabledSymbolKinds = getDisabledSymbolKinds(scope);
  const disabledEdgeTypes = getDisabledTypes(scope.edges);
  const nodes = graphData.nodes.filter((node) => nodeMatchesScope(node, disabledNodeTypes, disabledSymbolKinds));
  const scopedEdges = graphData.edges.filter((edge) => !disabledEdgeTypes.has(edge.kind));

  return {
    nodes,
    edges: filterEdgesToNodes(scopedEdges, nodes),
  };
}
