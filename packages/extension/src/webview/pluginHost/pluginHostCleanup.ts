/**
 * @fileoverview Plugin cleanup for WebviewPluginHost.
 * @module webview/pluginHost/pluginHostCleanup
 */

import type { NodeRenderFn, OverlayRenderFn, TooltipProviderFn } from './types';

/**
 * Remove all registrations for a plugin from plugin host collections.
 */
export function removePluginRegistrations(
  pluginId: string,
  nodeRenderers: Map<string, { pluginId: string; fn: NodeRenderFn }>,
  overlays: Map<string, { pluginId: string; fn: OverlayRenderFn }>,
  tooltipProviders: Array<{ pluginId: string; fn: TooltipProviderFn }>,
  messageHandlers: Map<string, Set<(msg: { type: string; data: unknown }) => void>>,
  containers: Map<string, HTMLDivElement>,
): void {
  // Remove node renderers
  for (const [type, entry] of nodeRenderers) {
    if (entry.pluginId === pluginId) nodeRenderers.delete(type);
  }
  // Remove overlays
  for (const [id, entry] of overlays) {
    if (entry.pluginId === pluginId) overlays.delete(id);
  }
  // Remove tooltip providers
  for (let i = tooltipProviders.length - 1; i >= 0; i--) {
    if (tooltipProviders[i].pluginId === pluginId) {
      tooltipProviders.splice(i, 1);
    }
  }
  // Remove message handlers
  messageHandlers.delete(pluginId);
  // Remove container
  const container = containers.get(pluginId);
  if (container) {
    container.remove();
    containers.delete(pluginId);
  }
}
