import { describe, expect, it, vi } from 'vitest';
import {
  createGraphViewViewportStateListenerEntry,
  notifyGraphViewViewportStateListeners,
  removeGraphViewViewportStateListenersForPlugin,
  type GraphViewViewportStateListenerEntry,
} from '../../../../src/webview/pluginHost/manager/viewportState';

describe('webview/pluginHost/manager/viewportState', () => {
  it('creates listener entries with plugin ownership only when provided', () => {
    const listener = vi.fn();

    expect(createGraphViewViewportStateListenerEntry(listener)).toEqual({ listener });
    expect(createGraphViewViewportStateListenerEntry(listener, 'plugin.one')).toEqual({
      listener,
      pluginId: 'plugin.one',
    });
  });

  it('notifies every viewport listener with the latest state', () => {
    const first = vi.fn();
    const second = vi.fn();
    const entries = new Set<GraphViewViewportStateListenerEntry>([
      { listener: first },
      { listener: second, pluginId: 'plugin.two' },
    ]);
    const state = {
      graphToScreen: vi.fn(),
      nodes: [],
      reheatSimulation: vi.fn(),
      resumeAnimation: vi.fn(),
      screenToGraph: vi.fn(),
      timelineActive: false,
      updateNode: vi.fn(),
      zoom: 1,
    };

    notifyGraphViewViewportStateListeners(entries, state as never);

    expect(first).toHaveBeenCalledWith(state);
    expect(second).toHaveBeenCalledWith(state);
  });

  it('removes only listeners owned by the removed plugin', () => {
    const pluginOne = { listener: vi.fn(), pluginId: 'plugin.one' };
    const pluginTwo = { listener: vi.fn(), pluginId: 'plugin.two' };
    const unowned = { listener: vi.fn() };
    const entries = new Set<GraphViewViewportStateListenerEntry>([pluginOne, pluginTwo, unowned]);

    removeGraphViewViewportStateListenersForPlugin(entries, 'plugin.one');

    expect([...entries]).toEqual([pluginTwo, unowned]);
  });
});
