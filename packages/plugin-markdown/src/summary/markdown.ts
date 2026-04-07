import type { IGraphData, IGraphEdge, IGraphNode } from '@codegraphy-vscode/plugin-api';

interface RankedNode {
  node: IGraphNode;
  linkCount: number;
  neighborCount: number;
}

function buildLinkCounts(referenceEdges: IGraphEdge[]): {
  linkedNodeIds: Set<string>;
  linkCounts: Map<string, number>;
} {
  const linkedNodeIds = new Set<string>();
  const linkCounts = new Map<string, number>();

  for (const edge of referenceEdges) {
    linkCounts.set(edge.from, (linkCounts.get(edge.from) ?? 0) + 1);
    linkCounts.set(edge.to, (linkCounts.get(edge.to) ?? 0) + 1);
    linkedNodeIds.add(edge.from);
    linkedNodeIds.add(edge.to);
  }

  return { linkedNodeIds, linkCounts };
}

function rankNotes(
  nodes: IGraphNode[],
  linkCounts: Map<string, number>,
  linkedNodeIds: Set<string>,
): RankedNode[] {
  return nodes
    .map(node => ({
      node,
      linkCount: linkCounts.get(node.id) ?? 0,
      neighborCount: linkedNodeIds.has(node.id) ? 1 : 0,
    }))
    .sort((left, right) => {
      if (right.linkCount !== left.linkCount) return right.linkCount - left.linkCount;
      if (right.neighborCount !== left.neighborCount) return right.neighborCount - left.neighborCount;
      return left.node.label.localeCompare(right.node.label);
    });
}

function renderRankedNotes(entries: RankedNode[]): string {
  return entries.length > 0
    ? entries
        .map(entry =>
          `- \`${entry.node.label}\` (${entry.linkCount} wikilinks, ${entry.neighborCount} neighbors)`,
        )
        .join('\n')
    : '- None';
}

function renderOrphanNotes(entries: RankedNode[]): string {
  return entries.length > 0
    ? entries.map(entry => `- \`${entry.node.label}\``).join('\n')
    : '- None';
}

export function buildWikilinkSummaryMarkdown(
  graph: IGraphData,
  referenceEdges: IGraphEdge[],
): string {
  const { linkedNodeIds, linkCounts } = buildLinkCounts(referenceEdges);
  const nodes = graph.nodes.filter(node => node.nodeType !== 'folder');
  const rankedNodes = rankNotes(nodes, linkCounts, linkedNodeIds);
  const topNodes = rankedNodes.filter(entry => entry.linkCount > 0).slice(0, 10);
  const orphanNodes = rankedNodes.filter(entry => entry.neighborCount === 0);

  return [
    '# Markdown Wikilink Summary',
    '',
    `- Notes: ${nodes.length}`,
    `- Wikilinks: ${referenceEdges.length}`,
    `- Orphan notes: ${orphanNodes.length}`,
    '',
    '## Most linked notes',
    renderRankedNotes(topNodes),
    '',
    '## Orphan notes',
    renderOrphanNotes(orphanNodes),
    '',
  ].join('\n');
}
