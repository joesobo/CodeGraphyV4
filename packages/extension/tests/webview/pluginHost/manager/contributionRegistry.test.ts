import { describe, expect, it, vi } from 'vitest';
import type { IGraphViewRuntimeNodeContribution } from '@codegraphy-dev/extension-plugin-api';
import { GraphViewContributionRegistry } from '../../../../src/webview/pluginHost/manager/contributionRegistry';

function runtimeNodeContribution(id: string): IGraphViewRuntimeNodeContribution {
  return {
    id,
    label: id,
    createNodes: () => [],
  };
}

describe('webview/pluginHost/manager/contributionRegistry', () => {
  it('returns a stable snapshot until contributions change', () => {
    const registry = new GraphViewContributionRegistry();
    const contribution = runtimeNodeContribution('node');

    const disposable = registry.register('plugin.one', {
      runtimeNodes: [contribution],
    });
    const firstSnapshot = registry.get();

    expect(registry.get()).toBe(firstSnapshot);

    disposable.dispose();

    expect(registry.get()).not.toBe(firstSnapshot);
    expect(registry.get().runtimeNodes).toEqual([]);
  });

  it('keeps remaining contributions when one registration is disposed', () => {
    const registry = new GraphViewContributionRegistry();
    const first = runtimeNodeContribution('first');
    const second = runtimeNodeContribution('second');

    const firstDisposable = registry.register('plugin.one', { runtimeNodes: [first] });
    registry.register('plugin.one', { runtimeNodes: [second] });

    expect(registry.get().runtimeNodes).toEqual([
      { pluginId: 'plugin.one', contribution: first },
      { pluginId: 'plugin.one', contribution: second },
    ]);

    firstDisposable.dispose();

    expect(registry.get().runtimeNodes).toEqual([
      { pluginId: 'plugin.one', contribution: second },
    ]);
  });

  it('notifies listeners for registration, disposal, and plugin removal until unsubscribed', () => {
    const registry = new GraphViewContributionRegistry();
    const listener = vi.fn();
    const unsubscribe = registry.subscribe(listener);

    const disposable = registry.register('plugin.one', { runtimeNodes: [runtimeNodeContribution('node')] });
    disposable.dispose();
    registry.register('plugin.one', { runtimeNodes: [runtimeNodeContribution('other')] });
    registry.removePlugin('plugin.one');
    registry.removePlugin('plugin.missing');
    unsubscribe.dispose();
    registry.register('plugin.two', { runtimeNodes: [runtimeNodeContribution('after-unsubscribe')] });

    expect(listener).toHaveBeenCalledTimes(4);
  });

  it('continues notifying contribution listeners when one listener throws', () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const registry = new GraphViewContributionRegistry();
    const failingListener = vi.fn(() => {
      throw new Error('listener failed');
    });
    const healthyListener = vi.fn();
    registry.subscribe(failingListener);
    registry.subscribe(healthyListener);

    let disposable: ReturnType<GraphViewContributionRegistry['register']> | undefined;
    expect(() => {
      disposable = registry.register('plugin.one', {
        runtimeNodes: [runtimeNodeContribution('node')],
      });
    }).not.toThrow();
    expect(() => disposable?.dispose()).not.toThrow();

    expect(failingListener).toHaveBeenCalledTimes(2);
    expect(healthyListener).toHaveBeenCalledTimes(2);
    expect(errorSpy).toHaveBeenCalledWith(
      '[CodeGraphy] Graph View contribution listener failed:',
      expect.any(Error),
    );
  });

  it('allows a contribution disposable to run after its plugin was removed', () => {
    const registry = new GraphViewContributionRegistry();
    const disposable = registry.register('plugin.one', { runtimeNodes: [runtimeNodeContribution('node')] });

    registry.removePlugin('plugin.one');
    disposable.dispose();

    expect(registry.get().runtimeNodes).toEqual([]);
  });
});
