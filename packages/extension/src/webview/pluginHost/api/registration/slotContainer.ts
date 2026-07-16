import type { GraphPluginSlot } from '../contracts/webview';
import { orderSlotHostChildren } from './slotOrder';
import type { SlotContainerMap, SlotHostMap } from './slotTypes';
import { syncSlotHostVisibility } from './visibility';

function createSlotContainer(pluginId: string, slot: GraphPluginSlot): HTMLDivElement {
  const container = document.createElement('div');
  container.setAttribute('data-cg-plugin', pluginId);
  container.setAttribute('data-cg-slot', slot);
  return container;
}

function placeSlotContainer(
  slot: GraphPluginSlot,
  container: HTMLDivElement,
  slotHosts: SlotHostMap,
): void {
  const host = slotHosts.get(slot);
  if (!host) {
    container.style.display = 'none';
    document.body.appendChild(container);
    return;
  }
  host.appendChild(container);
  orderSlotHostChildren(host);
  syncSlotHostVisibility(slot, slotHosts);
}

function getPluginSlots(pluginId: string, slotContainers: SlotContainerMap): Map<GraphPluginSlot, HTMLDivElement> {
  const existing = slotContainers.get(pluginId);
  if (existing) return existing;
  const pluginSlots = new Map<GraphPluginSlot, HTMLDivElement>();
  slotContainers.set(pluginId, pluginSlots);
  return pluginSlots;
}

export function getOrCreateSlotContainer(
  pluginId: string,
  slot: GraphPluginSlot,
  slotContainers: SlotContainerMap,
  slotHosts: SlotHostMap,
): HTMLDivElement {
  const pluginSlots = getPluginSlots(pluginId, slotContainers);
  const existing = pluginSlots.get(slot);
  if (existing) return existing;
  const container = createSlotContainer(pluginId, slot);
  placeSlotContainer(slot, container, slotHosts);
  pluginSlots.set(slot, container);
  return container;
}
