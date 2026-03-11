/**
 * @fileoverview Drawing helper option types for webview plugins.
 * @module @codegraphy/plugin-api/webview/helpers
 */

/** Options for drawing a badge on a node. */
export interface BadgeOpts {
  text: string;
  x: number;
  y: number;
  color?: string;
  bgColor?: string;
  fontSize?: number;
}

/** Options for drawing a progress ring around a node. */
export interface RingOpts {
  x: number;
  y: number;
  radius: number;
  color: string;
  width?: number;
  progress?: number;
}

/** Options for drawing text labels. */
export interface LabelOpts {
  text: string;
  x: number;
  y: number;
  color?: string;
  fontSize?: number;
  align?: CanvasTextAlign;
}
