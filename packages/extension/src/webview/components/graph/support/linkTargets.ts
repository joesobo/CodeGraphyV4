import type { IGraphEdge } from '../../../../shared/graph/contracts';

export function resolveLinkEndpointId(value: unknown): string | null {
  if (typeof value === 'string') return value;
  const maybeId = (value as { id?: unknown } | null | undefined)?.id;
  return typeof maybeId === 'string' ? maybeId : null;
}

export function resolveEdgeActionTargetId(
  linkId: string | undefined,
  sourceId: string,
  targetId: string,
  rawEdges: IGraphEdge[]
): string {
  const idMatch = linkId ? rawEdges.find(edge => edge.id === linkId) : undefined;
  const endpointMatch = rawEdges.find(edge => connectsEndpoints(edge, sourceId, targetId));
  return idMatch?.id ?? endpointMatch?.id ?? linkId ?? `${sourceId}->${targetId}`;
}

function connectsEndpoints(edge: IGraphEdge, sourceId: string, targetId: string): boolean {
  const forward = edge.from === sourceId && edge.to === targetId;
  const reverse = edge.from === targetId && edge.to === sourceId;
  return forward || reverse;
}
