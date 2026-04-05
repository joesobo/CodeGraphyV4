/**
 * @fileoverview Registration helpers for plugin host renderers/overlays/tooltips.
 * @module webview/pluginHost/registration
 */

import type { NodeRenderFn, OverlayRenderFn, TooltipProviderFn, WebviewDisposable } from './contracts';
import type { GraphPluginSlot } from './contracts';

type SlotContainerMap = Map<string, Map<GraphPluginSlot, HTMLDivElement>>;
type SlotHostMap = Map<GraphPluginSlot, HTMLDivElement>;

export function syncSlotHostVisibility(slot: GraphPluginSlot, slotHosts: SlotHostMap): void {
  const host = slotHosts.get(slot);
  if (!host) {
    return;
  }

  host.style.display = host.childElementCount > 0 ? '' : 'none';
}

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

export function getOrCreateSlotContainer(
  pluginId: string,
  slot: GraphPluginSlot,
  slotContainers: SlotContainerMap,
  slotHosts: SlotHostMap,
): HTMLDivElement {
  let pluginSlots = slotContainers.get(pluginId);
  if (!pluginSlots) {
    pluginSlots = new Map();
    slotContainers.set(pluginId, pluginSlots);
  }

  let container = pluginSlots.get(slot);
  if (!container) {
    container = document.createElement('div');
    container.setAttribute('data-cg-plugin', pluginId);
    container.setAttribute('data-cg-slot', slot);
    const host = slotHosts.get(slot);
    if (host) {
      host.appendChild(container);
      syncSlotHostVisibility(slot, slotHosts);
    } else {
      container.style.display = 'none';
      document.body.appendChild(container);
    }
    pluginSlots.set(slot, container);
  }

  return container;
}

export function attachSlotHost(
  slot: GraphPluginSlot,
  host: HTMLDivElement,
  slotContainers: SlotContainerMap,
  slotHosts: SlotHostMap,
): void {
  slotHosts.set(slot, host);
  host.setAttribute('data-cg-slot-host', slot);

  for (const pluginSlots of slotContainers.values()) {
    const container = pluginSlots.get(slot);
    if (!container) {
      continue;
    }

    container.style.display = '';
    host.appendChild(container);
  }

  syncSlotHostVisibility(slot, slotHosts);
}

export function detachSlotHost(
  slot: GraphPluginSlot,
  slotHosts: SlotHostMap,
): void {
  slotHosts.delete(slot);
}
