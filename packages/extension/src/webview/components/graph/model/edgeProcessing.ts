import type { IGraphEdge } from '../../../../shared/graph/contracts';
import type { BidirectionalEdgeMode } from '../../../../shared/settings/modes';
import { getGraphEdgeIdSuffix } from '../../../../shared/graph/edgeIdentity';

export interface ProcessedEdge extends IGraphEdge {
  bidirectional?: boolean;
}

export function processEdges(edges: IGraphEdge[], mode: BidirectionalEdgeMode): ProcessedEdge[] {
  if (mode === 'separate') return edges.map(edge => ({ ...edge, bidirectional: false }));

  const edgeSet = new Set(
    edges.map(edge => `${edge.from}->${edge.to}${getGraphEdgeIdSuffix(edge.id, edge.kind)}`),
  );
  const processed: ProcessedEdge[] = [];
  const seen = new Set<string>();

  for (const edge of edges) {
    const suffix = getGraphEdgeIdSuffix(edge.id, edge.kind);
    const key = `${edge.from}->${edge.to}${suffix}`;
    const reverseKey = `${edge.to}->${edge.from}${suffix}`;

    if (seen.has(key) || seen.has(reverseKey)) continue;

    if (edgeSet.has(reverseKey)) {
      const [nodeA, nodeB] = [edge.from, edge.to].sort();
      processed.push({
        ...edge,
        id: `${nodeA}<->${nodeB}${suffix}`,
        from: nodeA,
        to: nodeB,
        bidirectional: true,
      });
      seen.add(key);
      seen.add(reverseKey);
      continue;
    }

    processed.push({ ...edge, bidirectional: false });
    seen.add(key);
  }

  return processed;
}
