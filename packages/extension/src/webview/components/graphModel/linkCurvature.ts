/**
 * @fileoverview Computes curvature values for overlapping links.
 * When multiple links share the same node pair, they are fanned out
 * using alternating positive/negative curvature so they don't overlap.
 * Based on the force-graph curved-links example.
 * @module webview/components/graphModel/linkCurvature
 */

export type { CurvatureLink } from './linkCurvatureTypes';
import type { CurvatureLink } from './linkCurvatureTypes';
import { groupLinksByNodePair } from './linkCurvatureGrouping';
import { assignSelfLoopCurvature, assignParallelCurvature } from './linkCurvatureAssignment';

/**
 * Compute curvature for overlapping links (mutates in place).
 * - Single links between a pair -> curvature stays 0 (untouched).
 * - Self-loops -> curvature spread from 0.5 to 1.
 * - Multiple parallel links -> alternating +/-curvature, centered around 0.
 */
export function computeLinkCurvature<T extends CurvatureLink>(links: T[]): void {
  const curvatureMinMax = 0.5;
  const { selfLoopLinks, sameNodesLinks } = groupLinksByNodePair(links);
  assignSelfLoopCurvature(selfLoopLinks, curvatureMinMax);
  assignParallelCurvature(sameNodesLinks, curvatureMinMax);
}
