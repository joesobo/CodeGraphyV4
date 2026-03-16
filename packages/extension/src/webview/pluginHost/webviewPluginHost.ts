/**
 * @fileoverview Manages Tier 2 plugin registrations in the webview.
 * @module webview/pluginHost/WebviewPluginHost
 */

import type {
  NodeRenderFn,
  OverlayRenderFn,
  TooltipProviderFn,
  TooltipContent,
  TooltipContext,
  WebviewDisposable,
  BadgeOpts,
  RingOpts,
  LabelOpts,
  CodeGraphyWebviewAPI,
} from './types';
import { drawBadge, drawProgressRing, drawLabel } from './drawing';
import { createPluginWebviewApi } from './pluginHostApi';
import { removePluginRegistrations } from './pluginHostCleanup';

type GraphInteractionMessage = {
  type: 'GRAPH_INTERACTION';
  payload: { event: string; data: unknown };
};

export class WebviewPluginHost {
  private readonly _nodeRenderers = new Map<string, { pluginId: string; fn: NodeRenderFn }>();
  private readonly _overlays = new Map<string, { pluginId: string; fn: OverlayRenderFn }>();
  private readonly _tooltipProviders: Array<{ pluginId: string; fn: TooltipProviderFn }> = [];
  private readonly _containers = new Map<string, HTMLDivElement>();
  private readonly _messageHandlers = new Map<
    string,
    Set<(msg: { type: string; data: unknown }) => void>
  >();

  createAPI(pluginId: string, postMessage: (msg: GraphInteractionMessage) => void): CodeGraphyWebviewAPI {
    return createPluginWebviewApi(
      pluginId,
      postMessage,
      (pid) => this._getOrCreateContainer(pid),
      (pid, type, fn) => this._registerNodeRenderer(pid, type, fn),
      (pid, id, fn) => this._registerOverlay(pid, id, fn),
      (pid, fn) => this._registerTooltipProvider(pid, fn),
      this._messageHandlers,
      {
        drawBadge: (ctx, opts) => WebviewPluginHost.drawBadge(ctx, opts),
        drawProgressRing: (ctx, opts) => WebviewPluginHost.drawProgressRing(ctx, opts),
        drawLabel: (ctx, opts) => WebviewPluginHost.drawLabel(ctx, opts),
      },
    );
  }

  deliverMessage(pluginId: string, msg: { type: string; data: unknown }): void {
    const handlers = this._messageHandlers.get(pluginId);
    if (handlers) {
      for (const handler of handlers) {
        try {
          handler(msg);
        } catch (e) {
          console.error(`[CG] Plugin ${pluginId} message handler error:`, e);
        }
      }
    }
  }

  getNodeRenderer(type: string): NodeRenderFn | undefined {
    return this._nodeRenderers.get(type)?.fn;
  }

  getOverlays(): Array<{ id: string; fn: OverlayRenderFn }> {
    return Array.from(this._overlays.entries()).map(([id, entry]) => ({ id, fn: entry.fn }));
  }

  getTooltipContent(context: TooltipContext): TooltipContent | null {
    const sections: Array<{ title: string; content: string }> = [];
    for (const provider of this._tooltipProviders) {
      try {
        const content = provider.fn(context);
        if (content?.sections) sections.push(...content.sections);
      } catch (e) {
        console.error(`[CG] Tooltip provider error:`, e);
      }
    }
    return sections.length > 0 ? { sections } : null;
  }

  removePlugin(pluginId: string): void {
    removePluginRegistrations(
      pluginId,
      this._nodeRenderers,
      this._overlays,
      this._tooltipProviders,
      this._messageHandlers,
      this._containers,
    );
  }

  private _getOrCreateContainer(pluginId: string): HTMLDivElement {
    let container = this._containers.get(pluginId);
    if (!container) {
      container = document.createElement('div');
      container.setAttribute('data-cg-plugin', pluginId);
      container.style.display = 'none';
      document.body.appendChild(container);
      this._containers.set(pluginId, container);
    }
    return container;
  }

  private _registerNodeRenderer(pluginId: string, type: string, fn: NodeRenderFn): WebviewDisposable {
    this._nodeRenderers.set(type, { pluginId, fn });
    return {
      dispose: () => {
        if (this._nodeRenderers.get(type)?.pluginId === pluginId) this._nodeRenderers.delete(type);
      },
    };
  }

  private _registerOverlay(pluginId: string, id: string, fn: OverlayRenderFn): WebviewDisposable {
    const qualifiedId = `${pluginId}:${id}`;
    this._overlays.set(qualifiedId, { pluginId, fn });
    return { dispose: () => this._overlays.delete(qualifiedId) };
  }

  private _registerTooltipProvider(pluginId: string, fn: TooltipProviderFn): WebviewDisposable {
    const entry = { pluginId, fn };
    this._tooltipProviders.push(entry);
    return {
      dispose: () => {
        const idx = this._tooltipProviders.indexOf(entry);
        if (idx !== -1) this._tooltipProviders.splice(idx, 1);
      },
    };
  }

  static drawBadge(ctx: CanvasRenderingContext2D, opts: BadgeOpts): void { drawBadge(ctx, opts); }
  static drawProgressRing(ctx: CanvasRenderingContext2D, opts: RingOpts): void { drawProgressRing(ctx, opts); }
  static drawLabel(ctx: CanvasRenderingContext2D, opts: LabelOpts): void { drawLabel(ctx, opts); }
}
