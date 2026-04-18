import type { GraphPluginSlot } from '../contracts';
import { syncSlotHostVisibility } from './visibility';

export type SlotContainerMap = Map<string, Map<GraphPluginSlot, HTMLDivElement>>;
export type SlotHostMap = Map<GraphPluginSlot, HTMLDivElement>;

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
