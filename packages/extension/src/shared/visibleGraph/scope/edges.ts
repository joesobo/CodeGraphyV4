import type { IGraphData } from '../../graph/contracts';
import { filterEdgesToNodes } from '../model';
import { projectEdgesToVisibleNodes } from './edgeProjection';
import { keepMostSpecificUniqueEdges } from './edgeSelection';

export function resolveScopedEdges(
  nodes: IGraphData['nodes'],
  graphNodes: IGraphData['nodes'],
  scopedEdges: IGraphData['edges'],
): IGraphData['edges'] {
  const edges = keepMostSpecificUniqueEdges(
    nodes,
    projectEdgesToVisibleNodes(scopedEdges, graphNodes, nodes),
  );
  return filterEdgesToNodes(edges, nodes);
}
