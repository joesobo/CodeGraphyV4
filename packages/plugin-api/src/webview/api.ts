/**
 * @fileoverview Webview-side plugin API.
 * @module @codegraphy/plugin-api/webview/api
 */

import type { Disposable } from '../disposable';
import type { NodeRenderFn, OverlayRenderFn, TooltipProviderFn } from './renderers';
import type { BadgeOpts, RingOpts, LabelOpts } from './types';

/**
 * API available to Tier-2 plugin scripts running in the CodeGraphy webview.
 *
 * The extension injects plugin scripts and passes this API to each script's
 * `activate(api)` export.
 */
export interface CodeGraphyWebviewAPI {
  /** Get a hidden, plugin-scoped container element for DOM-based UI. */
  getContainer(): HTMLDivElement;

  /**
   * Register a node renderer for a node type (typically file extension, e.g. ".ts").
   * Use "*" as a wildcard fallback.
   */
  registerNodeRenderer(type: string, fn: NodeRenderFn): Disposable;

  /** Register a canvas overlay renderer. */
  registerOverlay(id: string, fn: OverlayRenderFn): Disposable;

  /** Register a tooltip provider that appends sections to the default tooltip. */
  registerTooltipProvider(fn: TooltipProviderFn): Disposable;

  /** Built-in drawing helpers for common overlay patterns. */
  helpers: {
    drawBadge(ctx: CanvasRenderingContext2D, opts: BadgeOpts): void;
    drawProgressRing(ctx: CanvasRenderingContext2D, opts: RingOpts): void;
    drawLabel(ctx: CanvasRenderingContext2D, opts: LabelOpts): void;
  };

  /** Send a plugin-scoped message to extension-side plugin code. */
  sendMessage(msg: { type: string; data: unknown }): void;

  /** Listen for messages from extension-side plugin code. */
  onMessage(handler: (msg: { type: string; data: unknown }) => void): Disposable;
}
