import type { WebviewPluginHost } from '../../../../pluginHost/manager';
import type { ResetPluginAssets } from '../../messageListener';

export function removePluginRuntime(
  pluginId: string,
  pluginHost: WebviewPluginHost,
  resetPluginAssets?: ResetPluginAssets,
): void {
  pluginHost.removePlugin(pluginId);
  resetPluginAssets?.(pluginId);
}
