/**
 * @fileoverview API factory for WebviewPluginHost.
 * @module webview/pluginHost/api
 */

import type {
  NodeRenderFn,
  OverlayRenderFn,
  TooltipProviderFn,
  WebviewDisposable,
  CodeGraphyWebviewAPI,
} from './api/contracts';
import type { BadgeOpts, RingOpts, LabelOpts } from './api/contracts';

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
    registerNodeRenderer: (type: string, fn: NodeRenderFn) => registerNodeRenderer(pluginId, type, fn),
    registerOverlay: (id: string, fn: OverlayRenderFn) => registerOverlay(pluginId, id, fn),
    registerTooltipProvider: (fn: TooltipProviderFn) => registerTooltipProvider(pluginId, fn),
    helpers: {
      drawBadge: (ctx: CanvasRenderingContext2D, opts: BadgeOpts) => drawingHelpers.drawBadge(ctx, opts),
      drawProgressRing: (ctx: CanvasRenderingContext2D, opts: RingOpts) => drawingHelpers.drawProgressRing(ctx, opts),
      drawLabel: (ctx: CanvasRenderingContext2D, opts: LabelOpts) => drawingHelpers.drawLabel(ctx, opts),
    },
    sendMessage: (msg: { type: string; data: unknown }) => {
      postMessage({
        type: 'GRAPH_INTERACTION',
        payload: { event: `plugin:${pluginId}:${msg.type}`, data: msg.data },
      });
    },
    onMessage: (handler: (msg: { type: string; data: unknown }) => void) => {
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
