import type { IGraphEdge } from './contracts';

interface GraphEdgeIdentityParts {
  from: string;
  to: string;
  kind: string;
  type?: string;
  variant?: string;
}

export function createGraphEdgeId(parts: GraphEdgeIdentityParts): string {
  let edgeId = `${parts.from}->${parts.to}#${parts.kind}`;

  if (parts.type) {
    edgeId += `:${parts.type}`;
  }

  if (parts.variant) {
    edgeId += `~${parts.variant}`;
  }

  return edgeId;
}

export function getGraphEdgeIdSuffix(edgeId: string, kind: string): string {
  const hashIndex = edgeId.indexOf('#');
  return hashIndex >= 0 ? edgeId.slice(hashIndex) : `#${kind}`;
}

export function replaceGraphEdgeIdEndpoints(
  edge: Pick<IGraphEdge, 'id' | 'kind'>,
  from: string,
  to: string,
): string {
  return `${from}->${to}${getGraphEdgeIdSuffix(edge.id, edge.kind)}`;
}
