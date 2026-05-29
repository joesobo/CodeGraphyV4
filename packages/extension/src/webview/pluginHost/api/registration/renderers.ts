import type { NodeRenderFn, OverlayRenderFn, TooltipProviderFn, WebviewDisposable } from '../contracts/webview';

export function registerNodeRenderer(
  pluginId: string,
  type: string,
  fn: NodeRenderFn,
  nodeRenderers: Map<string, Array<{ pluginId: string; fn: NodeRenderFn }>>,
): WebviewDisposable {
  const entry = { pluginId, fn };
  const renderers = nodeRenderers.get(type) ?? [];
  renderers.push(entry);
  nodeRenderers.set(type, renderers);
  return {
    dispose: () => {
      const currentRenderers = nodeRenderers.get(type);
      if (!currentRenderers) {
        return;
      }

      const nextRenderers = currentRenderers.filter(candidate => candidate !== entry);
      if (nextRenderers.length === 0) {
        nodeRenderers.delete(type);
        return;
      }

      nodeRenderers.set(type, nextRenderers);
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
