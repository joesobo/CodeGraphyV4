import type { IGraphEdge } from '../../../../shared/graph/types';
import { isRecordLike } from './guards';

export function resolveLinkEndpointId(value: unknown): string | null {
  if (typeof value === 'string') return value;
  if (!isRecordLike(value)) return null;
  const maybeId = (value as { id?: unknown }).id;
  return typeof maybeId === 'string' ? maybeId : null;
}

export function resolveEdgeActionTargetId(
  linkId: string | undefined,
  sourceId: string,
  targetId: string,
  rawEdges: IGraphEdge[]
): string {
  if (linkId && rawEdges.some(edge => edge.id === linkId)) {
    return linkId;
  }

  const forward = rawEdges.find(edge => edge.from === sourceId && edge.to === targetId);
  if (forward) return forward.id;

  const reverse = rawEdges.find(edge => edge.from === targetId && edge.to === sourceId);
  if (reverse) return reverse.id;

  return linkId ?? `${sourceId}->${targetId}`;
}
