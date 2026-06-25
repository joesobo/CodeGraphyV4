import {
  readCodeGraphyInstalledPluginCache,
  type CodeGraphyUserStateOptions,
} from '@codegraphy-dev/core';
import type { IPluginUpdateImpactPolicy } from '@codegraphy-dev/plugin-api';

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

export function readInstalledPluginUpdateImpact(
  pluginId: string,
  options: CodeGraphyUserStateOptions = {},
): IPluginUpdateImpactPolicy | undefined {
  const updateImpact = readCodeGraphyInstalledPluginCache(options)
    .plugins
    .find(plugin => (plugin.pluginId ?? plugin.package) === pluginId)
    ?.updateImpact;

  return updateImpact
    ? {
        ...updateImpact,
        ...(updateImpact.settings ? { settings: { ...updateImpact.settings } } : {}),
      }
    : undefined;
}
