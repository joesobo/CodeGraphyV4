/**
 * @fileoverview Extension-local access to the published webview plugin contract.
 * @module webview/pluginHost/contracts
 */

export type {
  BadgeOpts,
  CodeGraphyWebviewAPI,
  GraphPluginSlot,
  GraphViewPoint2D,
  GraphViewViewportNode,
  GraphViewViewportNodeUpdate,
  GraphViewViewportState,
  LabelOpts,
  NodeRenderContext,
  NodeRenderFn,
  OverlayRenderContext,
  OverlayRenderFn,
  PluginSlotContribution,
  PluginSlotRenderCleanup,
  PluginSlotRenderContext,
  RingOpts,
  TooltipAction,
  TooltipContent,
  TooltipContext,
  TooltipProviderFn,
} from '@codegraphy-dev/extension-plugin-api';
export type { IGraphViewContributions } from '@codegraphy-dev/extension-plugin-api';
export type { Disposable as WebviewDisposable } from '@codegraphy-dev/plugin-api/disposable';
