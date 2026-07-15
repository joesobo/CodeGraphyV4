import type { IGraphEdge, IGraphNode } from '../../../../../shared/graph/contracts';
import type { NodeSizeMode } from '../../../../../shared/settings/modes';
import { computeConnectionSizes } from '../sizing/calculations';
import { computeFileSizeSizes } from '../sizing/fileSize';

export function calculateNodeSizes(
  nodes: IGraphNode[],
  edges: Pick<IGraphEdge, 'from' | 'to'>[],
  mode: NodeSizeMode
): Map<string, number> {
  return mode === 'connections'
    ? computeConnectionSizes(nodes, edges)
    : computeFileSizeSizes(nodes);
}
