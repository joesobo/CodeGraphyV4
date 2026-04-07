import type { IGraphEdge } from '@codegraphy-vscode/plugin-api';

export interface WikilinkCounts {
  linkedNodeIds: Set<string>;
  linkCounts: Map<string, number>;
}

export function buildWikilinkCounts(referenceEdges: IGraphEdge[]): WikilinkCounts {
  const linkedNodeIds = new Set<string>();
  const linkCounts = new Map<string, number>();

  for (const edge of referenceEdges) {
    addLinkCount(linkCounts, edge.from);
    addLinkCount(linkCounts, edge.to);
    linkedNodeIds.add(edge.from);
    linkedNodeIds.add(edge.to);
  }

  return { linkedNodeIds, linkCounts };
}

function addLinkCount(linkCounts: Map<string, number>, nodeId: string): void {
  linkCounts.set(nodeId, (linkCounts.get(nodeId) ?? 0) + 1);
}

