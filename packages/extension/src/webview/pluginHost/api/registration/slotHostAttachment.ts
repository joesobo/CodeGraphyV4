import type { GraphPluginSlot } from '../contracts/webview';
import { orderSlotHostChildren } from './slotOrder';
import type {
  SlotContainerMap,
  SlotContributionMap,
  SlotHostMap,
} from './slotTypes';
import { syncSlotHostVisibility } from './visibility';

function attachSlotContainers(
  slot: GraphPluginSlot,
  host: HTMLDivElement,
  slotContainers: SlotContainerMap,
): void {
  for (const pluginSlots of slotContainers.values()) {
    const container = pluginSlots.get(slot);
    if (container) {
      container.style.display = '';
      host.appendChild(container);
    }
  }
}

function attachSlotContributions(
  slot: GraphPluginSlot,
  host: HTMLDivElement,
  slotContributions: SlotContributionMap | undefined,
): void {
  for (const entries of slotContributions?.values() ?? []) {
    for (const entry of entries) {
      if (entry.slot === slot) {
        entry.container.style.display = '';
        host.appendChild(entry.container);
      }
    }
  }
}

export function attachSlotHost(
  slot: GraphPluginSlot,
  host: HTMLDivElement,
  slotContainers: SlotContainerMap,
  slotHosts: SlotHostMap,
  slotContributions?: SlotContributionMap,
): void {
  slotHosts.set(slot, host);
  host.setAttribute('data-cg-slot-host', slot);
  attachSlotContainers(slot, host, slotContainers);
  attachSlotContributions(slot, host, slotContributions);
  orderSlotHostChildren(host);
  syncSlotHostVisibility(slot, slotHosts);
}

export function detachSlotHost(slot: GraphPluginSlot, slotHosts: SlotHostMap): void {
  slotHosts.delete(slot);
}
