import { describe, expect, it, vi } from 'vitest';
import { removeDisabledPluginRegistrations } from '../../../../../src/webview/app/shell/messageListener/pluginRegistrations';
import type { WebviewPluginHost } from '../../../../../src/webview/pluginHost/manager';

function pluginHost(): WebviewPluginHost {
  return {
    removePlugin: vi.fn(),
  } as unknown as WebviewPluginHost;
}

describe('app/shell/messageListener/pluginRegistrations', () => {
  it('ignores malformed plugin status messages', () => {
    const host = pluginHost();
    const packageIds = new Map<string, string>();

    removeDisabledPluginRegistrations({ type: 'OTHER' }, host, packageIds);
    removeDisabledPluginRegistrations({ type: 'PLUGINS_UPDATED' }, host, packageIds);
    removeDisabledPluginRegistrations({ type: 'PLUGINS_UPDATED', payload: { plugins: 'bad' } }, host, packageIds);
    removeDisabledPluginRegistrations({
      type: 'PLUGINS_UPDATED',
      payload: { plugins: [null, 123, { enabled: false }] },
    }, host, packageIds);

    expect(host.removePlugin).not.toHaveBeenCalled();
  });

  it('removes disabled plugins and resets their injected assets', () => {
    const host = pluginHost();
    const resetPluginAssets = vi.fn();

    removeDisabledPluginRegistrations({
      type: 'PLUGINS_UPDATED',
      payload: { plugins: [{ id: 'codegraphy.organize', enabled: false }] },
    }, host, new Map(), resetPluginAssets);

    expect(host.removePlugin).toHaveBeenCalledWith('codegraphy.organize');
    expect(resetPluginAssets).toHaveBeenCalledWith('codegraphy.organize');
  });

  it('tracks package runtime ids and removes the latest runtime when the package is disabled', () => {
    const host = pluginHost();
    const packageIds = new Map<string, string>();
    const resetPluginAssets = vi.fn();

    removeDisabledPluginRegistrations({
      type: 'PLUGINS_UPDATED',
      payload: {
        plugins: [{ id: 'runtime.plugin', packageName: '@acme/plugin', enabled: true }],
      },
    }, host, packageIds, resetPluginAssets);
    removeDisabledPluginRegistrations({
      type: 'PLUGINS_UPDATED',
      payload: {
        plugins: [{ id: '@acme/plugin', packageName: '@acme/plugin', enabled: false }],
      },
    }, host, packageIds, resetPluginAssets);

    expect(host.removePlugin).toHaveBeenCalledWith('@acme/plugin');
    expect(host.removePlugin).toHaveBeenCalledWith('runtime.plugin');
    expect(resetPluginAssets).toHaveBeenCalledWith('@acme/plugin');
    expect(resetPluginAssets).toHaveBeenCalledWith('runtime.plugin');
    expect(packageIds.has('@acme/plugin')).toBe(false);
  });
});
