/**
 * @fileoverview API factory for WebviewPluginHost.
 * @module webview/pluginHost/api
 */

import type {
  GraphPluginSlot,
  GraphViewViewportState,
  IGraphViewContributions,
  NodeRenderFn,
  OverlayRenderFn,
  PluginSlotContribution,
  PluginPanelContribution,
  PluginPanelHandle,
  TooltipProviderFn,
  WebviewDisposable,
  CodeGraphyWebviewAPI,
} from './api/contracts/webview';
import type { BadgeOptions, RingOptions, LabelOptions } from './api/contracts/webview';

type DrawingHelpers = {
  drawBadge: (canvasContext: CanvasRenderingContext2D, options: BadgeOptions) => void;
  drawProgressRing: (canvasContext: CanvasRenderingContext2D, options: RingOptions) => void;
  drawLabel: (canvasContext: CanvasRenderingContext2D, options: LabelOptions) => void;
};

function rejectLegacyPanelSlot(slot: GraphPluginSlot): void {
  if (String(slot) === 'graph.panelSlot') {
    throw new Error(
      "graph.panelSlot is host-managed. Use registerPanelContribution() to register a reopenable panel.",
    );
  }
}

/**
 * Create a scoped CodeGraphy Webview API for a plugin.
 */
export function createPluginWebviewApi(
  pluginId: string,
  postHostMessage: (msg: unknown) => void,
  getHostState: () => Record<string, unknown>,
  getPluginData: (pluginId: string) => unknown,
  getOrCreateContainer: (pluginId: string) => HTMLDivElement,
  getOrCreateSlotContainer: (pluginId: string, slot: GraphPluginSlot) => HTMLDivElement,
  registerSlotContribution: (
    pluginId: string,
    slot: GraphPluginSlot,
    contribution: PluginSlotContribution,
    context: { api: CodeGraphyWebviewAPI },
  ) => WebviewDisposable,
  registerPanelContribution: (
    pluginId: string,
    contribution: PluginPanelContribution,
    context: { api: CodeGraphyWebviewAPI },
  ) => PluginPanelHandle,
  registerNodeRenderer: (pluginId: string, type: string, fn: NodeRenderFn) => WebviewDisposable,
  registerOverlay: (pluginId: string, id: string, fn: OverlayRenderFn) => WebviewDisposable,
  registerTooltipProvider: (pluginId: string, fn: TooltipProviderFn) => WebviewDisposable,
  registerGraphViewContributions: (pluginId: string, contributions: IGraphViewContributions) => WebviewDisposable,
  getGraphViewViewportState: () => GraphViewViewportState | null,
  onGraphViewViewportState: (handler: (state: GraphViewViewportState | null) => void) => WebviewDisposable,
  messageHandlers: Map<string, Set<(msg: { type: string; data: unknown }) => void>>,
  drawingHelpers: DrawingHelpers,
): CodeGraphyWebviewAPI {
  const api: CodeGraphyWebviewAPI = {
    getContainer: () => getOrCreateContainer(pluginId),
    getSlotContainer: (slot: GraphPluginSlot) => {
      rejectLegacyPanelSlot(slot);
      return getOrCreateSlotContainer(pluginId, slot);
    },
    registerSlotContribution: (slot, contribution) => {
      rejectLegacyPanelSlot(slot);
      return registerSlotContribution(pluginId, slot, contribution, { api });
    },
    registerPanelContribution: contribution => registerPanelContribution(
      pluginId,
      contribution,
      { api },
    ),
    getHostState,
    getPluginData: () => getPluginData(pluginId),
    setPluginData: (data: unknown) => {
      postHostMessage({
        type: 'UPDATE_PLUGIN_DATA',
        payload: { pluginId, data },
      });
    },
    getGraphViewViewportState,
    onGraphViewViewportState,
    registerNodeRenderer: (type: string, fn: NodeRenderFn) => registerNodeRenderer(pluginId, type, fn),
    registerOverlay: (id: string, fn: OverlayRenderFn) => registerOverlay(pluginId, id, fn),
    registerTooltipProvider: (fn: TooltipProviderFn) => registerTooltipProvider(pluginId, fn),
    registerGraphViewContributions: (contributions: IGraphViewContributions) =>
      registerGraphViewContributions(pluginId, contributions),
    helpers: {
      drawBadge: (canvasContext, options) => drawingHelpers.drawBadge(canvasContext, options),
      drawProgressRing: (canvasContext, options) => drawingHelpers.drawProgressRing(canvasContext, options),
      drawLabel: (canvasContext, options) => drawingHelpers.drawLabel(canvasContext, options),
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
  return api;
}
