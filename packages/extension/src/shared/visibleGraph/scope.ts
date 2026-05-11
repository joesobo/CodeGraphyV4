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

export function applyGraphScope(
  graphData: IGraphData,
  scope: VisibleGraphScopeConfig,
): IGraphData {
  const disabledNodeTypes = getDisabledNodeTypes(scope);
  const disabledEdgeTypes = getDisabledTypes(scope.edges);
  const nodes = graphData.nodes.filter((node) => !disabledNodeTypes.has(getNodeType(node)));
  const scopedEdges = graphData.edges.filter((edge) => !disabledEdgeTypes.has(edge.kind));

  return {
    nodes,
    edges: filterEdgesToNodes(scopedEdges, nodes),
  };
}
