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
  badge?: {
    text: string;
    color?: string;
    bgColor?: string;
    position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
    tooltip?: string;
  };
  border?: {
    color: string;
    width?: number;
    style?: 'solid' | 'dashed' | 'dotted';
  };
  tooltip?: {
    sections: TooltipSection[];
  };
  label?: {
    text?: string;
    sublabel?: string;
    color?: string;
  };
  size?: {
    scale?: number;
  };
  opacity?: number;
  color?: string;
  icon?: string;
  group?: string;
  priority?: number;
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
  style?: 'solid' | 'dashed' | 'dotted';
  label?: { text: string; color?: string };
  particles?: { count?: number; color?: string; speed?: number };
  opacity?: number;
  curvature?: number;
  priority?: number;
}

/**
 * A section of content in a node tooltip.
 * Tooltip sections from decorations are appended after the default tooltip content.
 */
export interface TooltipSection {
  title: string;
  content: string;
}
