import type { GraphViewViewportState } from '../api/contracts/webview';

export type GraphViewViewportStateListener = (state: GraphViewViewportState | null) => void;

export interface GraphViewViewportStateListenerEntry {
  listener: GraphViewViewportStateListener;
  pluginId?: string;
}

export function createGraphViewViewportStateListenerEntry(
  listener: GraphViewViewportStateListener,
  pluginId?: string,
): GraphViewViewportStateListenerEntry {
  return pluginId ? { listener, pluginId } : { listener };
}

export function notifyGraphViewViewportStateListeners(
  entries: Set<GraphViewViewportStateListenerEntry>,
  state: GraphViewViewportState | null,
): void {
  for (const entry of entries) {
    entry.listener(state);
  }
}

export function removeGraphViewViewportStateListenersForPlugin(
  entries: Set<GraphViewViewportStateListenerEntry>,
  pluginId: string,
): void {
  for (const entry of [...entries]) {
    if (entry.pluginId === pluginId) {
      entries.delete(entry);
    }
  }
}
