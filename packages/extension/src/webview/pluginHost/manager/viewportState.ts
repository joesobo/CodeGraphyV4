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
    try {
      entry.listener(state);
    } catch (error) {
      const owner = entry.pluginId ? ` for plugin '${entry.pluginId}'` : '';
      console.error(`[CodeGraphy] Viewport listener${owner} failed:`, error);
    }
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
