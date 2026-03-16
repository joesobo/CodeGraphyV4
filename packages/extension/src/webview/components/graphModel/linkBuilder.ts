import type { BidirectionalEdgeMode, IGraphEdge } from '../../../shared/types';
import { computeLinkCurvature } from './linkCurvature';
import type { FGLink } from '../graphModel';
import { processEdges } from './edgeProcessing';

export function buildGraphLinks(edges: IGraphEdge[], mode: BidirectionalEdgeMode): FGLink[] {
  const links: FGLink[] = processEdges(edges, mode).map(edge => ({
    id: edge.id,
    source: edge.from,
    target: edge.to,
    bidirectional: edge.bidirectional ?? false,
    baseColor: edge.bidirectional ? '#60a5fa' : undefined,
  } as FGLink));

  computeLinkCurvature(links);

  return links;
}
