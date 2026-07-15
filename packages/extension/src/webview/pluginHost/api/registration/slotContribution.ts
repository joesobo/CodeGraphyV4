import type {
  GraphPluginSlot,
  PluginSlotContribution,
  PluginSlotRenderContext,
} from '../contracts/webview';
import { toWebviewDisposable, type WebviewDisposable } from '../../disposable';
import { orderSlotHostChildren } from './slotOrder';
import type {
  SlotContributionEntry,
  SlotContributionMap,
  SlotHostMap,
} from './slotTypes';
import { syncSlotHostVisibility } from './visibility';

function normalizeSlotContributionCleanup(cleanup: ReturnType<PluginSlotContribution['render']>): WebviewDisposable | undefined {
  if (typeof cleanup === 'function') return toWebviewDisposable(cleanup);
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

function disposeSlotContributionEntry(
  entry: SlotContributionEntry,
  entries: Set<SlotContributionEntry> | undefined,
  slotContributions: SlotContributionMap,
  slotHosts: SlotHostMap,
): void {
  if (entry.disposed) return;
  entry.disposed = true;
  const cleanup = entry.cleanup;
  entry.cleanup = undefined;
  try {
    cleanup?.dispose();
  } finally {
    entry.container.remove();
    entries?.delete(entry);
    if (entries?.size === 0) slotContributions.delete(entry.pluginId);
    syncSlotHostVisibility(entry.slot, slotHosts);
  }
}

function addSlotContribution(
  entry: SlotContributionEntry,
  slotContributions: SlotContributionMap,
): Set<SlotContributionEntry> {
  const entries = slotContributions.get(entry.pluginId) ?? new Set();
  entries.add(entry);
  slotContributions.set(entry.pluginId, entries);
  return entries;
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

  const entry: SlotContributionEntry = { pluginId, slot, id: contribution.id, order, container };
  try {
    entry.cleanup = normalizeSlotContributionCleanup(contribution.render(container, context));
  } catch (error) {
    container.remove();
    syncSlotHostVisibility(slot, slotHosts);
    throw error;
  }
  const entries = addSlotContribution(entry, slotContributions);
  return toWebviewDisposable(() => disposeSlotContributionEntry(
    entry,
    entries,
    slotContributions,
    slotHosts,
  ));
}

export function removePluginSlotContributions(
  pluginId: string,
  slotContributions: SlotContributionMap,
  slotHosts: SlotHostMap,
): void {
  const entries = slotContributions.get(pluginId);
  if (!entries) return;
  for (const entry of Array.from(entries)) {
    disposeSlotContributionEntry(entry, entries, slotContributions, slotHosts);
  }
}
