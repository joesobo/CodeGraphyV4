/**
 * @fileoverview Manages Tier 2 plugin registrations in the webview.
 * @module webview/pluginHost/manager
 */

import type { CoreGraphViewContributionSet } from '@codegraphy-dev/core';
import type {
  GraphPluginSlot,
  GraphViewViewportState,
  NodeRenderFn,
  OverlayRenderFn,
  TooltipProviderFn,
  TooltipContent,
  TooltipContext,
  BadgeOpts,
  RingOpts,
  LabelOpts,
  CodeGraphyWebviewAPI,
} from './api/contracts/webview';
import { toWebviewDisposable, type WebviewDisposable } from './disposable';
import { drawBadge, drawProgressRing, drawLabel } from './api/drawing';
import { createPluginWebviewApi } from './api';
import { removePluginRegistrations } from './api/registration/cleanup/remove';
import { deliverPluginMessage } from './api/messages';
import { aggregateTooltipContent } from './api/tooltip';
import {
  attachSlotHost,
  detachSlotHost,
  getOrCreateContainer,
  getOrCreateSlotContainer,
  registerSlotContribution,
  registerNodeRenderer,
  registerOverlay,
  registerTooltipProvider,
  type SlotContributionMap,
} from './api/registration';
import {
  GraphViewContributionRegistry,
  type GraphViewContributionListener,
} from './manager/contributionRegistry';
import {
  getLatestNodeRenderer,
  getOverlayEntries,
  getRendererFnsForType,
  type NodeRendererRegistry,
  type OverlayRegistry,
} from './manager/registries';
import {
  createGraphViewViewportStateListenerEntry,
  notifyGraphViewViewportStateListeners,
  removeGraphViewViewportStateListenersForPlugin,
  type GraphViewViewportStateListener,
  type GraphViewViewportStateListenerEntry,
} from './manager/viewportState';

type GraphInteractionMessage = {
  type: 'GRAPH_INTERACTION';
  payload: { event: string; data: unknown };
};

export class WebviewPluginHost {
  private readonly _nodeRenderers: NodeRendererRegistry = new Map();
  private readonly _overlays: OverlayRegistry = new Map();
  private readonly _tooltipProviders: Array<{ pluginId: string; fn: TooltipProviderFn }> = [];
  private readonly _containers = new Map<string, HTMLDivElement>();
  private readonly _slotContainers = new Map<string, Map<GraphPluginSlot, HTMLDivElement>>();
  private readonly _slotContributions: SlotContributionMap = new Map();
  private readonly _slotHosts = new Map<GraphPluginSlot, HTMLDivElement>();
  private readonly _messageHandlers = new Map<string, Set<(msg: { type: string; data: unknown }) => void>>();
  private readonly _graphViewContributions = new GraphViewContributionRegistry();
  private readonly _graphViewViewportStateListeners = new Set<GraphViewViewportStateListenerEntry>();
  private _graphViewViewportState: GraphViewViewportState | null = null;

  createAPI(
    pluginId: string,
    postMessage: (msg: GraphInteractionMessage) => void,
    postHostMessage: (msg: unknown) => void = () => undefined,
    getHostState: () => Record<string, unknown> = () => ({}),
    getPluginData: (pluginId: string) => unknown = () => undefined,
  ): CodeGraphyWebviewAPI {
    return createPluginWebviewApi(
      pluginId, postMessage,
      postHostMessage,
      getHostState,
      getPluginData,
      (pid) => getOrCreateContainer(pid, this._containers),
      (pid, slot) => getOrCreateSlotContainer(pid, slot, this._slotContainers, this._slotHosts),
      (pid, slot, contribution, context) =>
        registerSlotContribution(pid, slot, contribution, context, this._slotContributions, this._slotHosts),
      (pid, type, fn) => registerNodeRenderer(pid, type, fn, this._nodeRenderers),
      (pid, id, fn) => registerOverlay(pid, id, fn, this._overlays),
      (pid, fn) => registerTooltipProvider(pid, fn, this._tooltipProviders),
      (pid, contributions) => this._graphViewContributions.register(pid, contributions),
      () => this.getGraphViewViewportState(),
      (handler) => this.subscribeGraphViewViewportState(handler, pluginId),
      this._messageHandlers,
      { drawBadge: (ctx, opts) => WebviewPluginHost.drawBadge(ctx, opts), drawProgressRing: (ctx, opts) => WebviewPluginHost.drawProgressRing(ctx, opts), drawLabel: (ctx, opts) => WebviewPluginHost.drawLabel(ctx, opts) },
    );
  }

  deliverMessage(pluginId: string, msg: { type: string; data: unknown }): void {
    deliverPluginMessage(pluginId, msg, this._messageHandlers);
  }

  getNodeRenderer(type: string): NodeRenderFn | undefined {
    return getLatestNodeRenderer(this._nodeRenderers, type);
  }

  getNodeRenderers(type: string): NodeRenderFn[] {
    return getRendererFnsForType(this._nodeRenderers, type);
  }

  getOverlays(): Array<{ id: string; fn: OverlayRenderFn }> {
    return getOverlayEntries(this._overlays);
  }

  getTooltipContent(context: TooltipContext): TooltipContent | null { return aggregateTooltipContent(context, this._tooltipProviders); }

  getGraphViewViewportState(): GraphViewViewportState | null {
    return this._graphViewViewportState;
  }

  hasGraphViewViewportConsumers(): boolean {
    return this._overlays.size > 0 || this._graphViewViewportStateListeners.size > 0;
  }

  setGraphViewViewportState(state: GraphViewViewportState | null): void {
    this._graphViewViewportState = state;
    notifyGraphViewViewportStateListeners(this._graphViewViewportStateListeners, state);
  }

  subscribeGraphViewViewportState(
    listener: GraphViewViewportStateListener,
    pluginId?: string,
  ): WebviewDisposable {
    const entry = createGraphViewViewportStateListenerEntry(listener, pluginId);
    this._graphViewViewportStateListeners.add(entry);
    listener(this._graphViewViewportState);
    return toWebviewDisposable(() => {
      this._graphViewViewportStateListeners.delete(entry);
    });
  }

  getGraphViewContributions(): CoreGraphViewContributionSet {
    return this._graphViewContributions.get();
  }

  subscribeGraphViewContributions(listener: GraphViewContributionListener): WebviewDisposable {
    return this._graphViewContributions.subscribe(listener);
  }

  attachSlotHost(slot: GraphPluginSlot, host: HTMLDivElement): void {
    attachSlotHost(slot, host, this._slotContainers, this._slotHosts, this._slotContributions);
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
      this._slotContributions,
    );
    this._graphViewContributions.removePlugin(pluginId);
    removeGraphViewViewportStateListenersForPlugin(this._graphViewViewportStateListeners, pluginId);
  }

  static drawBadge(ctx: CanvasRenderingContext2D, opts: BadgeOpts): void { drawBadge(ctx, opts); }
  static drawProgressRing(ctx: CanvasRenderingContext2D, opts: RingOpts): void { drawProgressRing(ctx, opts); }
  static drawLabel(ctx: CanvasRenderingContext2D, opts: LabelOpts): void { drawLabel(ctx, opts); }
}
