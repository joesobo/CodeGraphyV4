import type { BidirectionalEdgeMode, IGraphEdge } from '../../../../../shared/contracts';
import { computeLinkCurvature } from './curvature';
import type { FGLink } from '../build';
import { processEdges } from '../edgeProcessing';

export function buildGraphLinks(edges: IGraphEdge[], mode: BidirectionalEdgeMode): FGLink[] {
  const links: FGLink[] = processEdges(edges, mode).map(edge => ({
    id: edge.id,
    from: edge.from,
    to: edge.to,
    source: edge.from,
    target: edge.to,
    bidirectional: edge.bidirectional ?? false,
    baseColor: edge.bidirectional ? '#60a5fa' : undefined,
  }));

  computeLinkCurvature(links);

  return links;
}
