/**
 * @fileoverview Computes curvature values for overlapping links.
 * When multiple links share the same node pair, they are fanned out
 * using alternating positive/negative curvature so they don't overlap.
 * Based on the force-graph curved-links example.
 * @module webview/components/graphModel/linkCurvature
 */

/** Source/target reference — string ID or object with optional id. */
type NodeRef = string | number | { id?: string | number } | undefined;

/** Minimal link shape needed for curvature computation. */
export interface CurvatureLink {
  source?: NodeRef;
  target?: NodeRef;
  curvature?: number;
  nodePairId?: string;
}

function resolveId(ref: NodeRef): string {
  if (ref == null) return '';
  if (typeof ref === 'string') return ref;
  if (typeof ref === 'number') return String(ref);
  return String(ref.id ?? '');
}

/**
 * Compute curvature for overlapping links (mutates in place).
 * - Single links between a pair → curvature stays 0 (untouched).
 * - Self-loops → curvature spread from 0.5 to 1.
 * - Multiple parallel links → alternating ±curvature, centered around 0.
 */
export function computeLinkCurvature<T extends CurvatureLink>(links: T[]): void {
  const curvatureMinMax = 0.5;
  const selfLoopLinks: Record<string, T[]> = {};
  const sameNodesLinks: Record<string, T[]> = {};

  for (const link of links) {
    const sourceId = resolveId(link.source);
    const targetId = resolveId(link.target);
    const pairId = sourceId <= targetId ? `${sourceId}_${targetId}` : `${targetId}_${sourceId}`;
    link.nodePairId = pairId;
    const map = sourceId === targetId ? selfLoopLinks : sameNodesLinks;
    if (!map[pairId]) map[pairId] = [];
    map[pairId].push(link);
  }

  // Self-loops: spread curvature from curvatureMinMax to 1
  for (const group of Object.values(selfLoopLinks)) {
    const last = group.length - 1;
    group[last].curvature = 1;
    const delta = (1 - curvatureMinMax) / Math.max(last, 1);
    for (let i = 0; i < last; i++) {
      group[i].curvature = curvatureMinMax + i * delta;
    }
  }

  // Parallel links: alternate positive/negative curvature
  for (const group of Object.values(sameNodesLinks)) {
    if (group.length <= 1) continue;
    const last = group.length - 1;
    const lastLink = group[last];
    lastLink.curvature = curvatureMinMax;
    const delta = (2 * curvatureMinMax) / last;
    for (let i = 0; i < last; i++) {
      group[i].curvature = -curvatureMinMax + i * delta;
      const sourceI = resolveId(group[i].source);
      const sourceLast = resolveId(lastLink.source);
      if (sourceLast !== sourceI) {
        group[i].curvature = -(group[i].curvature!);
      }
    }
  }
}
