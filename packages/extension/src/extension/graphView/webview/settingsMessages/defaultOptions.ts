import {
  readCodeGraphyCorePluginDescriptorData,
  readCodeGraphyInstalledPluginCache,
  type CodeGraphyInstalledPluginRecord,
  type CodeGraphyUserStateOptions,
} from '@codegraphy-dev/core';
import type { IPluginUpdateImpactPolicy } from '@codegraphy-dev/plugin-api';
import { readWorkspacePluginPackageRecords } from '../../../pipeline/plugins/bootstrap/bundledPackages';

const NON_CORE_PLUGIN_UPDATE_IMPACT = {
  toggle: 'projection-only',
  defaultSetting: 'settings-only',
} satisfies IPluginUpdateImpactPolicy;

export interface InstalledPluginMetadataOptions extends CodeGraphyUserStateOptions {
  bundledPackageRoots?: Iterable<string>;
}

function readInstalledPluginRecord(
  pluginId: string,
  options: InstalledPluginMetadataOptions,
): CodeGraphyInstalledPluginRecord | undefined {
  const bundledRecord = readWorkspacePluginPackageRecords(options.bundledPackageRoots ?? [])
    .find(plugin => plugin.id === pluginId);
  return bundledRecord ?? readCodeGraphyInstalledPluginCache(options).plugins.find(plugin => (
    plugin.id === pluginId
  ));
}

export function readInstalledPluginDefaultOptions(
  pluginId: string,
  options: InstalledPluginMetadataOptions = {},
): Record<string, unknown> | undefined {
  const record = readInstalledPluginRecord(pluginId, options);
  return record
    ? readCodeGraphyCorePluginDescriptorData(record)?.defaultOptions
    : undefined;
}

export function readInstalledPluginUpdateImpact(
  pluginId: string,
  options: InstalledPluginMetadataOptions = {},
): IPluginUpdateImpactPolicy | undefined {
  const record = readInstalledPluginRecord(pluginId, options);
  if (!record) return undefined;
  if (record.host !== 'core') return NON_CORE_PLUGIN_UPDATE_IMPACT;
  return readCodeGraphyCorePluginDescriptorData(record)?.updateImpact;
}
