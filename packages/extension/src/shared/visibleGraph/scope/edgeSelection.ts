import type { IGraphData } from '../../graph/contracts';
import {
  getEdgeContainingFileKey,
  getEndpointPreference,
  rememberBestEndpointPreference,
} from './edgePreference';

interface ScopedEdgeCandidate {
  edge: IGraphData['edges'][number];
  endpointPreference?: number;
  key?: string;
}

export function keepMostSpecificUniqueEdges(
  nodes: IGraphData['nodes'],
  edges: IGraphData['edges'],
): IGraphData['edges'] {
  const nodeById = new Map(nodes.map((node) => [node.id, node]));
  const bestEndpointPreferenceByKey = new Map<string, number>();
  const candidates = edges.map(edge =>
    createScopedEdgeCandidate(edge, nodeById, bestEndpointPreferenceByKey),
  );
  const seenEdgeIds = new Set<string>();
  const uniqueEdges: IGraphData['edges'] = [];

  for (const candidate of candidates) {
    if (!shouldKeepScopedEdgeCandidate(candidate, bestEndpointPreferenceByKey)) {
      continue;
    }

    if (seenEdgeIds.has(candidate.edge.id)) {
      continue;
    }

    seenEdgeIds.add(candidate.edge.id);
    uniqueEdges.push(candidate.edge);
  }

  return uniqueEdges;
}

function createScopedEdgeCandidate(
  edge: IGraphData['edges'][number],
  nodeById: ReadonlyMap<string, IGraphData['nodes'][number]>,
  bestEndpointPreferenceByKey: Map<string, number>,
): ScopedEdgeCandidate {
  if (edge.kind === 'contains') {
    return { edge };
  }

  const key = getEdgeContainingFileKey(edge, nodeById);
  const endpointPreference = getEndpointPreference(edge, nodeById);
  rememberBestEndpointPreference(bestEndpointPreferenceByKey, key, endpointPreference);
  return { edge, endpointPreference, key };
}

function shouldKeepScopedEdgeCandidate(
  candidate: ScopedEdgeCandidate,
  bestEndpointPreferenceByKey: ReadonlyMap<string, number>,
): boolean {
  return !candidate.key
    || candidate.endpointPreference === (bestEndpointPreferenceByKey.get(candidate.key) ?? candidate.endpointPreference);
}
