import type { GraphContextMenuEdge } from '../contracts';

export function findEdge(
  edgeId: string | undefined,
  edges: readonly GraphContextMenuEdge[] | undefined,
): GraphContextMenuEdge | undefined {
  return edgeId ? edges?.find(edge => edge.id === edgeId) : undefined;
}
