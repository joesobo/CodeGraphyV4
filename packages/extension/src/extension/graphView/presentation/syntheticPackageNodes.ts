import type { IGraphData } from '../../../shared/graph/types';
import { filterDanglingDiffGraphEdges } from '../../gitHistory/diff/snapshot';

const PACKAGE_NODE_VIEW_IDS = new Set(['codegraphy.typescript.focused-imports']);

export function filterSyntheticPackageNodes(
  graphData: IGraphData,
  activeViewId: string,
): IGraphData {
  if (PACKAGE_NODE_VIEW_IDS.has(activeViewId)) {
    return graphData;
  }

  const allowedNodeIds = new Set(
    graphData.nodes
      .filter((node) => node.nodeType !== 'package')
      .map((node) => node.id),
  );
  const nodes = graphData.nodes.filter((node) => allowedNodeIds.has(node.id));

  return {
    nodes,
    edges: filterDanglingDiffGraphEdges(nodes, graphData.edges),
  };
}
