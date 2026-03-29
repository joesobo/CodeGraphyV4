/**
 * @fileoverview Edge decoration merge logic.
 * @module core/plugins/decoration/mergeEdgeDecorations
 */

import type { EdgeDecoration } from './contracts';

/**
 * Merge multiple edge decorations (already sorted by priority descending).
 * First-set-wins per property.
 */
export function mergeEdgeDecorations(decorations: EdgeDecoration[]): EdgeDecoration {
  const merged: EdgeDecoration = {};

  for (const dec of decorations) {
    if (dec.color && !merged.color) merged.color = dec.color;
    if (dec.width !== undefined && merged.width === undefined) merged.width = dec.width;
    if (dec.style && !merged.style) merged.style = dec.style;
    if (dec.label && !merged.label) merged.label = dec.label;
    if (dec.particles && !merged.particles) merged.particles = dec.particles;
    if (dec.opacity !== undefined && merged.opacity === undefined) merged.opacity = dec.opacity;
    if (dec.curvature !== undefined && merged.curvature === undefined) merged.curvature = dec.curvature;
  }

  return merged;
}
