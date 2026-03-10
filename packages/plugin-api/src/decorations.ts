/**
 * @fileoverview Decoration types for customizing node and edge appearance.
 * Plugins can apply decorations to overlay visual changes on graph elements
 * without modifying the underlying data.
 * @module @codegraphy/plugin-api/decorations
 */

/**
 * Visual decoration applied to a graph node.
 * All properties are optional — only specified properties override the defaults.
 */
export interface NodeDecoration {
  /** Override the node label text. */
  label?: string;
  /** Override the node fill color (hex string). */
  color?: string;
  /** Override the node border color (hex string). */
  borderColor?: string;
  /** Border width in pixels. */
  borderWidth?: number;
  /** Node opacity (0–1). */
  opacity?: number;
  /** Size multiplier relative to the default size. 1 = normal. */
  sizeMultiplier?: number;
  /** Badge text displayed in the top-right corner (e.g., "3", "!"). */
  badge?: string;
  /** Badge background color (hex string). */
  badgeColor?: string;
  /** Tooltip sections appended to the default tooltip. */
  tooltip?: TooltipSection[];
  /** Arbitrary metadata attached to the node (not rendered). */
  metadata?: Record<string, unknown>;
}

/**
 * Visual decoration applied to a graph edge.
 * All properties are optional — only specified properties override the defaults.
 */
export interface EdgeDecoration {
  /** Override the edge color (hex string). */
  color?: string;
  /** Edge width in pixels. */
  width?: number;
  /** Edge opacity (0–1). */
  opacity?: number;
  /** Dash pattern (e.g., [5, 3] for 5px dash, 3px gap). Empty array or undefined = solid. */
  dashes?: number[];
  /** Label text displayed on the edge. */
  label?: string;
  /** Whether to show an animated particle traveling along the edge. */
  particles?: boolean;
  /** Particle color (hex string). Only used when {@link particles} is true. */
  particleColor?: string;
  /** Arbitrary metadata attached to the edge (not rendered). */
  metadata?: Record<string, unknown>;
}

/**
 * A section of content in a node tooltip.
 * Tooltip sections from decorations are appended after the default tooltip content.
 */
export interface TooltipSection {
  /** Section heading. */
  heading: string;
  /** Lines of text within this section. */
  lines: string[];
}
