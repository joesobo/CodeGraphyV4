import {
  readCodeGraphyCorePluginDescriptorData,
  readCodeGraphyInstalledPluginCache,
  type CodeGraphyInstalledPluginRecord,
  type CodeGraphyUserStateOptions,
} from '@codegraphy-dev/core';
import type { IPluginUpdateImpactPolicy } from '@codegraphy-dev/plugin-api';

const NON_CORE_PLUGIN_UPDATE_IMPACT = {
  toggle: 'projection-only',
  defaultSetting: 'settings-only',
} satisfies IPluginUpdateImpactPolicy;

function readInstalledPluginRecord(
  pluginId: string,
  options: CodeGraphyUserStateOptions,
): CodeGraphyInstalledPluginRecord | undefined {
  return readCodeGraphyInstalledPluginCache(options).plugins.find(plugin => (
    plugin.id === pluginId
  ));
}

export function readInstalledPluginDefaultOptions(
  pluginId: string,
  options: CodeGraphyUserStateOptions = {},
): Record<string, unknown> | undefined {
  const record = readInstalledPluginRecord(pluginId, options);
  return record
    ? readCodeGraphyCorePluginDescriptorData(record)?.defaultOptions
    : undefined;
}

export function readInstalledPluginUpdateImpact(
  pluginId: string,
  options: CodeGraphyUserStateOptions = {},
): IPluginUpdateImpactPolicy | undefined {
  const record = readInstalledPluginRecord(pluginId, options);
  if (!record) return undefined;
  if (record.host !== 'core') return NON_CORE_PLUGIN_UPDATE_IMPACT;
  return readCodeGraphyCorePluginDescriptorData(record)?.updateImpact;
}
