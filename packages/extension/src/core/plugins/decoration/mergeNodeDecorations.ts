/**
 * @fileoverview Node decoration merge logic.
 * @module core/plugins/decoration/mergeNodeDecorations
 */

import type { NodeDecoration, TooltipSection } from './contracts';

function assignFirstNodeDecorationValue<K extends keyof NodeDecoration>(
  merged: NodeDecoration,
  decoration: NodeDecoration,
  key: K,
): void {
  const nextValue = decoration[key];
  if (nextValue === undefined || merged[key] !== undefined) {
    return;
  }

  merged[key] = nextValue;
}

function appendTooltipSections(
  tooltipSections: TooltipSection[],
  decoration: NodeDecoration,
): void {
  if (decoration.tooltip?.sections) {
    tooltipSections.push(...decoration.tooltip.sections);
  }
}

/**
 * Merge multiple node decorations (already sorted by priority descending).
 * First-set-wins per property. Tooltip sections are concatenated from all plugins.
 */
export function mergeNodeDecorations(decorations: NodeDecoration[]): NodeDecoration {
  const merged: NodeDecoration = {};
  const tooltipSections: TooltipSection[] = [];

  for (const decoration of decorations) {
    assignFirstNodeDecorationValue(merged, decoration, 'badge');
    assignFirstNodeDecorationValue(merged, decoration, 'border');
    assignFirstNodeDecorationValue(merged, decoration, 'label');
    assignFirstNodeDecorationValue(merged, decoration, 'size');
    assignFirstNodeDecorationValue(merged, decoration, 'opacity');
    assignFirstNodeDecorationValue(merged, decoration, 'color');
    assignFirstNodeDecorationValue(merged, decoration, 'icon');
    assignFirstNodeDecorationValue(merged, decoration, 'group');
    appendTooltipSections(tooltipSections, decoration);
  }

  if (tooltipSections.length > 0) {
    merged.tooltip = { sections: tooltipSections };
  }

  return merged;
}
