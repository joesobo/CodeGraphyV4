/**
 * @fileoverview API factory for WebviewPluginHost.
 * @module webview/pluginHost/pluginHostApi
 */

import type {
  NodeRenderFn,
  OverlayRenderFn,
  TooltipProviderFn,
  WebviewDisposable,
  CodeGraphyWebviewAPI,
} from './types';
import type { BadgeOpts, RingOpts, LabelOpts } from './types';

type GraphInteractionMessage = {
  type: 'GRAPH_INTERACTION';
  payload: { event: string; data: unknown };
};

type DrawingHelpers = {
  drawBadge: (ctx: CanvasRenderingContext2D, opts: BadgeOpts) => void;
  drawProgressRing: (ctx: CanvasRenderingContext2D, opts: RingOpts) => void;
  drawLabel: (ctx: CanvasRenderingContext2D, opts: LabelOpts) => void;
};

/**
 * Create a scoped CodeGraphy Webview API for a plugin.
 */
export function createPluginWebviewApi(
  pluginId: string,
  postMessage: (msg: GraphInteractionMessage) => void,
  getOrCreateContainer: (pluginId: string) => HTMLDivElement,
  registerNodeRenderer: (pluginId: string, type: string, fn: NodeRenderFn) => WebviewDisposable,
  registerOverlay: (pluginId: string, id: string, fn: OverlayRenderFn) => WebviewDisposable,
  registerTooltipProvider: (pluginId: string, fn: TooltipProviderFn) => WebviewDisposable,
  messageHandlers: Map<string, Set<(msg: { type: string; data: unknown }) => void>>,
  drawingHelpers: DrawingHelpers,
): CodeGraphyWebviewAPI {
  return {
    getContainer: () => getOrCreateContainer(pluginId),
    registerNodeRenderer: (type, fn) => registerNodeRenderer(pluginId, type, fn),
    registerOverlay: (id, fn) => registerOverlay(pluginId, id, fn),
    registerTooltipProvider: (fn) => registerTooltipProvider(pluginId, fn),
    helpers: {
      drawBadge: (ctx, opts) => drawingHelpers.drawBadge(ctx, opts),
      drawProgressRing: (ctx, opts) => drawingHelpers.drawProgressRing(ctx, opts),
      drawLabel: (ctx, opts) => drawingHelpers.drawLabel(ctx, opts),
    },
    sendMessage: (msg) => {
      postMessage({
        type: 'GRAPH_INTERACTION',
        payload: { event: `plugin:${pluginId}:${msg.type}`, data: msg.data },
      });
    },
    onMessage: (handler) => {
      let handlers = messageHandlers.get(pluginId);
      if (!handlers) {
        handlers = new Set();
        messageHandlers.set(pluginId, handlers);
      }
      const pluginHandlers = handlers;
      pluginHandlers.add(handler);
      return {
        dispose: () => pluginHandlers.delete(handler),
      };
    },
  };
}
