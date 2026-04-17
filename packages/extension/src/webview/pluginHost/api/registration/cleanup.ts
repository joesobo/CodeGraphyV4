/**
 * @fileoverview Plugin cleanup for WebviewPluginHost.
 * @module webview/pluginHost/api/registration/cleanup
 */

import type { GraphPluginSlot, NodeRenderFn, OverlayRenderFn, TooltipProviderFn } from '../contracts';
import { syncSlotHostVisibility } from './visibility';

function removePluginMapEntries<T extends { pluginId: string }>(
  pluginId: string,
  entries: Map<string, T>,
): void {
  for (const [key, entry] of entries) {
    if (entry.pluginId === pluginId) {
      entries.delete(key);
    }
  }
}

function removePluginTooltipProviders(
  pluginId: string,
  tooltipProviders: Array<{ pluginId: string; fn: TooltipProviderFn }>,
): void {
  for (let i = tooltipProviders.length - 1; i >= 0; i--) {
    if (tooltipProviders[i].pluginId === pluginId) {
      tooltipProviders.splice(i, 1);
    }
  }
}

function removePluginContainer(
  pluginId: string,
  containers: Map<string, HTMLDivElement>,
): void {
  const container = containers.get(pluginId);
  if (!container) {
    return;
  }

  container.remove();
  containers.delete(pluginId);
}

function removePluginSlotContainers(
  pluginId: string,
  slotContainers: Map<string, Map<GraphPluginSlot, HTMLDivElement>>,
  slotHosts: Map<GraphPluginSlot, HTMLDivElement>,
): void {
  const pluginSlotContainers = slotContainers.get(pluginId);
  if (!pluginSlotContainers) {
    return;
  }

  for (const [slot, container] of pluginSlotContainers.entries()) {
    container.remove();
    syncSlotHostVisibility(slot, slotHosts);
  }

  slotContainers.delete(pluginId);
}

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
  slotContainers: Map<string, Map<GraphPluginSlot, HTMLDivElement>>,
  slotHosts: Map<GraphPluginSlot, HTMLDivElement>,
): void {
  removePluginMapEntries(pluginId, nodeRenderers);
  removePluginMapEntries(pluginId, overlays);
  removePluginTooltipProviders(pluginId, tooltipProviders);
  messageHandlers.delete(pluginId);
  removePluginContainer(pluginId, containers);
  removePluginSlotContainers(pluginId, slotContainers, slotHosts);
}
