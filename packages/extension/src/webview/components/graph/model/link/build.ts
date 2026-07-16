import type { IGraphEdge } from '../../../../../shared/graph/contracts';
import type { BidirectionalEdgeMode } from '../../../../../shared/settings/modes';
import { computeLinkCurvature } from './curvature';
import type { FGLink } from '../build';
import { processEdges, type ProcessableEdge } from '../edgeProcessing';

export function buildGraphLinks(edges: ProcessableEdge[], mode: BidirectionalEdgeMode): FGLink[] {
  const links: FGLink[] = processEdges(edges, mode).map(edge => {
    const runtimeEdge = edge as IGraphEdge & {
      ownerPluginId?: string;
      runtimeEdgeType?: string;
    };
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
      ownerPluginId: runtimeEdge.ownerPluginId,
      runtimeEdgeType: runtimeEdge.runtimeEdgeType,
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
