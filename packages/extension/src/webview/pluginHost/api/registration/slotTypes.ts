import type { GraphPluginSlot } from '../contracts/webview';
import type { WebviewDisposable } from '../../disposable';

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
