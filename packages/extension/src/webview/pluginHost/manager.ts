/**
 * @fileoverview Manages Tier 2 plugin registrations in the webview.
 * @module webview/pluginHost/manager
 */

import type {
  GraphPluginSlot,
  GraphViewViewportState,
  IGraphViewContributions,
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
import type { CoreGraphViewContributionSet } from '@codegraphy/core';
import { toDisposable, type Disposable } from '../../core/plugins/disposable';
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
  registerNodeRenderer,
  registerOverlay,
  registerTooltipProvider,
} from './api/registration';

type GraphInteractionMessage = {
  type: 'GRAPH_INTERACTION';
  payload: { event: string; data: unknown };
};

type GraphViewContributionListener = () => void;
type GraphViewViewportStateListener = (state: GraphViewViewportState | null) => void;
interface GraphViewViewportStateListenerEntry {
  listener: GraphViewViewportStateListener;
  pluginId?: string;
}

function createEmptyWebviewGraphViewContributionSet(): CoreGraphViewContributionSet {
  return {
    runtimeNodes: [],
    runtimeEdges: [],
    projections: [],
    forces: [],
    nodeDragEnd: [],
    contextMenu: [],
    ui: [],
  };
}

export class WebviewPluginHost {
  private readonly _nodeRenderers = new Map<string, Array<{ pluginId: string; fn: NodeRenderFn }>>();
  private readonly _overlays = new Map<string, { pluginId: string; fn: OverlayRenderFn }>();
  private readonly _tooltipProviders: Array<{ pluginId: string; fn: TooltipProviderFn }> = [];
  private readonly _containers = new Map<string, HTMLDivElement>();
  private readonly _slotContainers = new Map<string, Map<GraphPluginSlot, HTMLDivElement>>();
  private readonly _slotHosts = new Map<GraphPluginSlot, HTMLDivElement>();
  private readonly _messageHandlers = new Map<string, Set<(msg: { type: string; data: unknown }) => void>>();
  private readonly _graphViewContributions = new Map<string, Set<IGraphViewContributions>>();
  private readonly _graphViewContributionListeners = new Set<GraphViewContributionListener>();
  private readonly _graphViewViewportStateListeners = new Set<GraphViewViewportStateListenerEntry>();
  private _graphViewContributionSnapshot: CoreGraphViewContributionSet | undefined;
  private _graphViewViewportState: GraphViewViewportState | null = null;

  createAPI(pluginId: string, postMessage: (msg: GraphInteractionMessage) => void): CodeGraphyWebviewAPI {
    return createPluginWebviewApi(
      pluginId, postMessage,
      (pid) => getOrCreateContainer(pid, this._containers),
      (pid, slot) => getOrCreateSlotContainer(pid, slot, this._slotContainers, this._slotHosts),
      (pid, type, fn) => registerNodeRenderer(pid, type, fn, this._nodeRenderers),
      (pid, id, fn) => registerOverlay(pid, id, fn, this._overlays),
      (pid, fn) => registerTooltipProvider(pid, fn, this._tooltipProviders),
      (pid, contributions) => this.registerGraphViewContributions(pid, contributions),
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
    return this._nodeRenderers.get(type)?.at(-1)?.fn;
  }

  getNodeRenderers(type: string): NodeRenderFn[] {
    const typeRenderers = this._nodeRenderers.get(type) ?? [];
    const wildcardRenderers = type === '*' ? [] : (this._nodeRenderers.get('*') ?? []);
    return [...typeRenderers, ...wildcardRenderers].map(entry => entry.fn);
  }
  getOverlays(): Array<{ id: string; fn: OverlayRenderFn }> { return Array.from(this._overlays.entries()).map(([id, entry]) => ({ id, fn: entry.fn })); }
  getTooltipContent(context: TooltipContext): TooltipContent | null { return aggregateTooltipContent(context, this._tooltipProviders); }

  getGraphViewViewportState(): GraphViewViewportState | null {
    return this._graphViewViewportState;
  }

  setGraphViewViewportState(state: GraphViewViewportState | null): void {
    this._graphViewViewportState = state;
    for (const entry of this._graphViewViewportStateListeners) {
      entry.listener(state);
    }
  }

  subscribeGraphViewViewportState(
    listener: GraphViewViewportStateListener,
    pluginId?: string,
  ): Disposable {
    const entry: GraphViewViewportStateListenerEntry = pluginId
      ? { listener, pluginId }
      : { listener };
    this._graphViewViewportStateListeners.add(entry);
    listener(this._graphViewViewportState);
    return toDisposable(() => {
      this._graphViewViewportStateListeners.delete(entry);
    });
  }

  getGraphViewContributions(): CoreGraphViewContributionSet {
    if (this._graphViewContributionSnapshot) {
      return this._graphViewContributionSnapshot;
    }

    const merged = createEmptyWebviewGraphViewContributionSet();
    for (const [pluginId, contributionSets] of this._graphViewContributions) {
      for (const contributions of contributionSets) {
        merged.runtimeNodes.push(...(contributions.runtimeNodes ?? []).map(contribution => ({ pluginId, contribution })));
        merged.runtimeEdges.push(...(contributions.runtimeEdges ?? []).map(contribution => ({ pluginId, contribution })));
        merged.projections.push(...(contributions.projections ?? []).map(contribution => ({ pluginId, contribution })));
        merged.forces.push(...(contributions.forces ?? []).map(contribution => ({ pluginId, contribution })));
        merged.nodeDragEnd.push(...(contributions.nodeDragEnd ?? []).map(contribution => ({ pluginId, contribution })));
        merged.contextMenu.push(...(contributions.contextMenu ?? []).map(contribution => ({ pluginId, contribution })));
        merged.ui.push(...(contributions.ui ?? []).map(contribution => ({ pluginId, contribution })));
      }
    }

    this._graphViewContributionSnapshot = merged;
    return merged;
  }

  subscribeGraphViewContributions(listener: GraphViewContributionListener): Disposable {
    this._graphViewContributionListeners.add(listener);
    return toDisposable(() => {
      this._graphViewContributionListeners.delete(listener);
    });
  }

  private registerGraphViewContributions(
    pluginId: string,
    contributions: IGraphViewContributions,
  ): Disposable {
    let pluginContributions = this._graphViewContributions.get(pluginId);
    if (!pluginContributions) {
      pluginContributions = new Set();
      this._graphViewContributions.set(pluginId, pluginContributions);
    }

    pluginContributions.add(contributions);
    this.invalidateGraphViewContributionSnapshot();
    this.notifyGraphViewContributionListeners();

    return toDisposable(() => {
      const currentContributions = this._graphViewContributions.get(pluginId);
      currentContributions?.delete(contributions);
      if (currentContributions?.size === 0) {
        this._graphViewContributions.delete(pluginId);
      }
      this.invalidateGraphViewContributionSnapshot();
      this.notifyGraphViewContributionListeners();
    });
  }

  private invalidateGraphViewContributionSnapshot(): void {
    this._graphViewContributionSnapshot = undefined;
  }

  private notifyGraphViewContributionListeners(): void {
    for (const listener of this._graphViewContributionListeners) {
      listener();
    }
  }

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
    if (this._graphViewContributions.delete(pluginId)) {
      this.invalidateGraphViewContributionSnapshot();
      this.notifyGraphViewContributionListeners();
    }
    for (const entry of [...this._graphViewViewportStateListeners]) {
      if (entry.pluginId === pluginId) {
        this._graphViewViewportStateListeners.delete(entry);
      }
    }
  }

  static drawBadge(ctx: CanvasRenderingContext2D, opts: BadgeOpts): void { drawBadge(ctx, opts); }
  static drawProgressRing(ctx: CanvasRenderingContext2D, opts: RingOpts): void { drawProgressRing(ctx, opts); }
  static drawLabel(ctx: CanvasRenderingContext2D, opts: LabelOpts): void { drawLabel(ctx, opts); }
}
