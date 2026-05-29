import { describe, expect, it, vi } from 'vitest';
import {
  removePackageRuntimePlugin,
  removePluginRuntime,
} from '../../../../../../src/webview/app/shell/messageListener/pluginRegistrations/runtime';
import type { WebviewPluginHost } from '../../../../../../src/webview/pluginHost/manager';

function pluginHost(): WebviewPluginHost {
  return {
    removePlugin: vi.fn(),
  } as unknown as WebviewPluginHost;
}

describe('app/shell/messageListener/pluginRegistrations/runtime', () => {
  it('removes a plugin runtime and its injected assets', () => {
    const host = pluginHost();
    const resetPluginAssets = vi.fn();

    removePluginRuntime('runtime.plugin', host, resetPluginAssets);

    expect(host.removePlugin).toHaveBeenCalledWith('runtime.plugin');
    expect(resetPluginAssets).toHaveBeenCalledWith('runtime.plugin');
  });

  it('does nothing when no package name is available', () => {
    const host = pluginHost();
    const packageIds = new Map([
      ['@acme/plugin', 'runtime.plugin'],
      [undefined as unknown as string, 'should-not-be-read'],
    ]);

    removePackageRuntimePlugin(undefined, 'disabled.plugin', host, packageIds);

    expect(host.removePlugin).not.toHaveBeenCalled();
    expect(packageIds.has('@acme/plugin')).toBe(true);
    expect(packageIds.has(undefined as unknown as string)).toBe(true);
  });

  it('deletes package mappings without re-removing the disabled plugin id', () => {
    const host = pluginHost();
    const packageIds = new Map([['@acme/plugin', 'runtime.plugin']]);

    removePackageRuntimePlugin('@acme/plugin', 'runtime.plugin', host, packageIds);

    expect(host.removePlugin).not.toHaveBeenCalled();
    expect(packageIds.has('@acme/plugin')).toBe(false);
  });

  it('removes a distinct runtime plugin id for a disabled package entry', () => {
    const host = pluginHost();
    const resetPluginAssets = vi.fn();
    const packageIds = new Map([['@acme/plugin', 'runtime.plugin']]);

    removePackageRuntimePlugin('@acme/plugin', '@acme/plugin', host, packageIds, resetPluginAssets);

    expect(host.removePlugin).toHaveBeenCalledWith('runtime.plugin');
    expect(resetPluginAssets).toHaveBeenCalledWith('runtime.plugin');
    expect(packageIds.has('@acme/plugin')).toBe(false);
  });
});
