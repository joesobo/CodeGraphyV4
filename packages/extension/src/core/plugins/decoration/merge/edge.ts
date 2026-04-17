/**
 * @fileoverview Edge decoration merge logic.
 * @module core/plugins/decoration/merge/edge
 */

import type { EdgeDecoration } from '../contracts';

function assignFirstEdgeDecorationValue<K extends keyof EdgeDecoration>(
  merged: EdgeDecoration,
  decoration: EdgeDecoration,
  key: K,
): void {
  const nextValue = decoration[key];
  if (nextValue === undefined || merged[key] !== undefined) {
    return;
  }

  merged[key] = nextValue;
}

/**
 * Merge multiple edge decorations (already sorted by priority descending).
 * First-set-wins per property.
 */
export function mergeEdgeDecorations(decorations: EdgeDecoration[]): EdgeDecoration {
  const merged: EdgeDecoration = {};

  for (const decoration of decorations) {
    assignFirstEdgeDecorationValue(merged, decoration, 'color');
    assignFirstEdgeDecorationValue(merged, decoration, 'width');
    assignFirstEdgeDecorationValue(merged, decoration, 'style');
    assignFirstEdgeDecorationValue(merged, decoration, 'label');
    assignFirstEdgeDecorationValue(merged, decoration, 'particles');
    assignFirstEdgeDecorationValue(merged, decoration, 'opacity');
    assignFirstEdgeDecorationValue(merged, decoration, 'curvature');
  }

  return merged;
}
