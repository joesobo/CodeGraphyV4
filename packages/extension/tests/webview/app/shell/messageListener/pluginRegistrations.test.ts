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
    const knownPluginIds = new Set<string>();

    reconcilePluginRegistrations({ type: 'OTHER' }, host, undefined, knownPluginIds);
    reconcilePluginRegistrations({ type: 'PLUGINS_UPDATED' }, host, undefined, knownPluginIds);
    reconcilePluginRegistrations(
      { type: 'PLUGINS_UPDATED', payload: { plugins: 'bad' } },
      host,
      undefined,
      knownPluginIds,
    );
    reconcilePluginRegistrations({
      type: 'PLUGINS_UPDATED',
      payload: { plugins: [null, 123, { enabled: false }] },
    }, host, undefined, knownPluginIds);

    expect(host.removePlugin).not.toHaveBeenCalled();
  });

  it('removes disabled plugins and resets their injected assets', () => {
    const host = pluginHost();
    const resetPluginAssets = vi.fn();
    const knownPluginIds = new Set<string>();

    reconcilePluginRegistrations({
      type: 'PLUGINS_UPDATED',
      payload: { plugins: [{ id: 'codegraphy.organize', enabled: false }] },
    }, host, resetPluginAssets, knownPluginIds);

    expect(host.removePlugin).toHaveBeenCalledWith('codegraphy.organize');
    expect(resetPluginAssets).toHaveBeenCalledWith('codegraphy.organize');
  });

  it('removes an unavailable replacement even when user intent stays enabled', () => {
    const host = pluginHost();
    const resetPluginAssets = vi.fn();
    const knownPluginIds = new Set<string>();

    reconcilePluginRegistrations({
      type: 'PLUGINS_UPDATED',
      payload: {
        plugins: [{ id: 'acme.rebuilt', enabled: true, status: 'unavailable' }],
      },
    }, host, resetPluginAssets, knownPluginIds);

    expect(host.removePlugin).toHaveBeenCalledWith('acme.rebuilt');
    expect(resetPluginAssets).toHaveBeenCalledWith('acme.rebuilt');
  });

  it('removes a disabled runtime by descriptor id', () => {
    const host = pluginHost();
    const resetPluginAssets = vi.fn();
    const knownPluginIds = new Set<string>();

    reconcilePluginRegistrations({
      type: 'PLUGINS_UPDATED',
      payload: {
        plugins: [{ id: 'runtime.plugin', packageName: '@acme/plugin', enabled: false }],
      },
    }, host, resetPluginAssets, knownPluginIds);

    expect(host.removePlugin).toHaveBeenCalledWith('runtime.plugin');
    expect(resetPluginAssets).toHaveBeenCalledWith('runtime.plugin');
  });

  it('removes only the disabled descriptor when one package provides multiple plugins', () => {
    const host = pluginHost();
    const resetPluginAssets = vi.fn();
    const knownPluginIds = new Set<string>();

    reconcilePluginRegistrations({
      type: 'PLUGINS_UPDATED',
      payload: {
        plugins: [
          { id: 'acme.alpha', packageName: '@acme/plugin', enabled: true },
          { id: 'acme.beta', packageName: '@acme/plugin', enabled: true },
        ],
      },
    }, host, resetPluginAssets, knownPluginIds);
    reconcilePluginRegistrations({
      type: 'PLUGINS_UPDATED',
      payload: {
        plugins: [
          { id: 'acme.alpha', packageName: '@acme/plugin', enabled: false },
          { id: 'acme.beta', packageName: '@acme/plugin', enabled: true },
        ],
      },
    }, host, resetPluginAssets, knownPluginIds);

    expect(host.removePlugin).toHaveBeenCalledWith('acme.alpha');
    expect(host.removePlugin).not.toHaveBeenCalledWith('acme.beta');
    expect(resetPluginAssets).toHaveBeenCalledWith('acme.alpha');
    expect(resetPluginAssets).not.toHaveBeenCalledWith('acme.beta');
  });

  it('removes a runtime when its descriptor disappears from the next status snapshot', () => {
    const host = pluginHost();
    const resetPluginAssets = vi.fn();
    const knownPluginIds = new Set<string>();

    reconcilePluginRegistrations({
      type: 'PLUGINS_UPDATED',
      payload: {
        plugins: [{ id: 'acme.removed', enabled: true, status: 'active' }],
      },
    }, host, resetPluginAssets, knownPluginIds);
    reconcilePluginRegistrations({
      type: 'PLUGINS_UPDATED',
      payload: { plugins: [] },
    }, host, resetPluginAssets, knownPluginIds);

    expect(host.removePlugin).toHaveBeenCalledWith('acme.removed');
    expect(resetPluginAssets).toHaveBeenCalledWith('acme.removed');
  });
});
