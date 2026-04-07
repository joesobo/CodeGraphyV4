import type { IGraphData, IGraphNode } from '@codegraphy-vscode/plugin-api';
import type { RankedNode } from './types';

export function getMarkdownNotes(graph: IGraphData): IGraphNode[] {
  return graph.nodes.filter(node => node.nodeType !== 'folder');
}

export function rankNotes(
  nodes: IGraphNode[],
  linkCounts: Map<string, number>,
  linkedNodeIds: Set<string>,
): RankedNode[] {
  return nodes.map(toRankedNode(linkCounts, linkedNodeIds)).sort(compareRankedNodes);
}

export function getTopLinkedNotes(entries: RankedNode[]): RankedNode[] {
  return entries.filter(entry => entry.linkCount > 0).slice(0, 10);
}

export function getOrphanNotes(entries: RankedNode[]): RankedNode[] {
  return entries.filter(entry => entry.neighborCount === 0);
}

function toRankedNode(
  linkCounts: Map<string, number>,
  linkedNodeIds: Set<string>,
): (node: IGraphNode) => RankedNode {
  return node => ({
    node,
    linkCount: linkCounts.get(node.id) ?? 0,
    neighborCount: linkedNodeIds.has(node.id) ? 1 : 0,
  });
}

function compareRankedNodes(left: RankedNode, right: RankedNode): number {
  if (right.linkCount !== left.linkCount) {
    return right.linkCount - left.linkCount;
  }

  if (right.neighborCount !== left.neighborCount) {
    return right.neighborCount - left.neighborCount;
  }

  return left.node.label.localeCompare(right.node.label);
}

