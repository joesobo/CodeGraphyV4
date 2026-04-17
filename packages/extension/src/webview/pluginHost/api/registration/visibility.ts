import type { GraphPluginSlot } from '../contracts';

type SlotHostMap = Map<GraphPluginSlot, HTMLDivElement>;

export function syncSlotHostVisibility(slot: GraphPluginSlot, slotHosts: SlotHostMap): void {
  const host = slotHosts.get(slot);
  if (!host) {
    return;
  }

  host.style.display = host.childElementCount > 0 ? '' : 'none';
}
