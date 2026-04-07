import type { IGraphData } from '../../../shared/graph/types';
import { filterDanglingDiffGraphEdges } from '../../gitHistory/diff/snapshot';

export function filterSyntheticPackageNodes(
  graphData: IGraphData,
  activeViewId: string,
): IGraphData {
  if (activeViewId === 'codegraphy.typescript.focused-imports') {
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
