/**
 * @fileoverview Type definitions for node and edge decorations.
 * @module core/plugins/decoration/contracts
 */

/**
 * A section in a tooltip provided by a plugin.
 */
export interface TooltipSection {
  title: string;
  content: string;
}

/**
 * Structured decoration properties for graph nodes.
 * All fields are optional. Higher `priority` wins per-property.
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
 * Structured decoration properties for graph edges.
 */
export interface EdgeDecoration {
  color?: string;
  width?: number;
  style?: 'solid' | 'dashed' | 'dotted';
  label?: { text: string; color?: string };
  particles?: { count?: number; color?: string; speed?: number };
  opacity?: number;
  curvature?: number;
  priority?: number;
}

/** Internal storage for a single decoration entry */
export interface DecorationEntry<T> {
  pluginId: string;
  decoration: T;
}
