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

type GraphInteractionMessage = {
  type: 'GRAPH_INTERACTION';
  payload: {
    event: string;
    data: unknown;
  };
};

/**
 * Manages Tier 2 plugin scripts and their registrations.
 * Each plugin gets a scoped API instance.
 */
export class WebviewPluginHost {
  private readonly _nodeRenderers = new Map<string, { pluginId: string; fn: NodeRenderFn }>();
  private readonly _overlays = new Map<string, { pluginId: string; fn: OverlayRenderFn }>();
  private readonly _tooltipProviders: Array<{ pluginId: string; fn: TooltipProviderFn }> = [];
  private readonly _containers = new Map<string, HTMLDivElement>();
  private readonly _messageHandlers = new Map<
    string,
    Set<(msg: { type: string; data: unknown }) => void>
  >();

  /**
   * Create a scoped API for a plugin.
   */
  createAPI(pluginId: string, postMessage: (msg: GraphInteractionMessage) => void): CodeGraphyWebviewAPI {
    return {
      getContainer: () => this._getOrCreateContainer(pluginId),
      registerNodeRenderer: (type, fn) => this._registerNodeRenderer(pluginId, type, fn),
      registerOverlay: (id, fn) => this._registerOverlay(pluginId, id, fn),
      registerTooltipProvider: (fn) => this._registerTooltipProvider(pluginId, fn),
      helpers: {
        drawBadge: (ctx, opts) => WebviewPluginHost.drawBadge(ctx, opts),
        drawProgressRing: (ctx, opts) => WebviewPluginHost.drawProgressRing(ctx, opts),
        drawLabel: (ctx, opts) => WebviewPluginHost.drawLabel(ctx, opts),
      },
      sendMessage: (msg) => {
        postMessage({
          type: 'GRAPH_INTERACTION',
          payload: { event: `plugin:${pluginId}:${msg.type}`, data: msg.data },
        });
      },
      onMessage: (handler) => {
        let handlers = this._messageHandlers.get(pluginId);
        if (!handlers) {
          handlers = new Set();
          this._messageHandlers.set(pluginId, handlers);
        }
        handlers.add(handler);
        return {
          dispose: () => handlers!.delete(handler),
        };
      },
    };
  }

  /**
   * Deliver a message from the extension to a specific plugin.
   */
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

  /**
   * Get a custom node renderer if registered for this type.
   */
  getNodeRenderer(type: string): NodeRenderFn | undefined {
    return this._nodeRenderers.get(type)?.fn;
  }

  /**
   * Get all overlay render functions.
   */
  getOverlays(): Array<{ id: string; fn: OverlayRenderFn }> {
    return Array.from(this._overlays.entries()).map(([id, entry]) => ({ id, fn: entry.fn }));
  }

  /**
   * Get tooltip content from all registered providers.
   */
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

  /**
   * Remove all registrations for a plugin.
   */
  removePlugin(pluginId: string): void {
    // Remove node renderers
    for (const [type, entry] of this._nodeRenderers) {
      if (entry.pluginId === pluginId) this._nodeRenderers.delete(type);
    }
    // Remove overlays
    for (const [id, entry] of this._overlays) {
      if (entry.pluginId === pluginId) this._overlays.delete(id);
    }
    // Remove tooltip providers
    for (let i = this._tooltipProviders.length - 1; i >= 0; i--) {
      if (this._tooltipProviders[i].pluginId === pluginId) {
        this._tooltipProviders.splice(i, 1);
      }
    }
    // Remove message handlers
    this._messageHandlers.delete(pluginId);
    // Remove container
    const container = this._containers.get(pluginId);
    if (container) {
      container.remove();
      this._containers.delete(pluginId);
    }
  }

  // ── Private ──

  private _getOrCreateContainer(pluginId: string): HTMLDivElement {
    let container = this._containers.get(pluginId);
    if (!container) {
      container = document.createElement('div');
      container.setAttribute('data-cg-plugin', pluginId);
      container.style.display = 'none'; // Hidden by default
      document.body.appendChild(container);
      this._containers.set(pluginId, container);
    }
    return container;
  }

  private _registerNodeRenderer(
    pluginId: string,
    type: string,
    fn: NodeRenderFn,
  ): WebviewDisposable {
    this._nodeRenderers.set(type, { pluginId, fn });
    return {
      dispose: () => {
        if (this._nodeRenderers.get(type)?.pluginId === pluginId) this._nodeRenderers.delete(type);
      },
    };
  }

  private _registerOverlay(
    pluginId: string,
    id: string,
    fn: OverlayRenderFn,
  ): WebviewDisposable {
    const qualifiedId = `${pluginId}:${id}`;
    this._overlays.set(qualifiedId, { pluginId, fn });
    return { dispose: () => this._overlays.delete(qualifiedId) };
  }

  private _registerTooltipProvider(
    pluginId: string,
    fn: TooltipProviderFn,
  ): WebviewDisposable {
    const entry = { pluginId, fn };
    this._tooltipProviders.push(entry);
    return {
      dispose: () => {
        const idx = this._tooltipProviders.indexOf(entry);
        if (idx !== -1) this._tooltipProviders.splice(idx, 1);
      },
    };
  }

  // ── Drawing Helpers ──

  static drawBadge(ctx: CanvasRenderingContext2D, opts: BadgeOpts): void {
    const fontSize = opts.fontSize ?? 8;
    ctx.font = `bold ${fontSize}px sans-serif`;
    const metrics = ctx.measureText(opts.text);
    const padding = 3;
    const w = metrics.width + padding * 2;
    const h = fontSize + padding * 2;

    ctx.fillStyle = opts.bgColor ?? '#EF4444';
    ctx.beginPath();
    ctx.roundRect(opts.x - w / 2, opts.y - h / 2, w, h, h / 2);
    ctx.fill();

    ctx.fillStyle = opts.color ?? '#FFFFFF';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(opts.text, opts.x, opts.y);
  }

  static drawProgressRing(ctx: CanvasRenderingContext2D, opts: RingOpts): void {
    const width = opts.width ?? 2;
    const progress = opts.progress ?? 1;

    ctx.strokeStyle = opts.color;
    ctx.lineWidth = width;
    ctx.beginPath();
    ctx.arc(opts.x, opts.y, opts.radius, -Math.PI / 2, -Math.PI / 2 + 2 * Math.PI * progress);
    ctx.stroke();
  }

  static drawLabel(ctx: CanvasRenderingContext2D, opts: LabelOpts): void {
    const fontSize = opts.fontSize ?? 10;
    ctx.font = `${fontSize}px sans-serif`;
    ctx.fillStyle = opts.color ?? '#FFFFFF';
    ctx.textAlign = opts.align ?? 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(opts.text, opts.x, opts.y);
  }
}
