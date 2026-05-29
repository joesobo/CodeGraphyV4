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

export function removePackageRuntimePlugin(
  packageName: string | undefined,
  disabledPluginId: string,
  pluginHost: WebviewPluginHost,
  packagePluginIdsByPackageName: Map<string, string>,
  resetPluginAssets?: ResetPluginAssets,
): void {
  if (!packageName) {
    return;
  }

  const runtimePluginId = packagePluginIdsByPackageName.get(packageName);
  if (runtimePluginId && runtimePluginId !== disabledPluginId) {
    removePluginRuntime(runtimePluginId, pluginHost, resetPluginAssets);
  }
  packagePluginIdsByPackageName.delete(packageName);
}
