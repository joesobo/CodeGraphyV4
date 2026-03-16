/**
 * @fileoverview Pure functions for merging node and edge decorations.
 * Priority-based, first-set-wins per property.
 * @module core/plugins/decorationMerge
 */

import type { NodeDecoration, EdgeDecoration, TooltipSection } from './decorationManager';

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
