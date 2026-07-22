import { describe, expect, it, vi } from 'vitest';
import { reconcilePluginRegistrations } from '../../../../../src/webview/app/shell/messageListener/pluginRegistrations';
import type { WebviewPluginHost } from '../../../../../src/webview/pluginHost/manager';

function pluginHost(): WebviewPluginHost {
  return {
    removePlugin: vi.fn(),
  } as unknown as WebviewPluginHost;
}

describe('app/shell/messageListener/pluginRegistrations', () => {
  it('ignores malformed plugin status messages', () => {
    const host = pluginHost();

    reconcilePluginRegistrations({ type: 'OTHER' }, host);
    reconcilePluginRegistrations({ type: 'PLUGINS_UPDATED' }, host);
    reconcilePluginRegistrations({ type: 'PLUGINS_UPDATED', payload: { plugins: 'bad' } }, host);
    reconcilePluginRegistrations({
      type: 'PLUGINS_UPDATED',
      payload: { plugins: [null, 123, { enabled: false }] },
    }, host);

    expect(host.removePlugin).not.toHaveBeenCalled();
  });

  it('removes disabled plugins and resets their injected assets', () => {
    const host = pluginHost();
    const resetPluginAssets = vi.fn();

    reconcilePluginRegistrations({
      type: 'PLUGINS_UPDATED',
      payload: { plugins: [{ id: 'codegraphy.organize', enabled: false }] },
    }, host, resetPluginAssets);

    expect(host.removePlugin).toHaveBeenCalledWith('codegraphy.organize');
    expect(resetPluginAssets).toHaveBeenCalledWith('codegraphy.organize');
  });

  it('removes an unavailable replacement even when user intent stays enabled', () => {
    const host = pluginHost();
    const resetPluginAssets = vi.fn();

    reconcilePluginRegistrations({
      type: 'PLUGINS_UPDATED',
      payload: {
        plugins: [{ id: 'acme.rebuilt', enabled: true, status: 'unavailable' }],
      },
    }, host, resetPluginAssets);

    expect(host.removePlugin).toHaveBeenCalledWith('acme.rebuilt');
    expect(resetPluginAssets).toHaveBeenCalledWith('acme.rebuilt');
  });

  it('removes a disabled runtime by descriptor id', () => {
    const host = pluginHost();
    const resetPluginAssets = vi.fn();

    reconcilePluginRegistrations({
      type: 'PLUGINS_UPDATED',
      payload: {
        plugins: [{ id: 'runtime.plugin', packageName: '@acme/plugin', enabled: false }],
      },
    }, host, resetPluginAssets);

    expect(host.removePlugin).toHaveBeenCalledWith('runtime.plugin');
    expect(resetPluginAssets).toHaveBeenCalledWith('runtime.plugin');
  });

  it('removes only the disabled descriptor when one package provides multiple plugins', () => {
    const host = pluginHost();
    const resetPluginAssets = vi.fn();

    reconcilePluginRegistrations({
      type: 'PLUGINS_UPDATED',
      payload: {
        plugins: [
          { id: 'acme.alpha', packageName: '@acme/plugin', enabled: true },
          { id: 'acme.beta', packageName: '@acme/plugin', enabled: true },
        ],
      },
    }, host, resetPluginAssets);
    reconcilePluginRegistrations({
      type: 'PLUGINS_UPDATED',
      payload: {
        plugins: [
          { id: 'acme.alpha', packageName: '@acme/plugin', enabled: false },
          { id: 'acme.beta', packageName: '@acme/plugin', enabled: true },
        ],
      },
    }, host, resetPluginAssets);

    expect(host.removePlugin).toHaveBeenCalledWith('acme.alpha');
    expect(host.removePlugin).not.toHaveBeenCalledWith('acme.beta');
    expect(resetPluginAssets).toHaveBeenCalledWith('acme.alpha');
    expect(resetPluginAssets).not.toHaveBeenCalledWith('acme.beta');
  });
});
