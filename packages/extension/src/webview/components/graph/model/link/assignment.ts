/**
 * @fileoverview Curvature assignment logic for self-loops and parallel links.
 * @module webview/components/graph/model/linkCurvatureAssignment
 */

import type { CurvatureLink } from './curvature';
import { resolveId } from './grouping';

/**
 * Assigns curvature values to self-loop link groups.
 * Self-loops get curvature spread from curvatureMinMax to 1.
 */
export function assignSelfLoopCurvature<T extends CurvatureLink>(
  groups: Record<string, T[]>,
  curvatureMinMax: number
): void {
  for (const group of Object.values(groups)) {
    const last = group.length - 1;
    group[last].curvature = 1;
    const delta = (1 - curvatureMinMax) / Math.max(last, 1);
    for (let i = 0; i < last; i++) {
      group[i].curvature = curvatureMinMax + i * delta;
    }
  }
}

/**
 * Assigns curvature values to parallel link groups.
 * Multiple parallel links get alternating positive/negative curvature, centered around 0.
 */
export function assignParallelCurvature<T extends CurvatureLink>(
  groups: Record<string, T[]>,
  curvatureMinMax: number
): void {
  for (const group of Object.values(groups)) {
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
