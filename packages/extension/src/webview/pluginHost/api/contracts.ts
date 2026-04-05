/**
 * @fileoverview Type bridge to the canonical plugin type package.
 * @module webview/pluginHost/contracts
 */

import type { Disposable } from '../../../../../plugin-api/src/disposable';
import type {
  GraphPluginSlot,
  NodeRenderFn,
  OverlayRenderFn,
  TooltipAction,
  TooltipProviderFn,
  TooltipContent,
  TooltipContext,
  CodeGraphyWebviewAPI,
  BadgeOpts,
  RingOpts,
  LabelOpts,
} from '../../../../../plugin-api/src/webview';

export type WebviewDisposable = Disposable;
export type {
  GraphPluginSlot,
  NodeRenderFn,
  OverlayRenderFn,
  TooltipAction,
  TooltipProviderFn,
  TooltipContent,
  TooltipContext,
  CodeGraphyWebviewAPI,
  BadgeOpts,
  RingOpts,
  LabelOpts,
};
