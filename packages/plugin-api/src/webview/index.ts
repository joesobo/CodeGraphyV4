/**
 * @fileoverview Webview-side type re-exports.
 * @module @codegraphy-vscode/plugin-api/webview
 */

export type { CodeGraphyWebviewAPI } from './api';
export type {
  GraphPluginSlot,
  NodeRenderFn,
  NodeRenderContext,
  OverlayRenderFn,
  OverlayRenderContext,
  TooltipAction,
  TooltipProviderFn,
  TooltipContext,
  TooltipContent,
} from './renderers';
export type { BadgeOpts, RingOpts, LabelOpts } from './types';
