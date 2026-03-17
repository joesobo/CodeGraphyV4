/**
 * @fileoverview Registration helpers for plugin host renderers/overlays/tooltips.
 * @module webview/pluginHost/pluginHostRegistration
 */

import type { NodeRenderFn, OverlayRenderFn, TooltipProviderFn, WebviewDisposable } from './types';

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
  const qualifiedId = `${pluginId}:${id}`;
  overlays.set(qualifiedId, { pluginId, fn });
  return { dispose: () => overlays.delete(qualifiedId) };
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

export function getOrCreateContainer(
  pluginId: string,
  containers: Map<string, HTMLDivElement>,
): HTMLDivElement {
  let container = containers.get(pluginId);
  if (!container) {
    container = document.createElement('div');
    container.setAttribute('data-cg-plugin', pluginId);
    container.style.display = 'none';
    document.body.appendChild(container);
    containers.set(pluginId, container);
  }
  return container;
}
