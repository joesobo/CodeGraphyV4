import { describe, expect, it, vi } from 'vitest';
import { removePluginRuntime } from '../../../../../../src/webview/app/shell/messageListener/pluginRegistrations/runtime';
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
});
