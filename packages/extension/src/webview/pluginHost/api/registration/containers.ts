import type {
  GraphPluginSlot,
  PluginSlotContribution,
  PluginSlotRenderContext,
} from '../contracts/webview';
import { toWebviewDisposable, type WebviewDisposable } from '../../disposable';
import { syncSlotHostVisibility } from './visibility';

export type SlotContainerMap = Map<string, Map<GraphPluginSlot, HTMLDivElement>>;
export type SlotHostMap = Map<GraphPluginSlot, HTMLDivElement>;
export interface SlotContributionEntry {
  pluginId: string;
  slot: GraphPluginSlot;
  id: string;
  order: number;
  container: HTMLDivElement;
  cleanup?: WebviewDisposable;
  disposed?: boolean;
}
export type SlotContributionMap = Map<string, Set<SlotContributionEntry>>;

function normalizeSlotContributionCleanup(cleanup: ReturnType<PluginSlotContribution['render']>): WebviewDisposable | undefined {
  if (typeof cleanup === 'function') {
    return toWebviewDisposable(cleanup);
  }
  return cleanup ?? undefined;
}

function appendSlotChild(
  slot: GraphPluginSlot,
  child: HTMLDivElement,
  slotHosts: SlotHostMap,
): void {
  const host = slotHosts.get(slot);
  if (!host) {
    child.style.display = 'none';
    document.body.appendChild(child);
    return;
  }

  child.style.display = '';
  host.appendChild(child);
  orderSlotHostChildren(host);
  syncSlotHostVisibility(slot, slotHosts);
}

function orderSlotHostChildren(host: HTMLDivElement): void {
  const orderedChildren = Array.from(host.children)
    .filter((child): child is HTMLDivElement => child instanceof HTMLDivElement)
    .sort((left, right) => {
      const leftOrder = Number(left.dataset.cgSlotOrder ?? 0);
      const rightOrder = Number(right.dataset.cgSlotOrder ?? 0);
      if (leftOrder !== rightOrder) {
        return leftOrder - rightOrder;
      }
      return (left.dataset.cgSlotContribution ?? '').localeCompare(right.dataset.cgSlotContribution ?? '');
    });

  for (const child of orderedChildren) {
    host.appendChild(child);
  }
}

function disposeSlotContributionEntry(
  entry: SlotContributionEntry,
  entries: Set<SlotContributionEntry> | undefined,
  slotContributions: SlotContributionMap,
  slotHosts: SlotHostMap,
): void {
  if (entry.disposed) {
    return;
  }

  entry.disposed = true;
  const cleanup = entry.cleanup;
  entry.cleanup = undefined;

  try {
    cleanup?.dispose();
  } finally {
    entry.container.remove();
    entries?.delete(entry);
    if (entries?.size === 0) {
      slotContributions.delete(entry.pluginId);
    }
    syncSlotHostVisibility(entry.slot, slotHosts);
  }
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
      orderSlotHostChildren(host);
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
  slotContributions?: SlotContributionMap,
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

  for (const entries of slotContributions?.values() ?? []) {
    for (const entry of entries) {
      if (entry.slot !== slot) {
        continue;
      }
      entry.container.style.display = '';
      host.appendChild(entry.container);
    }
  }

  orderSlotHostChildren(host);
  syncSlotHostVisibility(slot, slotHosts);
}

export function detachSlotHost(
  slot: GraphPluginSlot,
  slotHosts: SlotHostMap,
): void {
  slotHosts.delete(slot);
}

export function registerSlotContribution(
  pluginId: string,
  slot: GraphPluginSlot,
  contribution: PluginSlotContribution,
  context: PluginSlotRenderContext,
  slotContributions: SlotContributionMap,
  slotHosts: SlotHostMap,
): WebviewDisposable {
  const container = document.createElement('div');
  const order = contribution.order ?? 0;
  container.setAttribute('data-cg-plugin', pluginId);
  container.setAttribute('data-cg-slot', slot);
  container.setAttribute('data-cg-slot-contribution', contribution.id);
  container.dataset.cgSlotOrder = String(order);

  appendSlotChild(slot, container, slotHosts);

  const entry: SlotContributionEntry = {
    pluginId,
    slot,
    id: contribution.id,
    order,
    container,
  };
  try {
    entry.cleanup = normalizeSlotContributionCleanup(contribution.render(container, context));
  } catch (error) {
    container.remove();
    syncSlotHostVisibility(slot, slotHosts);
    throw error;
  }

  let entries = slotContributions.get(pluginId);
  if (!entries) {
    entries = new Set();
    slotContributions.set(pluginId, entries);
  }
  entries.add(entry);

  return toWebviewDisposable(() => {
    disposeSlotContributionEntry(entry, entries, slotContributions, slotHosts);
  });
}

export function removePluginSlotContributions(
  pluginId: string,
  slotContributions: SlotContributionMap,
  slotHosts: SlotHostMap,
): void {
  const entries = slotContributions.get(pluginId);
  if (!entries) {
    return;
  }

  for (const entry of Array.from(entries)) {
    disposeSlotContributionEntry(entry, entries, slotContributions, slotHosts);
  }
}
