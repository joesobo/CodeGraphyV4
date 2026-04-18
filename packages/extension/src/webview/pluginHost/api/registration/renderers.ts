import type { NodeRenderFn, OverlayRenderFn, TooltipProviderFn, WebviewDisposable } from '../contracts';

export function registerNodeRenderer(
  pluginId: string,
  type: string,
  fn: NodeRenderFn,
  nodeRenderers: Map<string, { pluginId: string; fn: NodeRenderFn }>,
): WebviewDisposable {
  nodeRenderers.set(type, { pluginId, fn });
  return {
    dispose: () => {
      if (nodeRenderers.get(type)?.pluginId === pluginId) nodeRenderers.delete(type);
    },
  };
}

export function registerOverlay(
  pluginId: string,
  id: string,
  fn: OverlayRenderFn,
  overlays: Map<string, { pluginId: string; fn: OverlayRenderFn }>,
): WebviewDisposable {
  const qualifiedSourceId = `${pluginId}:${id}`;
  overlays.set(qualifiedSourceId, { pluginId, fn });
  return { dispose: () => overlays.delete(qualifiedSourceId) };
}

export function registerTooltipProvider(
  pluginId: string,
  fn: TooltipProviderFn,
  tooltipProviders: Array<{ pluginId: string; fn: TooltipProviderFn }>,
): WebviewDisposable {
  const entry = { pluginId, fn };
  tooltipProviders.push(entry);
  return {
    dispose: () => {
      const idx = tooltipProviders.indexOf(entry);
      if (idx !== -1) tooltipProviders.splice(idx, 1);
    },
  };
}
