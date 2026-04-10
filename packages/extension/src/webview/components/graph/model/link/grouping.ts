/**
 * @fileoverview Link grouping logic for curvature computation.
 * Groups links by node pair and separates self-loops from parallel links.
 * @module webview/components/graph/model/linkCurvatureGrouping
 */

import type { CurvatureLink, NodeRef } from './curvature';

export function resolveId(ref: NodeRef): string {
  if (ref == null) return '';
  if (typeof ref === 'string') return ref;
  if (typeof ref === 'number') return String(ref);
  return String(ref.id ?? '');
}

export interface GroupedLinks<T extends CurvatureLink> {
  selfLoopLinks: Record<string, T[]>;
  sameNodesLinks: Record<string, T[]>;
}

/** Groups links by their node pair, separating self-loops from parallel links. */
export function groupLinksByNodePair<T extends CurvatureLink>(links: T[]): GroupedLinks<T> {
  const selfLoopLinks: Record<string, T[]> = {};
  const sameNodesLinks: Record<string, T[]> = {};

  for (const link of links) {
    const sourceId = resolveId(link.source);
    const targetId = resolveId(link.target);
    const orderedPairId = sourceId <= targetId
      ? `${sourceId}_${targetId}`
      : `${targetId}_${sourceId}`;
    const pairId = link.curvatureGroupId
      ? `${orderedPairId}_${link.curvatureGroupId}`
      : orderedPairId;
    link.nodePairId = pairId;
    const map = sourceId === targetId ? selfLoopLinks : sameNodesLinks;
    if (!map[pairId]) map[pairId] = [];
    map[pairId].push(link);
  }

  return { selfLoopLinks, sameNodesLinks };
}
