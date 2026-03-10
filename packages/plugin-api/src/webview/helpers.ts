/**
 * @fileoverview Helper option types for common webview decoration patterns.
 * Plugins use these to configure badges, rings, and labels on graph nodes
 * via the webview-side rendering API.
 * @module @codegraphy/plugin-api/webview/helpers
 */

/**
 * Options for rendering a badge on a graph node.
 * Badges are small indicators (text or icons) drawn in a corner of the node.
 */
export interface BadgeOpts {
  /** Badge text content (e.g., "3", "!", "NEW"). Keep it short (1-4 chars). */
  text: string;
  /** Background color of the badge (hex string). */
  color?: string;
  /** Text color inside the badge (hex string). */
  textColor?: string;
  /**
   * Position of the badge relative to the node center.
   * @default 'top-right'
   */
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  /** Font size in pixels. @default 10 */
  fontSize?: number;
}

/**
 * Options for rendering a colored ring around a graph node.
 * Rings are useful for highlighting node state (e.g., test status, coverage).
 */
export interface RingOpts {
  /** Ring color (hex string). */
  color: string;
  /** Ring width in pixels. @default 2 */
  width?: number;
  /**
   * Gap between the node border and the ring in pixels.
   * @default 2
   */
  gap?: number;
  /**
   * Dash pattern for the ring stroke (e.g., [4, 2]).
   * Undefined or empty array = solid ring.
   */
  dashes?: number[];
  /** Ring opacity (0-1). @default 1 */
  opacity?: number;
}

/**
 * Options for rendering a custom label on or near a graph node.
 */
export interface LabelOpts {
  /** Label text. */
  text: string;
  /** Font size in pixels. @default 12 */
  fontSize?: number;
  /** Font family. @default 'system-ui, sans-serif' */
  fontFamily?: string;
  /** Text color (hex string). */
  color?: string;
  /** Background color behind the text (hex string). Undefined = transparent. */
  backgroundColor?: string;
  /**
   * Vertical offset from the node center in pixels.
   * Positive = below, negative = above.
   * @default 0
   */
  offsetY?: number;
  /**
   * Maximum width in pixels before truncation with ellipsis.
   * Undefined = no truncation.
   */
  maxWidth?: number;
}
