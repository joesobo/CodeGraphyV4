import type {
  GraphContextMenuEdge,
  GraphContextSelection,
} from '../contracts';

function findVisibleEdge(
  selection: GraphContextSelection,
  edges: readonly GraphContextMenuEdge[] | undefined,
): GraphContextMenuEdge | undefined {
  const visibleEdgeId = selection.visibleEdgeId ?? selection.edgeId;
  return edges?.find(candidate => candidate.id === visibleEdgeId);
}

export function readGraphContextMenuRelationship(
  selection: GraphContextSelection,
  edges: readonly GraphContextMenuEdge[] | undefined,
): string | undefined {
  const edge = findVisibleEdge(selection, edges);
  const relationship = edge?.kind?.trim() || edge?.runtimeEdgeType?.trim();
  return relationship || undefined;
}
