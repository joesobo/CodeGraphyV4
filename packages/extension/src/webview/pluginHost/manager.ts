/**
 * @fileoverview Manages Tier 2 plugin registrations in the webview.
 * @module webview/pluginHost/manager
 */

import type {
  GraphPluginSlot,
  NodeRenderFn,
  OverlayRenderFn,
  TooltipProviderFn,
  TooltipContent,
  TooltipContext,
  BadgeOpts,
  RingOpts,
  LabelOpts,
  CodeGraphyWebviewAPI,
} from './api/contracts';
import { drawBadge, drawProgressRing, drawLabel } from './api/drawing';
import { createPluginWebviewApi } from './api';
import { removePluginRegistrations } from './api/registration/cleanup';
import { deliverPluginMessage } from './api/messages';
import { aggregateTooltipContent } from './api/tooltip';
import {
  attachSlotHost,
  detachSlotHost,
  getOrCreateContainer,
  getOrCreateSlotContainer,
  registerNodeRenderer,
  registerOverlay,
  registerTooltipProvider,
} from './api/registration';

type GraphInteractionMessage = {
  type: 'GRAPH_INTERACTION';
  payload: { event: string; data: unknown };
};

export class WebviewPluginHost {
  private readonly _nodeRenderers = new Map<string, { pluginId: string; fn: NodeRenderFn }>();
  private readonly _overlays = new Map<string, { pluginId: string; fn: OverlayRenderFn }>();
  private readonly _tooltipProviders: Array<{ pluginId: string; fn: TooltipProviderFn }> = [];
  private readonly _containers = new Map<string, HTMLDivElement>();
  private readonly _slotContainers = new Map<string, Map<GraphPluginSlot, HTMLDivElement>>();
  private readonly _slotHosts = new Map<GraphPluginSlot, HTMLDivElement>();
  private readonly _messageHandlers = new Map<string, Set<(msg: { type: string; data: unknown }) => void>>();

  createAPI(pluginId: string, postMessage: (msg: GraphInteractionMessage) => void): CodeGraphyWebviewAPI {
    return createPluginWebviewApi(
      pluginId, postMessage,
      (pid) => getOrCreateContainer(pid, this._containers),
      (pid, slot) => getOrCreateSlotContainer(pid, slot, this._slotContainers, this._slotHosts),
      (pid, type, fn) => registerNodeRenderer(pid, type, fn, this._nodeRenderers),
      (pid, id, fn) => registerOverlay(pid, id, fn, this._overlays),
      (pid, fn) => registerTooltipProvider(pid, fn, this._tooltipProviders),
      this._messageHandlers,
      { drawBadge: (ctx, opts) => WebviewPluginHost.drawBadge(ctx, opts), drawProgressRing: (ctx, opts) => WebviewPluginHost.drawProgressRing(ctx, opts), drawLabel: (ctx, opts) => WebviewPluginHost.drawLabel(ctx, opts) },
    );
  }

  deliverMessage(pluginId: string, msg: { type: string; data: unknown }): void {
    deliverPluginMessage(pluginId, msg, this._messageHandlers);
  }

  getNodeRenderer(type: string): NodeRenderFn | undefined { return this._nodeRenderers.get(type)?.fn; }
  getOverlays(): Array<{ id: string; fn: OverlayRenderFn }> { return Array.from(this._overlays.entries()).map(([id, entry]) => ({ id, fn: entry.fn })); }
  getTooltipContent(context: TooltipContext): TooltipContent | null { return aggregateTooltipContent(context, this._tooltipProviders); }

  attachSlotHost(slot: GraphPluginSlot, host: HTMLDivElement): void {
    attachSlotHost(slot, host, this._slotContainers, this._slotHosts);
  }

  detachSlotHost(slot: GraphPluginSlot): void {
    detachSlotHost(slot, this._slotHosts);
  }

  removePlugin(pluginId: string): void {
    removePluginRegistrations(
      pluginId,
      this._nodeRenderers,
      this._overlays,
      this._tooltipProviders,
      this._messageHandlers,
      this._containers,
      this._slotContainers,
      this._slotHosts,
    );
  }

  static drawBadge(ctx: CanvasRenderingContext2D, opts: BadgeOpts): void { drawBadge(ctx, opts); }
  static drawProgressRing(ctx: CanvasRenderingContext2D, opts: RingOpts): void { drawProgressRing(ctx, opts); }
  static drawLabel(ctx: CanvasRenderingContext2D, opts: LabelOpts): void { drawLabel(ctx, opts); }
}
