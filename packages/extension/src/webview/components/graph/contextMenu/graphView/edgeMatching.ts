import type { GraphContextMenuEdge } from '../contracts';
import { listAllows } from './listAllows';
import type { GraphViewContextMenuTargetSelector } from './model';

export function edgeMatches(
  edge: GraphContextMenuEdge | undefined,
  selector: Extract<GraphViewContextMenuTargetSelector, { kind: 'edge' | 'runtimeEdgeType' }>,
): boolean {
  if (!edge) {
    return false;
  }

  const edgeKinds = 'edgeKinds' in selector ? selector.edgeKinds : undefined;
  return listAllows(edgeKinds, edge.kind) &&
    listAllows(selector.runtimeEdgeTypes, edge.runtimeEdgeType);
}
