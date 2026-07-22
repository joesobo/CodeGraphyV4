import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { ExtensionGraphViewContributionSet } from '@codegraphy-dev/extension-plugin-api';
import { WebviewPluginHost } from '../../../src/webview/pluginHost/manager';
import { useGraphViewContributions } from '../../../src/webview/pluginHost/useGraphViewContributions';

function contributionSnapshot(id: string): ExtensionGraphViewContributionSet {
  return {
    runtimeNodes: [{
      pluginId: 'acme.plugin',
      contribution: {
        id,
        label: id,
        createNodes: () => [],
      },
    }],
    runtimeEdges: [],
    projections: [],
    forces: [],
    nodeDragEnd: [],
    contextMenu: [],
    ui: [],
  };
}

describe('useGraphViewContributions', () => {
  it('returns undefined without a plugin host', () => {
    const { result } = renderHook(() => useGraphViewContributions(undefined));

    expect(result.current).toBeUndefined();
  });

  it('updates from the plugin host stable contribution snapshot', () => {
    const host = new WebviewPluginHost();
    const api = host.createAPI('acme.plugin', vi.fn());
    const { result } = renderHook(() => useGraphViewContributions(host));
    const initialSnapshot = result.current;

    expect(initialSnapshot?.runtimeNodes).toEqual([]);
    expect(host.getGraphViewContributions()).toBe(initialSnapshot);

    act(() => {
      api.registerGraphViewContributions({
        runtimeNodes: [{ id: 'runtime-node', label: 'Runtime node', createNodes: () => [] }],
      });
    });

    expect(result.current?.runtimeNodes).toHaveLength(1);
    expect(result.current).toBe(host.getGraphViewContributions());
  });

  it('replaces and disposes host subscriptions', () => {
    const firstDispose = vi.fn();
    const secondDispose = vi.fn();
    const firstSnapshot = contributionSnapshot('first');
    const secondSnapshot = contributionSnapshot('second');
    const firstHost = {
      getGraphViewContributions: () => firstSnapshot,
      subscribeGraphViewContributions: vi.fn(() => ({ dispose: firstDispose })),
    } as unknown as WebviewPluginHost;
    const secondHost = {
      getGraphViewContributions: () => secondSnapshot,
      subscribeGraphViewContributions: vi.fn(() => ({ dispose: secondDispose })),
    } as unknown as WebviewPluginHost;

    const { result, rerender, unmount } = renderHook(
      ({ host }) => useGraphViewContributions(host),
      { initialProps: { host: firstHost } },
    );
    expect(result.current).toBe(firstSnapshot);

    rerender({ host: secondHost });
    expect(result.current).toBe(secondSnapshot);
    expect(firstDispose).toHaveBeenCalledOnce();

    unmount();
    expect(secondDispose).toHaveBeenCalledOnce();
  });
});
