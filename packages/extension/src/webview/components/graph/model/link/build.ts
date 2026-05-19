import type { IGraphEdge } from '../../../../../shared/graph/contracts';
import type { BidirectionalEdgeMode } from '../../../../../shared/settings/modes';
import { computeLinkCurvature } from './curvature';
import type { FGLink } from '../build';
import { processEdges } from '../edgeProcessing';
import type { ProjectedGraphEdge } from '../sectionProjection';

export function buildGraphLinks(edges: Array<IGraphEdge | ProjectedGraphEdge>, mode: BidirectionalEdgeMode): FGLink[] {
  const links: FGLink[] = processEdges(edges, mode).map(edge => {
    const link: FGLink = {
      id: edge.id,
      from: edge.from,
      to: edge.to,
      source: edge.from,
      target: edge.to,
      bidirectional: edge.bidirectional ?? false,
      baseColor: edge.color ?? (edge.bidirectional ? '#60a5fa' : undefined),
      curvatureGroupId: edge.kind,
      kind: edge.kind,
      metadata: edge.metadata,
    };

    if (edge.projectedEdgeCount !== undefined || edge.projectedEdgeIds !== undefined) {
      link.projectedEdgeCount = edge.projectedEdgeCount;
      link.projectedEdgeIds = edge.projectedEdgeIds;
    }

    return link;
  });

  computeLinkCurvature(links);

  return links;
}
