/**
 * @fileoverview Node decoration merge logic.
 * @module core/plugins/decoration/mergeNodeDecorations
 */

import type { NodeDecoration, TooltipSection } from './contracts';

/**
 * Merge multiple node decorations (already sorted by priority descending).
 * First-set-wins per property. Tooltip sections are concatenated from all plugins.
 */
export function mergeNodeDecorations(decorations: NodeDecoration[]): NodeDecoration {
  const merged: NodeDecoration = {};
  const tooltipSections: TooltipSection[] = [];

  for (const dec of decorations) {
    if (dec.badge && !merged.badge) merged.badge = dec.badge;
    if (dec.border && !merged.border) merged.border = dec.border;
    if (dec.label && !merged.label) merged.label = dec.label;
    if (dec.size && !merged.size) merged.size = dec.size;
    if (dec.opacity !== undefined && merged.opacity === undefined) merged.opacity = dec.opacity;
    if (dec.color && !merged.color) merged.color = dec.color;
    if (dec.icon && !merged.icon) merged.icon = dec.icon;
    if (dec.group && !merged.group) merged.group = dec.group;

    // Tooltip sections are concatenated from all plugins
    if (dec.tooltip?.sections) {
      tooltipSections.push(...dec.tooltip.sections);
    }
  }

  if (tooltipSections.length > 0) {
    merged.tooltip = { sections: tooltipSections };
  }

  return merged;
}
