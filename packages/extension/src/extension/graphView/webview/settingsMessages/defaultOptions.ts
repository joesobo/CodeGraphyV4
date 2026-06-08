import {
  readCodeGraphyInstalledPluginCache,
  type CodeGraphyUserStateOptions,
} from '@codegraphy-dev/core';

export function readInstalledPluginDefaultOptions(
  pluginId: string,
  options: CodeGraphyUserStateOptions = {},
): Record<string, unknown> | undefined {
  const defaultOptions = readCodeGraphyInstalledPluginCache(options)
    .plugins
    .find(plugin => (plugin.pluginId ?? plugin.package) === pluginId)
    ?.defaultOptions;

  return defaultOptions ? { ...defaultOptions } : undefined;
}
