import { diffGraphData } from '@codegraphy-dev/core';
import type { IGraphData, IGraphEdge } from '../../../../shared/graph/contracts';
import { REVISION_DIFF_EDGE_KIND } from '../../../../shared/graphControls/defaults/edgeTypes';

export { REVISION_DIFF_EDGE_KIND };

function isRevisionDiffEdge(edge: IGraphEdge): boolean {
  return edge.kind === REVISION_DIFF_EDGE_KIND;
}

function withoutRevisionDiffEdges(graphData: IGraphData): IGraphData {
  const edges = graphData.edges.filter(edge => !isRevisionDiffEdge(edge));
  return edges.length === graphData.edges.length ? graphData : { ...graphData, edges };
}

function createRevisionDiffEdge(
  edge: IGraphEdge,
  revisionChange: 'added' | 'removed',
): IGraphEdge {
  return {
    id: `revision-diff:${revisionChange}:${edge.id}`,
    from: edge.from,
    to: edge.to,
    kind: REVISION_DIFF_EDGE_KIND,
    sources: [{
      id: 'codegraphy.revision:diff',
      pluginId: 'codegraphy.revision',
      sourceId: 'diff',
      label: 'Graph Revision diff',
    }],
    metadata: {
      revisionChange,
      originalKind: edge.kind,
    },
  };
}

export function withRevisionDiffEdges(
  previousInput: IGraphData,
  nextInput: IGraphData,
): IGraphData {
  const previous = withoutRevisionDiffEdges(previousInput);
  const next = withoutRevisionDiffEdges(nextInput);
  const patch = diffGraphData(previous, next);
  const nextNodeIds = new Set(next.nodes.map(node => node.id));
  const previousEdgesById = new Map(previous.edges.map(edge => [edge.id, edge]));
  const added = patch.addedLinks.map(edge => createRevisionDiffEdge(edge, 'added'));
  const removed = patch.removedLinkIds.flatMap((edgeId) => {
    const edge = previousEdgesById.get(edgeId);
    return edge && nextNodeIds.has(edge.from) && nextNodeIds.has(edge.to)
      ? [createRevisionDiffEdge(edge, 'removed')]
      : [];
  });
  const revisionEdges = [...added, ...removed];
  return revisionEdges.length === 0 ? next : { ...next, edges: [...next.edges, ...revisionEdges] };
}
